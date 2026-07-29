type StatusBadgeProps = {
  value?: string | boolean | null;
};

export function StatusBadge({ value }: StatusBadgeProps) {
  const label = typeof value === "boolean" ? (value ? "pass" : "fail") : value || "unknown";
  const normalized = String(label).toLowerCase();
  const tone = normalized.includes("pass") || normalized.includes("answer") || normalized.includes("ok")
    ? "good"
    : normalized.includes("error") || normalized.includes("fail") || normalized.includes("wrong")
      ? "bad"
      : "neutral";

  return <span className={`status-badge ${tone}`}>{label}</span>;
}
