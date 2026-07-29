import type { VersionLogRow } from "../types/agent";

type VersionSelectorProps = {
  rows: VersionLogRow[];
  value: string;
  onChange: (version: string) => void;
};

export function VersionSelector({ rows, value, onChange }: VersionSelectorProps) {
  const versions = Array.from(new Set(rows.map((row) => row.version).filter(Boolean))) as string[];
  const options = versions.length > 0 ? versions : [value || "v3.1"];

  return (
    <div className="version-selector" aria-label="Version selector">
      {options.map((version) => (
        <button
          className={value === version ? "segment active" : "segment"}
          key={version}
          type="button"
          onClick={() => onChange(version)}
        >
          {version}
        </button>
      ))}
    </div>
  );
}
