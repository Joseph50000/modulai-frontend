import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import StatusBadge from "@/components/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Cpu, Clock, FileText, Wrench, User } from "lucide-react";

function JsonBlock({ data }) {
  return (
    <pre className="text-xs bg-muted/60 rounded-lg p-4 overflow-x-auto font-mono leading-relaxed">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

export default function AIExecutionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ex, setEx] = useState(null);

  useEffect(() => { (async () => setEx(await base44.entities.AIExecution.get(id)))(); }, [id]);

  if (!ex) return <div className="p-10"><div className="h-6 w-64 bg-muted rounded animate-pulse" /></div>;

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto">
      <Button variant="ghost" size="sm" onClick={() => navigate("/executions")} className="mb-4 -ml-2 text-muted-foreground">
        <ArrowLeft className="h-4 w-4 mr-1.5" /> AI Executions
      </Button>

      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-heading font-semibold tracking-tight">Exécution {ex.id.slice(0, 8)}</h1>
          <p className="text-sm text-muted-foreground mt-1">{ex.use_case}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={ex.status} />
          {ex.human_validation !== "none" && (
            <StatusBadge 
              status={ex.human_validation === "approved" ? "success" : ex.human_validation === "rejected" ? "error" : "warning"} 
              label={ex.human_validation === "approved" ? "Validé" : ex.human_validation === "rejected" ? "Rejeté" : "En attente de validation"} 
            />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1.5"><Cpu className="h-3.5 w-3.5" /> Provider</div><div className="text-sm font-medium mt-1.5">{ex.provider}</div><div className="text-xs text-muted-foreground font-mono">{ex.model}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" /> Prompt</div><div className="text-sm font-medium mt-1.5">{ex.prompt_name || "—"}</div><div className="text-xs text-muted-foreground">v{ex.prompt_version || "—"}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1.5"><Wrench className="h-3.5 w-3.5" /> Module</div><div className="text-sm font-medium mt-1.5">{ex.module_name || "—"}</div><div className="text-xs text-muted-foreground">{ex.project_name || "—"}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Durée</div><div className="text-sm font-medium mt-1.5">{ex.execution_time} ms</div><div className="text-xs text-muted-foreground flex items-center gap-1"><User className="h-3 w-3" /> {ex.user_name || "—"}</div></CardContent></Card>
      </div>

      {ex.status === "error" && (
        <Card className="mb-6 border-rose-200"><CardContent className="p-4"><div className="text-sm font-medium text-rose-700">Erreur</div><div className="text-sm text-rose-600 mt-1">{ex.error}</div></CardContent></Card>
      )}

      {ex.human_validation !== "none" && (
        <Card className="mb-6 bg-slate-50 border-slate-200">
          <CardContent className="p-4">
            <div className="text-sm font-medium text-slate-800 mb-2">Audit et Justification Humaine</div>
            <div className="text-sm text-slate-600 bg-white p-3 rounded-md border border-slate-200 shadow-sm">
              {ex.justification || "Aucune justification renseignée pour le moment."}
            </div>
            {(ex.human_validation === "pending" || !ex.human_validation) && (
               <div className="mt-4 flex gap-3">
                 <Button size="sm" variant="outline" className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 border-emerald-200" onClick={async () => {
                   await base44.entities.AIExecution.update(ex.id, { human_validation: "approved", justification: "Validé par le superviseur." });
                   setEx({ ...ex, human_validation: "approved", justification: "Validé par le superviseur." });
                 }}>Approuver</Button>
                 <Button size="sm" variant="outline" className="bg-rose-50 text-rose-700 hover:bg-rose-100 hover:text-rose-800 border-rose-200" onClick={async () => {
                   await base44.entities.AIExecution.update(ex.id, { human_validation: "rejected", justification: "Rejeté par le superviseur." });
                   setEx({ ...ex, human_validation: "rejected", justification: "Rejeté par le superviseur." });
                 }}>Rejeter</Button>
               </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Contexte & Ressources</CardTitle></CardHeader>
          <CardContent>
            {ex.resources_used && (
              <div className="mb-4 text-xs font-mono bg-blue-50 text-blue-800 p-2 rounded-md border border-blue-100">
                {ex.resources_used}
              </div>
            )}
            <div className="flex flex-wrap gap-2 mb-4">
              {Object.entries(ex.context_reference || {}).map(([k, v]) => (
                <span key={k} className={`text-xs px-2.5 py-1 rounded-md border ${v ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-400 border-slate-200"}`}>
                  {k.replace(/_/g, " ")} : {typeof v === "number" ? v : v ? "oui" : "non"}
                </span>
              ))}
            </div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Entrée (input_reference)</div>
            <JsonBlock data={ex.input_reference} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Sortie structurée</CardTitle></CardHeader>
          <CardContent><JsonBlock data={ex.output} /></CardContent>
        </Card>
      </div>

      <Separator className="my-6" />
      <div className="text-xs text-muted-foreground">Identifiant complet : <span className="font-mono">{ex.id}</span></div>
    </div>
  );
}