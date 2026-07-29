import { Boxes } from "lucide-react";
import type { ToolDeclaration } from "../types/agent";

type ToolCatalogProps = {
  tools: ToolDeclaration[];
};

const coreTools = new Set(["clarify", "timeline", "social_search", "lookup", "fetch", "format"]);
const optionalTools = new Set(["send", "policy", "papers", "paper_text"]);

export function ToolCatalog({ tools }: ToolCatalogProps) {
  return (
    <section className="panel tool-catalog">
      <div className="panel-heading compact-heading">
        <div>
          <h2>Tool catalog</h2>
          <p>{tools.length} declared tool(s)</p>
        </div>
        <Boxes size={20} />
      </div>

      {tools.length === 0 ? (
        <div className="empty-state">No tool declarations found in artifacts/tools.yaml.</div>
      ) : (
        <div className="tool-grid">
          {tools.map((tool) => (
            <article className="tool-summary" key={tool.name}>
              <div className="tool-card-top">
                <strong>{tool.name}</strong>
                <span className={`tool-badge ${toolKind(tool.name)}`}>{toolKind(tool.name)}</span>
              </div>
              <p>{tool.description || "No description"}</p>
              <div className="tool-meta">
                <span>Required args</span>
                <code>{(tool.parameters?.required || []).join(", ") || "none"}</code>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function toolKind(name: string) {
  if (coreTools.has(name)) return "core";
  if (optionalTools.has(name)) return "optional";
  return "custom";
}
