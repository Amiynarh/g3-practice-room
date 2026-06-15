import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { SCENARIOS } from "@/lib/scenarios";

export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const { scenarioId, language = "en", userProfile = null, sessionBrief = null } = await request.json();

    if (!SCENARIOS[scenarioId]) {
      return NextResponse.json({ error: "Invalid scenario." }, { status: 400 });
    }

    // Ensure profile exists — auto-create if not found (handles OAuth sign-in edge cases)
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("id", token.sub)
      .single();

    if (!profile) {
      const { error: createErr } = await supabaseAdmin.from("profiles").insert({
        id: token.sub,
        email: token.email,
        name: token.name,
        avatar_url: (token as any).picture ?? null,
      });

      if (createErr) {
        console.error("[Sessions] Auto-create profile failed:", createErr);
        return NextResponse.json({ error: "Could not set up your profile. Please try again." }, { status: 500 });
      }
    }

    // Create the session
    const { data: session, error } = await supabaseAdmin
      .from("practice_sessions")
      .insert({
        user_id: token.sub,
        scenario_id: scenarioId,
        language,
        ...(userProfile && { user_profile: userProfile }),
        ...(sessionBrief && { session_brief: sessionBrief }),
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ sessionId: session.id }, { status: 201 });
  } catch (error) {
    console.error("[Sessions] Create error:", error);
    return NextResponse.json({ error: "Could not create session." }, { status: 500 });
  }
}
