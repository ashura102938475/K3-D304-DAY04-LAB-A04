import { Boxes } from "lucide-react";
import type { ToolDeclaration } from "../types/agent";

type ToolCatalogProps = {
  tools: ToolDeclaration[];
};

export function ToolCatalog({ tools }: ToolCatalogProps) {
  return (
    <section className="panel tool-catalog">
      <div className="panel-heading">
        <div>
          <h2>Tool catalog</h2>
          <p>{tools.length} declared tool(s)</p>
        </div>
        <Boxes size={20} />
      </div>

      <div className="tool-grid">
        {tools.map((tool) => (
          <article className="tool-summary" key={tool.name}>
            <strong>{tool.name}</strong>
            <p>{tool.description || "No description"}</p>
            <code>{(tool.parameters?.required || []).join(", ") || "no required args"}</code>
          </article>
        ))}
      </div>
    </section>
  );
}
