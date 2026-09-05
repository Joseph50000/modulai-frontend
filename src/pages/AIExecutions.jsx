import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import EmptyState from "@/components/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Cpu, ArrowRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

export default function AIExecutions() {
  const [executions, setExecutions] = useState(null);

  useEffect(() => { (async () => setExecutions(await base44.entities.AIExecution.list("-created_date", 100)))(); }, []);

  return (
    <div className="w-full p-0">
      <PageHeader title="AI Executions" subtitle="Chaque appel au moteur IA est tracé : modèle, version du prompt, contexte, sortie structurée et durée." />

      {!executions ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />)}</div>
      ) : executions.length === 0 ? (
        <EmptyState icon={Cpu} title="Aucune exécution" description="Les exécutions IA apparaîtront ici dès qu'une analyse sera lancée depuis un module." />
      ) : (
        <div className="rounded-xl border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs text-muted-foreground uppercase tracking-wide">
              <tr>
                <th className="text-left font-medium px-4 py-3">Date</th>
                <th className="text-left font-medium px-4 py-3">Use Case</th>
                <th className="text-left font-medium px-4 py-3 hidden md:table-cell">Projet</th>
                <th className="text-left font-medium px-4 py-3 hidden lg:table-cell">Module</th>
                <th className="text-left font-medium px-4 py-3 hidden sm:table-cell">Modèle</th>
                <th className="text-left font-medium px-4 py-3">Statut</th>
                <th className="text-left font-medium px-4 py-3">Validation</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {executions.map((ex) => (
                <tr key={ex.id} className="border-t border-border hover:bg-muted/30 transition">
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{formatDistanceToNow(new Date(ex.created_date), { addSuffix: true, locale: fr })}</td>
                  <td className="px-4 py-3 font-medium">{ex.use_case}</td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{ex.project_name || "—"}</td>
                  <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">{ex.module_name || "—"}</td>
                  <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground font-mono text-xs">{ex.model}</td>
                  <td className="px-4 py-3"><StatusBadge status={ex.status} /></td>
                  <td className="px-4 py-3">
                    {ex.human_validation !== "none" ? (
                      <StatusBadge 
                        status={ex.human_validation === "approved" ? "success" : ex.human_validation === "rejected" ? "error" : "warning"} 
                        label={ex.human_validation === "approved" ? "Validé" : ex.human_validation === "rejected" ? "Rejeté" : "En attente"} 
                      />
                    ) : <span className="text-muted-foreground text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right"><Link to={`/executions/${ex.id}`} className="text-muted-foreground hover:text-foreground"><ArrowRight className="h-4 w-4" /></Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
