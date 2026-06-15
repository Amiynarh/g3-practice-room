import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { SCENARIOS } from "@/lib/scenarios";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const maxDuration = 60;

function getGeminiConfig() {
  const key = process.env.GEMINI_API_KEY?.split(/[\s\n]/)[0];
  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash-lite";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  return { key, url };
}

function buildFeedbackPrompt(
  scenarioId: string,
  transcript: Array<{ role: string; content: string }>
): string {
  const scenario = SCENARIOS[scenarioId];
  const conversationText = transcript
    .map((m) => `${m.role === "user" ? "LEARNER" : scenario?.roleTitle?.toUpperCase() || "AI"}: ${m.content}`)
    .join("\n\n");

  return `You are Aunty Ada, a warm, encouraging, and honest career coach for Nigerian women in tech.

You just watched a practice roleplay session for the scenario: "${scenario?.title || scenarioId}".

The learner was practicing: ${scenario?.evaluationFocus?.join(", ") || "professional communication"}

Here is the full transcript:
---
${conversationText}
---

Please analyze this session and provide feedback. Respond ONLY with a valid JSON object in this exact structure:
{
  "overall_score": <integer 1-100>,
  "confidence_score": <integer 1-100>,
  "clarity_score": <integer 1-100>,
  "relevance_score": <integer 1-100>,
  "summary": "<2-3 warm, honest sentences about how they did overall>",
  "strengths": ["<specific strength observed in the conversation>", "<another strength>"],
  "areas_for_improvement": ["<specific area with actionable suggestion>", "<another area>"],
  "key_moments": ["<quote or describe a notable moment from the conversation>"],
  "tips": ["<specific actionable tip for next time>", "<another tip>", "<one more tip>"]
}

Scoring guide:
- 80-100: Excellent performance, ready for real situations
- 60-79: Good effort, a few things to polish
- 40-59: Getting there, keep practicing
- Below 40: Needs more practice but shows potential

Be encouraging but honest. Reference specific things they said. Nigerian women need real, actionable feedback — not empty praise.
If the conversation was very short (fewer than 4 exchanges), note this in the summary and give a moderate score.`;
}

export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const { key: GEMINI_API_KEY, url: GEMINI_URL } = getGeminiConfig();

    if (!GEMINI_API_KEY) {
      return NextResponse.json({ error: "AI service not configured." }, { status: 503 });
    }

    const { sessionId, scenarioId, transcript } = await request.json();

    if (!sessionId || !scenarioId || !Array.isArray(transcript)) {
      return NextResponse.json({ error: "sessionId, scenarioId, and transcript are required." }, { status: 400 });
    }

    if (transcript.length < 2) {
      return NextResponse.json({ error: "Session too short to generate feedback." }, { status: 400 });
    }

    // Check session belongs to this user
    const { data: session } = await supabaseAdmin
      .from("practice_sessions")
      .select("user_id")
      .eq("id", sessionId)
      .single();

    if (!session || session.user_id !== token.sub) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 });
    }

    const response = await fetch(GEMINI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: buildFeedbackPrompt(scenarioId, transcript) }],
          },
        ],
        generationConfig: {
          temperature: 0.4,
          topK: 40,
          topP: 0.9,
          maxOutputTokens: 2048,
        },
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error("[Feedback] Gemini error:", response.status, JSON.stringify(err));
      return NextResponse.json({ error: "Could not generate feedback. Please try again." }, { status: 500 });
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      console.error("[Feedback] Empty text from Gemini. Full response:", JSON.stringify(data));
      return NextResponse.json({ error: "No feedback generated." }, { status: 500 });
    }

    // Extract JSON from the response (Gemini sometimes wraps in markdown code blocks).
    // Use a non-greedy match that stops at the first complete JSON object.
    let feedback: any = null;
    try {
      // Strip markdown code fences if present
      const stripped = rawText.replace(/```(?:json)?\s*/gi, "").replace(/```\s*/g, "");
      const jsonMatch = stripped.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON object found");
      feedback = JSON.parse(jsonMatch[0]);
    } catch (parseErr) {
      console.error("[Feedback] JSON parse failed. rawText length:", rawText.length, "| first 500 chars:", rawText.slice(0, 500));
      return NextResponse.json({ error: "Could not parse feedback. Please try again." }, { status: 500 });
    }

    // Persist to DB
    const { data: report, error: insertError } = await supabaseAdmin
      .from("feedback_reports")
      .upsert({
        session_id: sessionId,
        user_id: token.sub,
        overall_score: feedback.overall_score,
        confidence_score: feedback.confidence_score,
        clarity_score: feedback.clarity_score,
        relevance_score: feedback.relevance_score,
        summary: feedback.summary,
        strengths: feedback.strengths,
        areas_for_improvement: feedback.areas_for_improvement,
        key_moments: feedback.key_moments,
        tips: feedback.tips,
      })
      .select()
      .single();

    if (insertError) {
      console.error("DB insert error:", insertError.message);
    }

    // Mark session as completed
    await supabaseAdmin
      .from("practice_sessions")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", sessionId);

    return NextResponse.json({ feedback: report || feedback });
  } catch (error) {
    console.error("[Feedback] Unhandled error:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
