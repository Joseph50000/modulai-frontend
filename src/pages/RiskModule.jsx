import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import EmptyState from "@/components/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { ArrowLeft, Plus, ShieldCheck, Loader2, Cpu, ArrowRight } from "lucide-react";
import { analyze } from "@/core/ai/orchestrator";
import { recordAudit } from "@/core/ai/auditTrail";
import { RISK_PROMPT_NAME, RISK_OUTPUT_SCHEMA, RISK_REQUIRED_FIELDS, RISK_RULES } from "@/modules/risk/riskConfig";
import { PROVIDER_OPTIONS, DEFAULT_PROVIDER } from "@/lib/platform";

const EMPTY = { title: "", processus: "", activite: "", evenement: "", impact: "", incidents_historiques: "", controles_dmr: "", informations_complementaires: "", documents_text: "" };

export default function RiskModule() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [project, setProject] = useState(null);
  const [risks, setRisks] = useState(null);
  const [riskModule, setRiskModule] = useState(null);
  const [providers, setProviders] = useState([]);
  const [provider, setProvider] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [analyzingId, setAnalyzingId] = useState(null);

  const load = async () => {
    const [p, rks, mods, provs] = await Promise.all([
      base44.entities.Project.get(id),
      base44.entities.Risk.filter({ project_id: id }, "-created_date", 100),
      base44.entities.Module.filter({ name: "Risk Management" }, "-version", 1),
      base44.entities.AiProvider.filter({ status: "active" })
    ]);
    setProject(p);
    setRisks(rks);
    setRiskModule(mods[0] || null);
    setProviders(provs);
    if (provs.length > 0 && !provider) setProvider(provs[0].id);
  };

  useEffect(() => { load(); }, [id]);

  const createRisk = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const risk = await base44.entities.Risk.create({ ...form, project_id: id, status: "draft" });
      await recordAudit({
        project_id: id, project_name: project?.name,
        module_id: riskModule?.id, module_name: "Risk Management",
        user_id: user?.id, user_name: user?.full_name || user?.email,
        action: "risk_created", entity_type: "Risk", entity_id: risk.id,
        new_value: { title: risk.title },
      });
      setForm(EMPTY);
      setOpen(false);
      await load();
      toast({ title: "Risque créé", description: risk.title });
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur", description: e.message });
    } finally {
      setSaving(false);
    }
  };

  const analyzeRisk = async (risk) => {
    setAnalyzingId(risk.id);
    try {
      const res = await analyze({
        projectId: id, projectName: project?.name,
        moduleId: riskModule?.id, moduleName: "Risk Management",
        useCase: "risk-analysis",
        provider,
        user,
        structuredData: {
          processus: risk.processus, activite: risk.activite, evenement: risk.evenement,
          impact: risk.impact, incidents_historiques: risk.incidents_historiques,
          controles_dmr: risk.controles_dmr, informations_complementaires: risk.informations_complementaires,
        },
        documents: risk.documents_text ? [{ name: "Document fourni", content: risk.documents_text }] : [],
        history: [],
        rules: RISK_RULES,
        searchQuery: risk.evenement,
        outputSchema: RISK_OUTPUT_SCHEMA,
        requiredFields: RISK_REQUIRED_FIELDS,
        promptName: RISK_PROMPT_NAME,
        variables: {
          processus: risk.processus || "—", activite: risk.activite || "—",
          evenement: risk.evenement || "—", impact: risk.impact || "—",
          incidents_historiques: risk.incidents_historiques || "—",
          controles_dmr: risk.controles_dmr || "—",
          informations_complementaires: risk.informations_complementaires || "—",
        },
      });
      if (res.status === "error") {
        toast({ variant: "destructive", title: "Analyse échouée", description: res.error });
      } else {
        await base44.entities.Risk.update(risk.id, {
          analysis_result: res.output,
          status: "analyzed",
          execution_id: res.execution_id,
        });
        toast({ title: "Analyse terminée", description: `Exécution ${res.execution_id.slice(0, 8)}` });
        navigate(`/projects/${id}/risk/${risk.id}`);
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur", description: e.message });
    } finally {
      setAnalyzingId(null);
    }
  };

  if (!project || !risks) return <div className="p-10"><div className="h-6 w-64 bg-muted rounded animate-pulse" /></div>;

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto">
      <Button variant="ghost" size="sm" onClick={() => navigate(`/projects/${id}`)} className="mb-4 -ml-2 text-muted-foreground">
        <ArrowLeft className="h-4 w-4 mr-1.5" /> {project.name}
      </Button>

      <PageHeader title="Risk Management" subtitle={`Module métier v${riskModule?.version || "1.0.0"} — premier consommateur du AI Core. Créez un risque puis lancez l'analyse IA.`}>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-muted-foreground" />
            <Select value={provider} onValueChange={setProvider}>
              <SelectTrigger className="w-44 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {providers.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" /> Nouveau risque</Button>
        </div>
      </PageHeader>

      {risks.length === 0 ? (
        <EmptyState icon={ShieldCheck} title="Aucun risque" description="Créez un risque avec ses informations métier, puis lancez l'analyse IA via le Core.">
          <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" /> Nouveau risque</Button>
        </EmptyState>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {risks.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-medium">{r.title}</h3>
                  <StatusBadge status={r.status} />
                </div>
                <div className="text-xs text-muted-foreground mt-1.5 space-y-0.5">
                  <div>Processus : {r.processus || "—"}</div>
                  <div>Événement : {r.evenement || "—"}</div>
                </div>
                {r.analysis_result && (
                  <div className="flex items-center gap-3 mt-3 text-xs">
                    <span className="bg-muted px-2 py-1 rounded-md">P: {r.analysis_result.probability}/5</span>
                    <span className="bg-muted px-2 py-1 rounded-md">I: {r.analysis_result.impact}/5</span>
                    <span className="bg-muted px-2 py-1 rounded-md">S: {r.analysis_result.severity}/5</span>
                  </div>
                )}
                <div className="flex items-center gap-2 mt-4">
                  {r.status === "draft" || !r.analysis_result ? (
                    <Button size="sm" className="w-full" onClick={() => analyzeRisk(r)} disabled={analyzingId === r.id}>
                      {analyzingId === r.id ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Analyse…</> : <><Cpu className="h-3.5 w-3.5 mr-1.5" /> Analyser avec l'IA</>}
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" className="w-full" onClick={() => navigate(`/projects/${id}/risk/${r.id}`)}>
                      Voir l'analyse <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nouveau risque</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="title">Titre du risque *</Label>
              <Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Défaillance du processus de paiement" />
            </div>
            <div className="space-y-1.5"><Label htmlFor="processus">Processus</Label><Input id="processus" value={form.processus} onChange={(e) => setForm({ ...form, processus: e.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="activite">Activité</Label><Input id="activite" value={form.activite} onChange={(e) => setForm({ ...form, activite: e.target.value })} /></div>
            <div className="space-y-1.5 md:col-span-2"><Label htmlFor="evenement">Événement redouté</Label><Input id="evenement" value={form.evenement} onChange={(e) => setForm({ ...form, evenement: e.target.value })} /></div>
            <div className="space-y-1.5 md:col-span-2"><Label htmlFor="impact">Impact</Label><Input id="impact" value={form.impact} onChange={(e) => setForm({ ...form, impact: e.target.value })} placeholder="Indemnisation, perte financière, réputation…" /></div>
            <div className="space-y-1.5 md:col-span-2"><Label htmlFor="incidents">Incidents historiques</Label><Textarea id="incidents" value={form.incidents_historiques} onChange={(e) => setForm({ ...form, incidents_historiques: e.target.value })} rows={2} placeholder="Décrivez les incidents survenus…" /></div>
            <div className="space-y-1.5 md:col-span-2"><Label htmlFor="dmr">Contrôles / DMR</Label><Textarea id="dmr" value={form.controles_dmr} onChange={(e) => setForm({ ...form, controles_dmr: e.target.value })} rows={2} placeholder="Dispositifs de maîtrise des risques en place…" /></div>
            <div className="space-y-1.5 md:col-span-2"><Label htmlFor="info">Informations complémentaires</Label><Textarea id="info" value={form.informations_complementaires} onChange={(e) => setForm({ ...form, informations_complementaires: e.target.value })} rows={2} /></div>
            <div className="space-y-1.5 md:col-span-2"><Label htmlFor="docs">Documents de référence</Label><Textarea id="docs" value={form.documents_text} onChange={(e) => setForm({ ...form, documents_text: e.target.value })} rows={3} placeholder="Collez le contenu des documents pertinents (alimente le RAG)…" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={createRisk} disabled={!form.title.trim() || saving}>{saving ? "Création…" : "Créer le risque"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}