import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { SCENARIOS } from "@/lib/scenarios";
import { ScenarioGrid } from "@/components/practice/scenario-grid";

export default async function PracticePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Choose a scenario</h1>
        <p className="text-muted-foreground mt-1">
          Pick a real-life situation to practice. Aunty Ada will play the other person — be yourself.
        </p>
      </div>

      <ScenarioGrid scenarios={Object.values(SCENARIOS)} />
    </div>
  );
}
