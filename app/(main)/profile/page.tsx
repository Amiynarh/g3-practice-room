import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Mail, Calendar, BookOpen, MessageSquare } from "lucide-react";

async function getProfileData(userId: string) {
  const [profileResult, sessionsResult] = await Promise.all([
    supabaseAdmin
      .from("profiles")
      .select("name, email, avatar_url, created_at, sessions_this_month")
      .eq("id", userId)
      .single(),
    supabaseAdmin
      .from("practice_sessions")
      .select("id, status, message_count")
      .eq("user_id", userId),
  ]);

  return {
    profile: profileResult.data,
    sessions: sessionsResult.data || [],
  };
}

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const { profile, sessions } = await getProfileData(session.user.id);

  // Fall back to session data if Supabase is unavailable
  const displayName = profile?.name || session.user?.name || "—";
  const displayEmail = profile?.email || session.user?.email || "—";
  const displayAvatar = profile?.avatar_url || session.user?.image || "";
  const createdAt = profile?.created_at;

  const completedSessions = sessions.filter((s) => s.status === "completed");
  const totalExchanges = sessions.reduce((sum, s) => sum + (s.message_count || 0), 0);

  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "U";

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="text-muted-foreground mt-1">Your account details and practice stats.</p>
      </div>

      {/* Identity card */}
      <Card className="bg-white">
        <CardContent className="pt-6">
          <div className="flex items-center gap-5">
            <Avatar className="w-16 h-16 ring-2 ring-primary/20">
              <AvatarImage src={displayAvatar} />
              <AvatarFallback className="bg-primary/10 text-primary text-lg font-bold">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-semibold">{displayName}</h2>
              <p className="text-muted-foreground text-sm mt-0.5">{displayEmail}</p>
              {createdAt && (
                <p className="text-xs text-muted-foreground mt-1">
                  Member since {new Date(createdAt).toLocaleDateString("en-NG", { month: "long", year: "numeric" })}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Practice stats */}
      {sessions.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-white">
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xl font-bold">{completedSessions.length}</p>
                  <p className="text-xs text-muted-foreground">Sessions completed</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white">
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-secondary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="w-4 h-4 text-secondary" />
                </div>
                <div>
                  <p className="text-xl font-bold">{totalExchanges}</p>
                  <p className="text-xs text-muted-foreground">Total exchanges</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Account details */}
      <Card className="bg-white">
        <CardHeader><CardTitle className="text-base">Account Details</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Full Name</p>
              <p className="text-sm font-medium">{displayName}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
              <Mail className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="text-sm font-medium">{displayEmail}</p>
            </div>
          </div>
          {createdAt && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                <Calendar className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Member since</p>
                <p className="text-sm font-medium">
                  {new Date(createdAt).toLocaleDateString("en-NG", {
                    day: "numeric", month: "long", year: "numeric",
                  })}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
