import { Suspense } from "react";
import { PracticeRoom } from "@/components/practice/practice-room";
import { SCENARIOS } from "@/lib/scenarios";
import { Loader2 } from "lucide-react";

interface Props {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ scenario?: string; lang?: string }>;
}

export default async function PracticeSessionPage({ params, searchParams }: Props) {
  const { sessionId } = await params;
  const { scenario: scenarioId = "tech_interview", lang: language = "en" } = await searchParams;

  const scenario = SCENARIOS[scenarioId];
  if (!scenario) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">Scenario not found.</p>
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      }
    >
      <PracticeRoom
        sessionId={sessionId}
        scenario={scenario}
        language={language}
      />
    </Suspense>
  );
}
