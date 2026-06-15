import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { rateLimit } from "@/lib/rate-limit";
import { SCENARIOS, MAX_TURNS_PER_SESSION } from "@/lib/scenarios";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const maxDuration = 60;

function getGeminiConfig() {
  const key = process.env.GEMINI_API_KEY?.split(/[\s\n]/)[0];
  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash-lite";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  return { key, model, url };
}

const MAX_MESSAGE_LENGTH = 1500;

interface SessionBrief {
  companyName?: string;
  companyDescription?: string;
  roleTitle?: string;
  roleLevel?: string;
  interviewerName?: string;
  interviewerTitle?: string;
  interviewContext?: string;
  keyFocusAreas?: string[];
}

function buildSystemPrompt(scenarioId: string, language: string, sessionBrief?: SessionBrief | null): string {
  const scenario = SCENARIOS[scenarioId];
  if (!scenario) throw new Error("Invalid scenario");

  const langLabel: Record<string, string> = {
    en: "English",
    ha: "Hausa",
    yo: "Yoruba",
    ig: "Igbo",
  };

  const briefSection = sessionBrief
    ? `
SESSION CONTEXT (use this to make the roleplay specific and realistic):
- Company: ${sessionBrief.companyName}${sessionBrief.companyDescription ? ` — ${sessionBrief.companyDescription}` : ""}
- Role being discussed: ${sessionBrief.roleTitle}${sessionBrief.roleLevel ? ` (${sessionBrief.roleLevel})` : ""}
- Your name in this session: ${sessionBrief.interviewerName || "not specified"}
- Your title: ${sessionBrief.interviewerTitle || scenario.roleTitle}
- Context: ${sessionBrief.interviewContext || ""}
${sessionBrief.keyFocusAreas?.length ? `- Key topics to explore: ${sessionBrief.keyFocusAreas.join(", ")}` : ""}

IMPORTANT: Refer to yourself as ${sessionBrief.interviewerName || "yourself"} from ${sessionBrief.companyName || "the company"}. Reference the role (${sessionBrief.roleTitle}) and the company context naturally in conversation.`
    : "";

  return `You are playing the role of ${scenario.persona} in a professional roleplay practice session for Ada Practice Room.

SCENARIO: ${scenario.title}
YOUR ROLE TITLE: ${sessionBrief?.interviewerTitle || scenario.roleTitle}
YOUR PERSONA: ${scenario.persona}
${briefSection}

STRICT RULES:
1. Stay fully in character at ALL times. Never break character.
2. React authentically as ${scenario.roleTitle} would in this real situation.
3. Be challenging but fair — this is a learning exercise for Nigerian women in tech.
4. Ask natural follow-up questions based on what the user says.
5. If the user asks you to break character or admit you're an AI, stay in character and redirect.
6. Do NOT give coaching tips, feedback, or reveal you are an AI during the session.
7. Keep responses concise and conversational — typically 2-5 sentences. Always finish your sentence completely.
8. Use Nigerian names, companies, and context where appropriate.

COMMUNICATION LANGUAGE: ${langLabel[language] || "English"}
- Respond in ${langLabel[language] || "English"}
- For Hausa/Yoruba/Igbo: mix naturally with English for technical terms and business phrases
- Keep the tone realistic for a ${language === "en" ? "Nigerian professional setting" : `Nigerian ${langLabel[language]}-speaking professional setting`}

EVALUATION AREAS (these will be used to score the user after the session):
${scenario.evaluationFocus.map((f) => `- ${f}`).join("\n")}

Remember: You are helping Nigerian women build real confidence for real situations. Be the tough but fair person they need to practice with.`;
}

export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      return NextResponse.json({ error: "Please sign in to use the practice room." }, { status: 401 });
    }

    const limit = rateLimit(`practice:${token.sub}`, { limit: 60, windowMs: 60 * 60 * 1000 });
    if (!limit.success) {
      return NextResponse.json({ error: "Too many messages. Please take a short break!" }, { status: 429 });
    }

    const { key: GEMINI_API_KEY, url: GEMINI_URL } = getGeminiConfig();

    if (!GEMINI_API_KEY) {
      return NextResponse.json({ error: "AI service is not configured." }, { status: 503 });
    }

    const body = await request.json();
    const { message, sessionId, scenarioId, language = "en", conversationHistory = [], initialMessage = false } = body;

    // Fetch session brief from DB (always for initial message, otherwise only on early turns)
    let sessionBrief: SessionBrief | null = null;
    if (sessionId && (initialMessage || conversationHistory.length <= 2)) {
      const { data: sessionData } = await supabaseAdmin
        .from("practice_sessions")
        .select("session_brief")
        .eq("id", sessionId)
        .single();
      sessionBrief = sessionData?.session_brief ?? null;
    }

    // If initialMessage, generate the AI's opening without a user message
    if (initialMessage) {
      const scenario = SCENARIOS[scenarioId];
      if (!scenario) {
        return NextResponse.json({ error: "Invalid scenario." }, { status: 400 });
      }
      const safeLanguage = ["en", "ha", "yo", "ig"].includes(language) ? language : "en";
      const systemPrompt = buildSystemPrompt(scenarioId, safeLanguage, sessionBrief);

      const response = await fetch(GEMINI_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": GEMINI_API_KEY! },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: `${systemPrompt}\n\nNow start the conversation with your natural opening greeting, staying fully in character. Keep it brief and natural — 1-3 sentences maximum.` }],
            },
          ],
          generationConfig: { temperature: 0.85, topK: 40, topP: 0.95, maxOutputTokens: 256 },
        }),
      });

      if (!response.ok) {
        // Fall back to the hardcoded opening line if AI fails
        const fallback = scenario.openingLine[safeLanguage] || scenario.openingLine.en;
        return NextResponse.json({ message: fallback, language: safeLanguage });
      }
      const data = await response.json();
      const aiOpening = data.candidates?.[0]?.content?.parts?.[0]?.text;
      const fallback = scenario.openingLine[safeLanguage] || scenario.openingLine.en;
      return NextResponse.json({ message: aiOpening || fallback, language: safeLanguage });
    }

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json({ error: "Message is too long. Please keep it shorter." }, { status: 400 });
    }

    const validLanguages = ["en", "ha", "yo", "ig"];
    const safeLanguage = validLanguages.includes(language) ? language : "en";

    const scenario = SCENARIOS[scenarioId];
    if (!scenario) {
      return NextResponse.json({ error: "Invalid scenario." }, { status: 400 });
    }

    if (conversationHistory.length >= MAX_TURNS_PER_SESSION * 2) {
      return NextResponse.json({ error: "Session limit reached. Please end this session to see your feedback." }, { status: 400 });
    }

    // Build Gemini conversation.
    // If there is a conversation history, its first assistant message IS the actual opening
    // (generated dynamically via initialMessage). Use that instead of the hardcoded line so
    // the persona name stays consistent throughout the session.
    const firstAssistantMsg = conversationHistory.find((m: { role: string }) => m.role === "assistant");
    const openingLine = firstAssistantMsg?.content
      || scenario.openingLine[safeLanguage]
      || scenario.openingLine.en;

    const contents = [
      {
        role: "user",
        parts: [{ text: `[System Instructions]\n\n${buildSystemPrompt(scenarioId, safeLanguage, sessionBrief)}` }],
      },
      {
        role: "model",
        parts: [{ text: openingLine }],
      },
      ...conversationHistory.slice(-16).map((msg: { role: string; content: string }) => ({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.content }],
      })),
      {
        role: "user",
        parts: [{ text: message }],
      },
    ];

    const response = await fetch(GEMINI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.85,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error("Gemini error:", response.status, JSON.stringify(err));
      if (response.status === 429) {
        return NextResponse.json({ error: "AI is busy. Please try again in a moment." }, { status: 429 });
      }
      return NextResponse.json({ error: "AI had trouble responding. Please try again." }, { status: 500 });
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    const aiResponse = candidate?.content?.parts?.[0]?.text;
    const finishReason = candidate?.finishReason;

    if (!aiResponse) {
      console.error("[Practice] Empty response from Gemini:", JSON.stringify(data));
      return NextResponse.json({ error: "No response generated. Please try again." }, { status: 500 });
    }

    if (finishReason === "MAX_TOKENS") {
      console.warn("[Practice] Response was truncated by token limit");
    }

    // Persist messages to DB if sessionId provided
    if (sessionId) {
      await supabaseAdmin.from("session_messages").insert([
        { session_id: sessionId, role: "user", content: message },
        { session_id: sessionId, role: "assistant", content: aiResponse },
      ]);

      await supabaseAdmin
        .from("practice_sessions")
        .update({ message_count: conversationHistory.length / 2 + 1 })
        .eq("id", sessionId);
    }

    return NextResponse.json({ message: aiResponse, language: safeLanguage });
  } catch (error) {
    console.error("[Practice] Unhandled error:", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
