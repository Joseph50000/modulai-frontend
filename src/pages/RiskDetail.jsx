import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import StatusBadge from "@/components/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Cpu, Check, AlertTriangle, Lightbulb, HelpCircle, ShieldCheck, Pencil, X, CheckCircle2 } from "lucide-react";
import { recordAudit } from "@/core/ai/auditTrail";

function ScoreDial({ label, value }) {
  return (
    <div className="text-center">
      <div className="h-16 w-16 rounded-2xl bg-primary text-primary-foreground grid place-items-center mx-auto">
        <span className="text-2xl font-heading font-semibold">{value}</span>
      </div>
      <div className="text-xs text-muted-foreground mt-2">{label}</div>
    </div>
  );
}

export default function RiskDetail() {
  const { id, riskId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [risk, setRisk] = useState(null);
  const [execution, setExecution] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editValues, setEditValues] = useState({ probability: 3, impact: 3, severity: 3 });
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const r = await base44.entities.Risk.get(riskId);
    setRisk(r);
    if (r.execution_id) {
      try { setExecution(await base44.entities.AIExecution.get(r.execution_id)); } catch (_) { setExecution(null); }
    }
  };

  useEffect(() => { load(); }, [riskId]);

  if (!risk) return <div className="p-10"><div className="h-6 w-64 bg-muted rounded animate-pulse" /></div>;

  const a = risk.analysis_result || {};

  const decide = async (action, newValue) => {
    setSaving(true);
    try {
      const oldVal = { probability: a.probability, impact: a.impact, severity: a.severity, severity_label: a.severity_label };
      const finalValue = newValue || oldVal;
      await base44.entities.Risk.update(riskId, {
        status: action,
        decision: { action, value: finalValue, comment, ai_proposition: oldVal },
        decided_by: user?.email,
        decided_at: new Date().toISOString(),
      });
      await recordAudit({
        project_id: id, project_name: "",
        module_id: "", module_name: "Risk Management",
        use_case: "risk-analysis",
        user_id: user?.id, user_name: user?.full_name || user?.email,
        action, entity_type: "Risk", entity_id: riskId,
        old_value: oldVal, new_value: finalValue,
        comment, execution_id: risk.execution_id || "",
      });
      toast({ title: action === "approved" ? "Risque validé" : action === "rejected" ? "Risque rejeté" : "Risque modifié" });
      setEditMode(false);
      setComment("");
      await load();
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur", description: e.message });
    } finally {
      setSaving(false);
    }
  };

  const startEdit = () => {
    setEditValues({ probability: a.probability || 3, impact: a.impact || 3, severity: a.severity || 3 });
    setEditMode(true);
  };

  const decided = risk.status === "approved" || risk.status === "rejected" || risk.status === "modified";

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto">
      <Button variant="ghost" size="sm" onClick={() => navigate(`/projects/${id}/risk`)} className="mb-4 -ml-2 text-muted-foreground">
        <ArrowLeft className="h-4 w-4 mr-1.5" /> Module Risk
      </Button>

      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-heading font-semibold tracking-tight">{risk.title}</h1>
          <div className="flex items-center gap-2 mt-2"><StatusBadge status={risk.status} /></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Proposition de l'IA</CardTitle></CardHeader>
          <CardContent>
            {!risk.analysis_result ? (
              <p className="text-sm text-muted-foreground">Aucune analyse IA pour ce risque.</p>
            ) : (
              <>
                <div className="flex items-center justify-around gap-4 py-2">
                  <ScoreDial label="Probabilité" value={`${a.probability}/5`} />
                  <ScoreDial label="Impact" value={`${a.impact}/5`} />
                  <ScoreDial label="Sévérité" value={`${a.severity}/5`} />
                </div>
                <div className="flex items-center justify-center gap-3 mt-4">
                  <span className="text-sm font-medium">Sévérité : {a.severity_label}</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-sm text-muted-foreground">Confiance : {Math.round((a.confidence || 0) * 100)} %</span>
                </div>

                <Separator className="my-6" />

                <div className="space-y-5">
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Pourquoi ?</h4>
                    <ol className="space-y-2">
                      {(a.justification || []).map((j, i) => (
                        <li key={i} className="flex gap-2.5 text-sm text-muted-foreground">
                          <span className="font-semibold text-foreground shrink-0">{i + 1}.</span>
                          <span>{j}</span>
                        </li>
                      ))}
                    </ol>
                  </div>

                  {a.dominant_causes?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5"><AlertTriangle className="h-4 w-4 text-amber-600" /> Causes dominantes</h4>
                      <ul className="space-y-1">{a.dominant_causes.map((c, i) => <li key={i} className="text-sm text-muted-foreground flex gap-2"><span className="text-amber-600">•</span>{c}</li>)}</ul>
                    </div>
                  )}

                  {a.missing_information?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5"><HelpCircle className="h-4 w-4 text-blue-600" /> Informations manquantes</h4>
                      <ul className="space-y-1">{a.missing_information.map((c, i) => <li key={i} className="text-sm text-muted-foreground flex gap-2"><span className="text-blue-600">•</span>{c}</li>)}</ul>
                    </div>
                  )}

                  {a.recommendations?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5"><Lightbulb className="h-4 w-4 text-violet-600" /> Recommandations</h4>
                      <ul className="space-y-1">{a.recommendations.map((c, i) => <li key={i} className="text-sm text-muted-foreground flex gap-2"><span className="text-violet-600">•</span>{c}</li>)}</ul>
                    </div>
                  )}

                  <div>
                    <h4 className="text-sm font-semibold mb-2">Informations utilisées</h4>
                    <div className="flex flex-wrap gap-2">
                      {(a.data_sources_used || []).map((s, i) => (
                        <span key={i} className="inline-flex items-center gap-1.5 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-md">
                          <Check className="h-3 w-3" /> {s}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Décision humaine</CardTitle></CardHeader>
            <CardContent>
              {decided && !editMode ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    <span className="text-sm font-medium capitalize">{risk.status === "approved" ? "Validé" : risk.status === "rejected" ? "Rejeté" : "Modifié"} par {risk.decided_by}</span>
                  </div>
                  {risk.decision?.value && (
                    <div className="text-xs text-muted-foreground bg-muted/50 rounded-md p-3">
                      Valeur finale : P{risk.decision.value.probability}/5 · I{risk.decision.value.impact}/5 · S{risk.decision.value.severity}/5
                    </div>
                  )}
                  {risk.decision?.comment && <p className="text-sm text-muted-foreground italic">« {risk.decision.comment} »</p>}
                  <Button variant="outline" size="sm" className="w-full" onClick={startEdit}><Pencil className="h-3.5 w-3.5 mr-1.5" /> Revoir la décision</Button>
                </div>
              ) : editMode ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    {["probability", "impact", "severity"].map((f) => (
                      <div key={f} className="space-y-1">
                        <Label className="text-xs capitalize">{f === "probability" ? "Prob." : f === "impact" ? "Impact" : "Sév."}</Label>
                        <Input type="number" min={1} max={5} value={editValues[f]} onChange={(e) => setEditValues({ ...editValues, [f]: Number(e.target.value) })} />
                      </div>
                    ))}
                  </div>
                  <Textarea placeholder="Commentaire (optionnel)" value={comment} onChange={(e) => setComment(e.target.value)} rows={2} />
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1" disabled={saving} onClick={() => decide("modified", editValues)}><Check className="h-3.5 w-3.5 mr-1.5" /> Enregistrer</Button>
                    <Button size="sm" variant="outline" onClick={() => setEditMode(false)}><X className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">L'IA est une aide à la décision. Validez, modifiez ou rejetez la proposition.</p>
                  <Button className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={saving} onClick={() => decide("approved")}><Check className="h-4 w-4 mr-2" /> Valider</Button>
                  <Button variant="outline" className="w-full" disabled={saving} onClick={startEdit}><Pencil className="h-4 w-4 mr-2" /> Modifier</Button>
                  <Button variant="outline" className="w-full text-rose-600 hover:text-rose-700 border-rose-200 hover:bg-rose-50" disabled={saving} onClick={() => decide("rejected")}><X className="h-4 w-4 mr-2" /> Rejeter</Button>
                  {comment === "" && <Textarea placeholder="Commentaire (optionnel)" value={comment} onChange={(e) => setComment(e.target.value)} rows={2} />}
                </div>
              )}
            </CardContent>
          </Card>

          {execution && (
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-2 text-sm font-medium mb-2"><Cpu className="h-4 w-4" /> Exécution IA</div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>Provider : {execution.provider}</div>
                  <div>Modèle : {execution.model}</div>
                  <div>Prompt : {execution.prompt_name} v{execution.prompt_version}</div>
                  <div>Durée : {execution.execution_time} ms</div>
                </div>
                <Button asChild variant="ghost" size="sm" className="w-full mt-3"><Link to={`/executions/${execution.id}`}>Voir le détail de l'exécution</Link></Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Separator className="my-8" />
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Données du risque</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-sm">
            <Detail label="Processus" value={risk.processus} />
            <Detail label="Activité" value={risk.activite} />
            <Detail label="Événement redouté" value={risk.evenement} />
            <Detail label="Impact" value={risk.impact} />
            <Detail label="Incidents historiques" value={risk.incidents_historiques} />
            <Detail label="Contrôles / DMR" value={risk.controles_dmr} />
            <Detail label="Informations complémentaires" value={risk.informations_complementaires} />
            <Detail label="Documents de référence" value={risk.documents_text} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className="mt-0.5 whitespace-pre-wrap">{value || "—"}</div>
    </div>
  );
}