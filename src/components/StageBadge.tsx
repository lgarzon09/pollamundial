import { STAGE_SHORT, type MatchStage } from "@/lib/db/types";

const COLORS: Record<MatchStage, string> = {
  group: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  r32: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  r16: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
  qf: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  sf: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-950 dark:text-fuchsia-300",
  third_place: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  final: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
};

export function StageBadge({
  stage,
  groupCode,
}: {
  stage: MatchStage;
  groupCode?: string | null;
}) {
  const label = stage === "group" && groupCode ? `Grupo ${groupCode}` : STAGE_SHORT[stage];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${COLORS[stage]}`}
    >
      {label}
    </span>
  );
}
