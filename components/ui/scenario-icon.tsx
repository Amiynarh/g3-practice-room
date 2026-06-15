import {
  Briefcase,
  TrendingUp,
  Target,
  Award,
  Users,
  MessageCircle,
  type LucideProps,
} from "lucide-react";

const ICON_MAP: Record<string, React.ComponentType<LucideProps>> = {
  Briefcase,
  TrendingUp,
  Target,
  Award,
  Users,
  MessageCircle,
};

interface Props extends LucideProps {
  name: string;
}

export function ScenarioIcon({ name, ...props }: Props) {
  const Icon = ICON_MAP[name] ?? Briefcase;
  return <Icon {...props} />;
}
