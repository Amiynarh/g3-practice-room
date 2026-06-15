import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { SCENARIOS } from "@/lib/scenarios";

export const maxDuration = 60;

function getGeminiConfig() {
  const key = process.env.GEMINI_API_KEY?.split(/[\s\n]/)[0];
  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash-lite";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  return { key, url };
}

export type UserProfile = Record<string, string>;

export interface SessionBrief {
  companyName: string;
  companyDescription: string;
  roleTitle: string;
  roleLevel: string;
  interviewerName: string;
  interviewerTitle: string;
  interviewContext: string;
  keyFocusAreas: string[];
}

export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const { scenarioId, userProfile }: { scenarioId: string; userProfile: UserProfile } =
      await request.json();

    const scenario = SCENARIOS[scenarioId];
    if (!scenario) {
      return NextResponse.json({ error: "Invalid scenario." }, { status: 400 });
    }

    if (!userProfile || Object.values(userProfile).every((v) => !v?.trim())) {
      return NextResponse.json({ error: "User profile is required." }, { status: 400 });
    }

    const { key: GEMINI_API_KEY, url: GEMINI_URL } = getGeminiConfig();
    if (!GEMINI_API_KEY) {
      return NextResponse.json({ error: "AI service is not configured." }, { status: 503 });
    }

    // Format user profile fields into readable lines for the prompt
    const profileLines = Object.entries(userProfile)
      .filter(([, v]) => v?.trim())
      .map(([k, v]) => `- ${k.replace(/([A-Z])/g, " $1").toLowerCase()}: ${v}`)
      .join("\n");

    // Scenario-specific guidance for brief generation
    const scenarioGuidance: Record<string, string> = {
      tech_interview: `This is a JOB INTERVIEW. Generate a realistic HR manager or technical interviewer at the company. The "interviewContext" should describe why the role is open and what the company is looking for. The interviewer can be any reasonable level above the user.`,
      salary_negotiation: `This is a SALARY NEGOTIATION with the user's current manager. The "companyName" is where the user currently works. The "interviewerName" is their direct manager. The "interviewContext" should describe the performance review or raise conversation context. The "roleTitle" is the user's current or target role.`,
      client_pitch: `This is a CLIENT PITCH. The "interviewerName" is a business owner or decision-maker at a small-to-mid-size Nigerian company. The "interviewerTitle" should reflect a non-technical business owner (e.g. "Founder", "CEO", "Managing Director"). The "interviewContext" should describe how they heard about the user and what business problem they're trying to solve. Keep them skeptical but open.`,
      promotion_request: `This is a PROMOTION CONVERSATION with the user's current manager. The "companyName" is where the user works. The "interviewerName" is their direct manager. The "interviewContext" should describe the current review cycle and budget constraints. The "roleTitle" is the promotion they are seeking.`,
      networking: `This is a NETWORKING scenario — NOT a job interview. Generate a fellow tech professional the user might meet at a conference or event. CRITICAL: The contact's seniority should be roughly PEER-LEVEL — 1 to 3 years ahead of the user at most (e.g. if the user is a mid-level DevOps engineer, generate a Senior Engineer or Team Lead, NOT a Principal, VP, or Director). The "interviewerTitle" should reflect this (e.g. "Senior Software Engineer", "Platform Engineering Lead", "Tech Lead"). The "interviewContext" should describe a casual encounter at a Lagos tech event or conference. The "keyFocusAreas" should be conversation topics that would naturally come up between two tech peers at a networking event.`,
      difficult_conversation: `This is a DIFFICULT WORKPLACE CONVERSATION. The "interviewerName" is a colleague or peer (not someone much more senior). The "interviewContext" should describe the specific situation — what the colleague did, how it has been affecting the user, and what the user wants to resolve. Keep the context specific and realistic.`,
    };

    const guidance = scenarioGuidance[scenarioId] || `This is a professional practice session. Generate realistic context appropriate for the scenario type.`;

    const prompt = `Generate a realistic professional scenario context for a Nigerian practice session.

SCENARIO TYPE: ${scenario.title}
SCENARIO DESCRIPTION: ${scenario.description}
ROLE AUNTY ADA WILL PLAY: ${scenario.roleTitle}
USER CONTEXT:
${profileLines}

SCENARIO-SPECIFIC INSTRUCTIONS:
${guidance}

Generate a JSON object with these exact fields:
{
  "companyName": "realistic Nigerian or Nigeria-operating company name",
  "companyDescription": "2-sentence description of the company and what they do",
  "roleTitle": "specific role title matching the context described above",
  "roleLevel": "the seniority level (e.g. Senior, Lead, Manager)",
  "interviewerName": "a Nigerian full name for the person Aunty Ada will play",
  "interviewerTitle": "their title at the company",
  "interviewContext": "2-3 sentences setting the scene — why this meeting/encounter is happening and what it's about",
  "keyFocusAreas": ["3-4 specific topics or skills that will naturally come up in this session"]
}

General rules:
- Use real Nigerian tech companies (Paystack, Flutterwave, Kuda, Interswitch, Cowrywise, Stears, Moove, etc.) or create plausible fictional ones
- Make all names authentically Nigerian (e.g. Chioma Okafor, Amara Nwosu, Tunde Adeyemi, Fatima Bello, Oluwaseun Adesanya)
- The context should read like a real pre-session briefing
- Key focus areas should be specific and actionable, not generic

Respond with ONLY the JSON object. No markdown, no explanation, no code block.`;

    const response = await fetch(GEMINI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.9,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!response.ok) {
      console.error("[Brief] Gemini error:", response.status);
      return NextResponse.json({ error: "Could not generate brief. Please try again." }, { status: 500 });
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    const raw: string | undefined = candidate?.content?.parts?.[0]?.text;
    const finishReason: string = candidate?.finishReason ?? "UNKNOWN";

    if (!raw) {
      console.error("[Brief] Empty response. finishReason:", finishReason, "full:", JSON.stringify(data).slice(0, 400));
      return NextResponse.json({ error: "No brief generated. Please try again." }, { status: 500 });
    }

    if (finishReason === "MAX_TOKENS") {
      console.error("[Brief] Response truncated (MAX_TOKENS). Raw length:", raw.length);
      return NextResponse.json({ error: "Could not generate brief. Please try again." }, { status: 500 });
    }

    // 1. Strip markdown code fences (belt-and-suspenders even with responseMimeType=json)
    let cleaned = raw.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/i, "").trim();

    // 2. Extract just the JSON object (handles any stray preamble/postamble)
    const objStart = cleaned.indexOf("{");
    const objEnd   = cleaned.lastIndexOf("}");
    if (objStart === -1 || objEnd === -1) {
      console.error("[Brief] No JSON object in response:", cleaned.slice(0, 400));
      return NextResponse.json({ error: "Could not generate brief. Please try again." }, { status: 500 });
    }
    cleaned = cleaned.slice(objStart, objEnd + 1);

    // 3. Collapse literal newlines/tabs inside string values
    cleaned = cleaned.replace(/[\r\n\t]+/g, " ");

    let brief: SessionBrief;
    try {
      brief = JSON.parse(cleaned);
    } catch {
      console.error("[Brief] JSON parse failed:", cleaned.slice(0, 400));
      return NextResponse.json({ error: "Could not parse brief. Please try again." }, { status: 500 });
    }

    return NextResponse.json({ brief });
  } catch (error) {
    console.error("[Brief] Unhandled error:", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
