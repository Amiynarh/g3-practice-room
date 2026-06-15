import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const { sessionId } = await params;

    const [sessionRes, messagesRes] = await Promise.all([
      supabaseAdmin
        .from("practice_sessions")
        .select("id, scenario_id, language, status, message_count, started_at")
        .eq("id", sessionId)
        .eq("user_id", token.sub!)
        .single(),
      supabaseAdmin
        .from("session_messages")
        .select("id, role, content, created_at")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true }),
    ]);

    if (!sessionRes.data) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 });
    }

    return NextResponse.json({
      session: sessionRes.data,
      messages: messagesRes.data ?? [],
    });
  } catch (error) {
    console.error("[Session] Unhandled error:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
