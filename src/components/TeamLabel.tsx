import type { Team } from "@/lib/db/types";

export function TeamLabel({
  team,
  placeholder,
  size = "md",
  className = "",
}: {
  team?: Team | null;
  placeholder?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const flagClass =
    size === "sm" ? "text-base" : size === "lg" ? "text-3xl" : "text-xl";
  const textClass =
    size === "sm" ? "text-sm" : size === "lg" ? "text-lg font-semibold" : "text-base font-medium";

  if (!team) {
    return (
      <span className={`inline-flex items-center gap-2 text-zinc-500 italic ${textClass} ${className}`}>
        <span className={flagClass}>·</span>
        {placeholder ?? "Por definir"}
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-2 ${textClass} ${className}`}>
      <span className={flagClass} aria-hidden>
        {team.flag_emoji ?? "🏳️"}
      </span>
      <span>{team.name}</span>
    </span>
  );
}
