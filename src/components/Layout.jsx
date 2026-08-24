import { useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { PLATFORM_NAME, CORE_VERSION } from "@/lib/platform";
import { Cpu, LayoutDashboard, FolderKanban, Blocks, ScrollText, ShieldCheck, Menu, X, CircuitBoard } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/projects", label: "Projects", icon: FolderKanban },
  { to: "/core", label: "AI Core", icon: CircuitBoard },
  { to: "/modules", label: "Module Registry", icon: Blocks },
  { to: "/executions", label: "AI Executions", icon: Cpu },
  { to: "/audit", label: "Audit Trail", icon: ScrollText },
];

function SidebarContent({ pathname, onNavigate }) {
  const { user } = useAuth();
  return (
    <div className="flex flex-col h-full">
      <div className="p-5 border-b border-sidebar-border">
        <Link to="/" onClick={onNavigate} className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary text-primary-foreground grid place-items-center shadow-sm shrink-0">
            <Cpu className="h-5 w-5" />
          </div>
          <div className="leading-tight min-w-0">
            <div className="text-sm font-semibold font-heading truncate">{PLATFORM_NAME}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">AI Core v{CORE_VERSION}</div>
          </div>
        </Link>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {NAV.map((item) => {
          const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-2 text-xs text-muted-foreground min-w-0">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{user?.email || "—"}</span>
        </div>
      </div>
    </div>
  );
}

export default function Layout() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Mobile top bar */}
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 h-14 border-b border-border bg-sidebar">
        <button onClick={() => setOpen(true)} className="p-2 -ml-2 rounded-md hover:bg-sidebar-accent" aria-label="Ouvrir le menu">
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-primary text-primary-foreground grid place-items-center">
            <Cpu className="h-4 w-4" />
          </div>
          <span className="text-sm font-semibold font-heading">AI Core v{CORE_VERSION}</span>
        </div>
        <div className="w-9" />
      </header>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:fixed md:inset-y-0 md:left-0 md:w-64 md:flex-col border-r border-border bg-sidebar">
        <SidebarContent pathname={pathname} />
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85%] bg-sidebar border-r border-sidebar-border shadow-xl flex flex-col animate-in slide-in-from-left">
            <button onClick={() => setOpen(false)} className="absolute right-3 top-4 p-1.5 rounded-md hover:bg-sidebar-accent" aria-label="Fermer le menu">
              <X className="h-5 w-5" />
            </button>
            <SidebarContent pathname={pathname} onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      {/* Page content */}
      <main className="md:pl-64 min-w-0">
        <Outlet />
      </main>
    </div>
  );
}