import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import StatusBadge from "@/components/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FolderKanban, Blocks, Cpu, ShieldCheck, ArrowRight, Activity } from "lucide-react";
import { CORE_VERSION } from "@/lib/platform";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

export default function Dashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    (async () => {
      const [projects, modules, executions, risks, audits] = await Promise.all([
        base44.entities.Project.list("-created_date", 100),
        base44.entities.Module.list("-created_date", 100),
        base44.entities.AIExecution.list("-created_date", 100),
        base44.entities.Risk.list("-created_date", 100),
        base44.entities.AuditEvent.list("-created_date", 6),
      ]);
      setData({ projects, modules, executions, risks, audits });
    })();
  }, []);

  if (!data) {
    return (
      <div className="p-10">
        <div className="h-6 w-48 bg-muted rounded animate-pulse mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-28 bg-muted rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  const { projects, modules, executions, risks, audits } = data;

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Dashboard"
        subtitle={`Plateforme modulaire d'applications IA — AI Core v${CORE_VERSION}. Assemblez un Core générique et des modules métier versionnés pour construire des applications IA.`}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Projets" value={projects.length} icon={FolderKanban} accent="bg-blue-50" />
        <StatCard label="Modules" value={modules.length} icon={Blocks} accent="bg-violet-50" />
        <StatCard label="Exécutions IA" value={executions.length} icon={Cpu} accent="bg-amber-50" />
        <StatCard label="Analyses de risques" value={risks.length} icon={ShieldCheck} accent="bg-emerald-50" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><Activity className="h-4 w-4" /> Dernières exécutions IA</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link to="/executions">Tout voir <ArrowRight className="h-3.5 w-3.5 ml-1" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {executions.length === 0 && <p className="text-sm text-muted-foreground py-4">Aucune exécution pour le moment.</p>}
            {executions.slice(0, 6).map((ex) => (
              <Link key={ex.id} to={`/executions/${ex.id}`} className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-muted/50 transition">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{ex.use_case}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{ex.project_name || "—"} · {ex.provider} · {ex.model}</div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-muted-foreground hidden sm:block">{formatDistanceToNow(new Date(ex.created_date), { addSuffix: true, locale: fr })}</span>
                  <StatusBadge status={ex.status} />
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Dernières activités d'audit</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link to="/audit">Tout voir <ArrowRight className="h-3.5 w-3.5 ml-1" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {audits.length === 0 && <p className="text-sm text-muted-foreground py-4">Aucun événement d'audit pour le moment.</p>}
            {audits.map((ev) => (
              <div key={ev.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium capitalize">{ev.action.replace(/_/g, " ")}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{ev.project_name || "—"} · {ev.user_name || "—"}</div>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{formatDistanceToNow(new Date(ev.created_date), { addSuffix: true, locale: fr })}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}