import { Activity, Bot, Database, GitBranch, MessageSquareText } from "lucide-react";
import type { ReactNode } from "react";

type AppShellProps = {
  children: ReactNode;
  selectedView: string;
  onViewChange: (view: string) => void;
  health: "online" | "offline";
};

const views = [
  { id: "playground", label: "Playground", icon: MessageSquareText },
  { id: "runs", label: "Runs", icon: Database },
  { id: "versions", label: "Versions", icon: GitBranch }
];

export function AppShell({ children, selectedView, onViewChange, health }: AppShellProps) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <Bot size={22} />
          </div>
          <div>
            <h1>Research Agent</h1>
            <p>Tool eval dashboard</p>
          </div>
        </div>

        <nav className="nav-list" aria-label="Dashboard sections">
          {views.map((view) => {
            const Icon = view.icon;
            return (
              <button
                key={view.id}
                className={selectedView === view.id ? "nav-item active" : "nav-item"}
                onClick={() => onViewChange(view.id)}
                type="button"
              >
                <Icon size={18} />
                <span>{view.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className={`health ${health}`}>
            <Activity size={16} />
            <span>API {health}</span>
          </div>
        </div>
      </aside>
      <main className="main-surface">{children}</main>
    </div>
  );
}
