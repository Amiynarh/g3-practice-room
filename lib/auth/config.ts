import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),

    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const { data: profile } = await getSupabaseAdmin()
          .from("profiles")
          .select("id, email, name, avatar_url, password_hash")
          .eq("email", credentials.email.toLowerCase())
          .single();

        if (!profile?.password_hash) return null;

        const valid = await bcrypt.compare(credentials.password, profile.password_hash);
        if (!valid) return null;

        return {
          id: profile.id,
          email: profile.email,
          name: profile.name,
          image: profile.avatar_url,
        };
      },
    }),
  ],

  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        try {
          const admin = getSupabaseAdmin();
          const { data: existing } = await admin
            .from("profiles")
            .select("id")
            .eq("id", user.id)
            .single();

          if (!existing) {
            const { error } = await admin.from("profiles").insert({
              id: user.id,
              email: user.email,
              name: user.name,
              avatar_url: user.image,
            });
            if (error) {
              console.error("[Auth] Failed to create Google profile:", error);
            }
          }
        } catch (err) {
          console.error("[Auth] signIn callback error:", err);
        }
      }
      return true;
    },

    async jwt({ token }) {
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
      }
      return session;
    },
  },

  pages: {
    signIn: "/signin",
    error: "/signin",
  },
};
