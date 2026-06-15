import type { Metadata } from "next";
import { Bricolage_Grotesque } from "next/font/google";
import "./globals.css";
import { AuthSessionProvider } from "@/components/providers/session-provider";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-bricolage",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Aunty Ada Practice Room — Build Real Confidence for Real Situations",
  description:
    "AI-powered roleplay practice for Nigerian women in tech. Practice job interviews, salary negotiations, client pitches, and more — with instant feedback from Aunty Ada.",
  openGraph: {
    title: "Aunty Ada Practice Room by G3Women",
    description: "AI-powered career practice for Nigerian women in tech.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={bricolage.variable}>
      <body>
        <AuthSessionProvider>{children}</AuthSessionProvider>
      </body>
    </html>
  );
}
