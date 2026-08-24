import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import StatusBadge from "@/components/StatusBadge";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/lib/AuthContext";
import { Loader2, Cpu, Check, X, ArrowRight, ShieldCheck } from "lucide-react";
import { executeModuleUseCase } from "@/core/ai/moduleExecution";
import { recordAudit } from "@/core/ai/auditTrail";
import { Link } from "react-router-dom";

// Runs a use case defined inside a stored module, using only the Core engine.
// Builds the input form dynamically from the use case input_schema.
export default function UseCaseRunner({ open, onOpenChange, project, moduleVersion, useCase, provider }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const fields = useCase?.input_schema || [];
  const [values, setValues] = useState({});
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [comment, setComment] = useState("");
  const [deciding, setDeciding] = useState(false);

  if (!useCase) return null;

  const run = async () => {
    setRunning(true);
    setResult(null);
    try {
      const res = await executeModuleUseCase({
        projectId: project.id, projectName: project.name,
        moduleVersionId: moduleVersion.id, useCaseKey: useCase.key,
        inputData: values, provider, user,
      });
      setResult(res);
      if (res.status === "error") toast({ variant: "destructive", title: "Exécution échouée", description: res.error });
      else toast({ title: "Use Case exécuté", description: `${useCase.name} · exécution ${res.execution_id.slice(0, 8)}` });
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur", description: e.message });
    } finally { setRunning(false); }
  };

  const decide = async (action) => {
    setDeciding(true);
    try {
      await base44.entities.AIExecution.update(result.execution_id, {
        human_validation: {
          action, comment,
          validated_by: user?.email || user?.full_name || "",
          validated_at: new Date().toISOString(),
        },
      });
      await recordAudit({
        project_id: project.id, project_name: project.name,
        module_id: moduleVersion.id, module_name: moduleVersion.name,
        use_case: useCase.key,
        user_id: user?.id, user_name: user?.full_name || user?.email,
        action, entity_type: "AIExecution", entity_id: result.execution_id,
        new_value: result.output, comment, execution_id: result.execution_id,
      });
      toast({ title: action === "approved" ? "Résultat validé" : "Résultat rejeté" });
      setResult((r) => ({ ...r, validated: true, decision: action }));
    } finally { setDeciding(false); }
  };

  const close = () => { if (running) return; onOpenChange(false); setValues({}); setResult(null); setComment(""); };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            <Cpu className="h-4 w-4" /> {useCase.name}
            <span className="text-xs text-muted-foreground font-mono font-normal">{useCase.key}</span>
          </DialogTitle>
        </DialogHeader>

        {!result ? (
          <div className="space-y-4 py-2">
            <div className="text-xs text-muted-foreground bg-muted/50 rounded-md p-3 flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5" /> {moduleVersion.name} v{moduleVersion.version} · exécuté par le AI Core ({provider})
            </div>
            {fields.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun champ d'entrée défini — l'analyse s'appuiera sur le prompt seul.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {fields.map((f) => (
                  <div key={f.name} className={`space-y-1.5 ${f.type === "array" || f.description?.length > 40 ? "md:col-span-2" : ""}`}>
                    <Label htmlFor={`f-${f.name}`}>{f.name}{f.required ? " *" : ""}<span className="text-xs text-muted-foreground ml-2 font-mono">{f.type}</span></Label>
                    {f.type === "array" ? (
                      <Textarea id={`f-${f.name}`} rows={2} value={values[f.name] || ""} onChange={(e) => setValues({ ...values, [f.name]: e.target.value })} placeholder={f.description || "Un élément par ligne"} />
                    ) : (
                      <Input id={`f-${f.name}`} value={values[f.name] || ""} onChange={(e) => setValues({ ...values, [f.name]: e.target.value })} placeholder={f.description || ""} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between">
              <StatusBadge status={result.status} />
              <span className="text-xs text-muted-foreground font-mono">{result.execution_id?.slice(0, 8)} · {result.execution_time}ms</span>
            </div>
            {result.prompt && <div className="text-xs text-muted-foreground">Prompt utilisé : <span className="font-mono">{result.prompt.name} v{result.prompt.version}</span> · {result.provider}</div>}
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Sortie structurée</div>
              <pre className="text-xs bg-muted/60 rounded-lg p-4 overflow-x-auto font-mono leading-relaxed max-h-72 overflow-y-auto">{JSON.stringify(result.output, null, 2)}</pre>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">{result.context_summary && <span>Contexte : {Object.entries(result.context_summary).filter(([, v]) => v).map(([k]) => k).join(", ") || "aucun"}</span>}</div>
          </div>
        )}

        <DialogFooter className="sm:justify-between flex-wrap gap-2">
          {!result ? (
            <>
              <Button variant="outline" onClick={close}>Annuler</Button>
              <Button onClick={run} disabled={running}>{running ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Exécution…</> : <><Cpu className="h-3.5 w-3.5 mr-1.5" /> Exécuter le Use Case</>}</Button>
            </>
          ) : result.status === "success" && !result.validated ? (
            <div className="w-full">
              <Textarea placeholder="Commentaire (optionnel)" value={comment} onChange={(e) => setComment(e.target.value)} rows={2} className="mb-2" />
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <Button asChild variant="ghost" size="sm"><Link to={`/executions/${result.execution_id}`}>Voir l'exécution <ArrowRight className="h-3.5 w-3.5 ml-1" /></Link></Button>
                <div className="flex gap-2">
                  <Button variant="outline" className="text-rose-600 border-rose-200 hover:bg-rose-50" disabled={deciding} onClick={() => decide("rejected")}><X className="h-4 w-4 mr-1.5" /> Rejeter</Button>
                  <Button className="bg-emerald-600 hover:bg-emerald-700" disabled={deciding} onClick={() => decide("approved")}><Check className="h-4 w-4 mr-1.5" /> Valider</Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between w-full flex-wrap gap-2">
              <div className="flex items-center gap-2 text-sm">
                {result.decision && <StatusBadge status={result.decision === "approved" ? "approved" : "rejected"} label={result.decision === "approved" ? "Validé par l'humain" : "Rejeté par l'humain"} />}
              </div>
              <div className="flex gap-2">
                <Button asChild variant="ghost" size="sm"><Link to={`/executions/${result.execution_id}`}>Voir l'exécution <ArrowRight className="h-3.5 w-3.5 ml-1" /></Link></Button>
                <Button variant="outline" onClick={close}>Fermer</Button>
              </div>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}