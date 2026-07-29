import type { VersionLogRow } from "../types/agent";

type VersionSelectorProps = {
  rows: VersionLogRow[];
  value: string;
  onChange: (value: string) => void;
};

export function VersionSelector({ rows, value, onChange }: VersionSelectorProps) {
  const versions = Array.from(new Set(rows.map((row) => row.version).filter(Boolean))) as string[];

  return (
    <div className="version-selector" role="group" aria-label="Artifact version">
      {(versions.length ? versions : ["v3"]).map((version) => (
        <button
          key={version}
          className={value === version ? "segment active" : "segment"}
          onClick={() => onChange(version)}
          type="button"
        >
          {version}
        </button>
      ))}
    </div>
  );
}
