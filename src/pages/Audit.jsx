import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollText, ShieldCheck, Cpu, Plus, Check, X, Pencil, FolderPlus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

const ACTION_META = {
  project_created: { icon: FolderPlus, cls: "bg-blue-50 text-blue-700 border-blue-200", label: "Projet créé" },
  module_added: { icon: Plus, cls: "bg-violet-50 text-violet-700 border-violet-200", label: "Module ajouté" },
  risk_created: { icon: ShieldCheck, cls: "bg-slate-50 text-slate-700 border-slate-200", label: "Risque créé" },
  analyzed: { icon: Cpu, cls: "bg-amber-50 text-amber-700 border-amber-200", label: "Analysé" },
  approved: { icon: Check, cls: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Validé" },
  rejected: { icon: X, cls: "bg-rose-50 text-rose-700 border-rose-200", label: "Rejeté" },
  modified: { icon: Pencil, cls: "bg-amber-50 text-amber-700 border-amber-200", label: "Modifié" },
};

export default function Audit() {
  const [events, setEvents] = useState(null);

  useEffect(() => { (async () => setEvents(await base44.entities.AuditEvent.list("-created_date", 100)))(); }, []);

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto">
      <PageHeader title="Audit Trail" subtitle="Traçabilité complète : pourquoi l'IA a-t-elle produit cette recommandation ? Qui a décidé quoi, quand, et sur quelle base ?" />

      {!events ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}</div>
      ) : events.length === 0 ? (
        <EmptyState icon={ScrollText} title="Aucun événement" description="Toutes les actions (création, analyse, décisions humaines) seront enregistrées ici." />
      ) : (
        <div className="relative pl-6">
          <div className="absolute left-2 top-2 bottom-2 w-px bg-border" />
          <div className="space-y-4">
            {events.map((ev) => {
              const meta = ACTION_META[ev.action] || { icon: ScrollText, cls: "bg-slate-50 text-slate-700 border-slate-200", label: ev.action };
              const Icon = meta.icon;
              return (
                <div key={ev.id} className="relative">
                  <div className={`absolute -left-4 top-3 h-4 w-4 rounded-full border-2 border-background ${meta.cls.split(" ")[0]} grid place-items-center`}>
                    <div className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />
                  </div>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <Badge variant="outline" className={`gap-1.5 ${meta.cls}`}><Icon className="h-3 w-3" /> {meta.label}</Badge>
                          <span className="text-xs text-muted-foreground">{ev.user_name || "—"}</span>
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">{formatDistanceToNow(new Date(ev.created_date), { addSuffix: true, locale: fr })}</span>
                      </div>
                      <div className="mt-2 text-sm">
                        <span className="text-muted-foreground">{ev.project_name || "Plateforme"}</span>
                        {ev.module_name && <span className="text-muted-foreground"> · {ev.module_name}</span>}
                        {ev.use_case && <span className="text-muted-foreground"> · {ev.use_case}</span>}
                      </div>
                      {ev.comment && <p className="text-sm text-muted-foreground italic mt-2">« {ev.comment} »</p>}
                      {(ev.old_value && Object.keys(ev.old_value).length > 0) || (ev.new_value && Object.keys(ev.new_value).length > 0) ? (
                        <div className="flex flex-wrap gap-2 mt-3 text-xs">
                          {ev.old_value && Object.keys(ev.old_value).length > 0 && (
                            <span className="bg-rose-50 text-rose-700 px-2 py-1 rounded-md">Avant : {JSON.stringify(ev.old_value)}</span>
                          )}
                          {ev.new_value && Object.keys(ev.new_value).length > 0 && (
                            <span className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded-md">Après : {JSON.stringify(ev.new_value).slice(0, 120)}{JSON.stringify(ev.new_value).length > 120 ? "…" : ""}</span>
                          )}
                        </div>
                      ) : null}
                      {ev.execution_id && <Link to={`/executions/${ev.execution_id}`} className="text-xs text-blue-600 hover:underline mt-2 inline-block">Voir l'exécution IA →</Link>}
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}