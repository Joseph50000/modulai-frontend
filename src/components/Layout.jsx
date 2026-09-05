import { useEffect, useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { PLATFORM_NAME, CORE_VERSION } from "@/lib/platform";
import { Cpu, LayoutDashboard, FolderKanban, Blocks, ScrollText, ShieldCheck, Menu, X, CircuitBoard, PanelLeftClose, PanelLeftOpen, ChevronRight, Home, Bell } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/projects", label: "Projects", icon: FolderKanban },
  { to: "/core", label: "AI Core", icon: CircuitBoard },
  { to: "/modules", label: "Module Registry", icon: Blocks },
  { to: "/executions", label: "AI Executions", icon: Cpu },
  { to: "/audit", label: "Audit Trail", icon: ScrollText },
];

function SidebarContent({ pathname, onNavigate, collapsed, onToggle }) {
  const { user } = useAuth();
  return <div className="flex flex-col h-full">
    <div className={cn("border-b border-sidebar-border", collapsed ? "p-3" : "p-5")}>
      <div className={cn("flex items-center", collapsed ? "justify-center" : "justify-between gap-3")}>
        <Link to="/" onClick={onNavigate} className={cn("flex items-center gap-3 min-w-0", collapsed && "justify-center")} title={collapsed ? PLATFORM_NAME : undefined}>
          <div className="h-10 w-10 rounded-xl bg-primary text-primary-foreground grid place-items-center shadow-sm shrink-0"><Cpu className="h-5 w-5" /></div>
          {!collapsed && <div className="leading-tight min-w-0"><div className="text-sm font-semibold font-heading truncate">{PLATFORM_NAME}</div><div className="text-[11px] text-muted-foreground mt-0.5">AI Core v{CORE_VERSION}</div></div>}
        </Link>
        {!collapsed && <button onClick={onToggle} className="rounded-md p-1.5 text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground" aria-label="Réduire la sidebar"><PanelLeftClose className="h-4 w-4" /></button>}
      </div>
    </div>
    <nav className={cn("flex-1 space-y-1 overflow-y-auto", collapsed ? "p-2" : "p-3")}>
      {NAV.map((item) => { const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to); const Icon = item.icon; return <Link key={item.to} to={item.to} onClick={onNavigate} title={collapsed ? item.label : undefined} className={cn("flex items-center rounded-lg text-sm transition-colors", collapsed ? "justify-center px-2 py-3" : "gap-3 px-3 py-2.5", active ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground")}><Icon className="h-4 w-4 shrink-0" />{!collapsed && item.label}</Link>; })}
    </nav>
    <div className={cn("border-t border-sidebar-border", collapsed ? "p-3" : "p-4")}><div className={cn("flex items-center gap-2 text-xs text-muted-foreground min-w-0", collapsed && "justify-center")} title={collapsed ? user?.email : undefined}><ShieldCheck className="h-3.5 w-3.5 shrink-0" />{!collapsed && <span className="truncate">{user?.email || "—"}</span>}</div>{collapsed && <button onClick={onToggle} className="mt-3 w-full rounded-md p-1.5 text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground" aria-label="Développer la sidebar"><PanelLeftOpen className="h-4 w-4 mx-auto" /></button>}</div>
  </div>;
}

function Breadcrumbs({ pathname }) {
  const segments = pathname.split("/").filter(Boolean);
  const labels = { projects: "Projets", core: "AI Core", modules: "Module Registry", executions: "AI Executions", audit: "Audit Trail", api: "API & Integrations", risk: "Risk Management" };
  const items = [{ label: "Accueil", to: "/", icon: Home }];
  let current = "";
  segments.forEach((segment, index) => { current += `/${segment}`; const label = labels[segment] || (segments[index - 1] === "projects" ? "Projet" : segment); items.push({ label, to: current }); });
  return <nav aria-label="Fil d’Ariane" className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">{items.map((item, index) => <span key={item.to} className="flex items-center gap-1.5 min-w-0">{index > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />}{index === items.length - 1 ? <span className="truncate font-medium text-foreground">{item.icon ? <item.icon className="h-3.5 w-3.5" /> : item.label}</span> : <Link to={item.to} className="truncate hover:text-foreground">{item.icon ? <item.icon className="h-3.5 w-3.5" /> : item.label}</Link>}</span>)}</nav>;
}

export default function Layout() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem("modulai-project-sidebar") === "collapsed");
  const [open, setOpen] = useState(false);
  useEffect(() => { localStorage.setItem("modulai-project-sidebar", collapsed ? "collapsed" : "expanded"); }, [collapsed]);
  return <div className="min-h-screen bg-muted/30">
    <header className="fixed inset-x-0 top-0 z-40 h-16 border-b border-border bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75"><div className="flex h-full items-center justify-between gap-4 px-4 md:pl-[calc(var(--project-sidebar-width)+1rem)]" style={{ "--project-sidebar-width": collapsed ? "5rem" : "16rem" }}><div className="flex items-center gap-3 min-w-0"><button onClick={() => setOpen(true)} className="rounded-md p-2 hover:bg-muted md:hidden" aria-label="Ouvrir le menu"><Menu className="h-5 w-5" /></button><Breadcrumbs pathname={pathname} /></div><div className="flex items-center gap-3"><button className="rounded-md p-2 text-muted-foreground hover:bg-muted" aria-label="Notifications"><Bell className="h-4 w-4" /></button><div className="hidden sm:block text-right"><div className="text-xs font-medium truncate max-w-40">{user?.name || "Administrateur"}</div><div className="text-[10px] text-muted-foreground truncate max-w-40">{user?.email || ""}</div></div></div></div></header>
    <aside className={cn("hidden md:flex md:fixed md:inset-y-0 md:left-0 md:flex-col border-r border-border bg-sidebar z-50 transition-[width] duration-200", collapsed ? "md:w-20" : "md:w-64")}><SidebarContent pathname={pathname} collapsed={collapsed} onToggle={() => setCollapsed((value) => !value)} /></aside>
    {open && <div className="md:hidden fixed inset-0 z-50"><div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} /><aside className="absolute inset-y-0 left-0 w-72 max-w-[85%] bg-sidebar border-r border-sidebar-border shadow-xl flex flex-col"><button onClick={() => setOpen(false)} className="absolute right-3 top-4 z-10 p-1.5 rounded-md hover:bg-sidebar-accent" aria-label="Fermer le menu"><X className="h-5 w-5" /></button><SidebarContent pathname={pathname} onNavigate={() => setOpen(false)} collapsed={false} onToggle={() => setOpen(false)} /></aside></div>}
    <main className={cn("min-w-0 pt-[75px] px-[30px] transition-[padding] duration-200", collapsed ? "md:pl-[110px]" : "md:pl-[286px]")}><Outlet /></main>
  </div>;
}
