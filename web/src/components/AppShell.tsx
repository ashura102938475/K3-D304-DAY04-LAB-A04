import { Activity, Bot, FileClock, GitCompare, LayoutDashboard, Wrench } from "lucide-react";
import type { ReactNode } from "react";

type AppShellProps = {
  selectedView: string;
  onViewChange: (view: string) => void;
  health: "online" | "offline";
  children: ReactNode;
};

const navItems = [
  { id: "demo", label: "Demo", icon: Bot },
  { id: "runs", label: "Runs", icon: LayoutDashboard },
  { id: "versions", label: "Versions", icon: GitCompare },
  { id: "tools", label: "Tools", icon: Wrench },
  { id: "transcripts", label: "Transcripts", icon: FileClock }
];

export function AppShell({ selectedView, onViewChange, health, children }: AppShellProps) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <Activity size={22} />
          </div>
          <div>
            <h1>Research Agent</h1>
            <p>Tool-calling demo</p>
          </div>
        </div>

        <nav className="nav-list" aria-label="Main navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                className={selectedView === item.id ? "nav-item active" : "nav-item"}
                key={item.id}
                type="button"
                onClick={() => onViewChange(item.id)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <span className={`health ${health}`}>
            <Activity size={15} />
            <span>{health === "online" ? "API online" : "API offline"}</span>
          </span>
        </div>
      </aside>

      <main className="main-surface">{children}</main>
    </div>
  );
}
