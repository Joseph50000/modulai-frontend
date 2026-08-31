import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, ChevronDown, ChevronRight, Cpu } from "lucide-react";
import SchemaFieldsEditor from "./SchemaFieldsEditor.jsx";
import { featureKeyOf } from "@/lib/modules";

const USE_CASE_TYPES = ["analysis", "generation", "extraction", "classification", "review"];

const parseArray = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
};

export default function ModuleUseCasesManager({ module, updateModule }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [collections, setCollections] = useState([]);
  const [busy, setBusy] = useState(false);
  const useCases = parseArray(module.use_cases);
  useEffect(() => { base44.entities.RagCollection.list("-created_date", 200).then(setCollections).catch(() => setCollections([])); }, []);
  const features = parseArray(module.features);

  const [form, setForm] = useState({ name: "", description: "", type: "analysis", feature_key: "", prompt_name: "", input_schema: [], output_schema: [] });

    const add = async () => {
    if (!form.name.trim() || busy) return;
    const baseKey = featureKeyOf(form.name);
    let key = baseKey;
    let suffix = 2;
    while (useCases.some((u) => u.key === key)) key = `${baseKey}-${suffix++}`;
    const uc = {
      key,
      name: form.name.trim(),
      description: form.description.trim(),
      type: form.type || "analysis",
      feature_key: form.feature_key || "",
      prompt_name: form.prompt_name.trim() || key,
      input_schema: form.input_schema,
      output_schema: form.output_schema,
      rag_config: { enabled: false },
    };
    setBusy(true);
    try {
      await updateModule({ use_cases: [...useCases, uc] });
      setForm({ name: "", description: "", type: "analysis", feature_key: "", prompt_name: "", input_schema: [], output_schema: [] });
      setOpen(false);
      setExpanded(key);
      toast({ title: "Use Case ajouté", description: `${uc.name} est maintenant enregistré.` });
    } catch (error) {
      toast({ title: "Ajout impossible", description: error.response?.data?.error || error.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };
  const patchUc = async (key, patch) => {
    if (busy) return;
    setBusy(true);
    try {
      await updateModule({ use_cases: useCases.map((u) => (u.key === key ? { ...u, ...patch } : u)) });
    } catch (error) {
      toast({ title: "Mise à jour impossible", description: error.response?.data?.error || error.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };
  const remove = async (key) => {
    if (busy) return;
    const target = useCases.find((u) => u.key === key);
    setBusy(true);
    try {
      await updateModule({ use_cases: useCases.filter((u) => u.key !== key) });
      if (expanded === key) setExpanded(null);
      toast({ title: "Use Case supprimé", description: target?.name || key });
    } catch (error) {
      toast({ title: "Suppression impossible", description: error.response?.data?.error || error.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };


  const featureName = (k) => (features.find((f) => f.key === k) || {}).name || "—";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Chaque fonctionnalité expose un ou plusieurs AI Use Cases, avec leurs schémas d'entrée/sortie et leur prompt.</p>
        <Button size="sm" onClick={() => setOpen(true)} disabled={features.length === 0 || busy}><Plus className="h-4 w-4 mr-1.5" /> Ajouter un Use Case</Button>
      </div>
      {features.length === 0 && <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">Ajoutez d'abord une fonctionnalité pour pouvoir créer un Use Case.</div>}
      {useCases.length === 0 && features.length > 0 && <div className="text-center py-10 text-sm text-muted-foreground border border-dashed border-border rounded-xl">Aucun Use Case défini.</div>}
      <div className="space-y-2.5">
        {useCases.map((uc) => (
          <div key={uc.key} className="rounded-lg border border-border">
            <div className="flex items-center gap-3 p-4">
              <button onClick={() => setExpanded(expanded === uc.key ? null : uc.key)} className="text-muted-foreground" disabled={busy}>
                {expanded === uc.key ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{uc.name}</span>
                  <Badge variant="outline" className="font-mono text-xs">{uc.key}</Badge>
                  <Badge variant="secondary" className="text-xs font-normal">{uc.type}</Badge>
                  <Badge variant="outline" className="text-xs font-normal">Feature : {featureName(uc.feature_key)}</Badge>
                  <Badge variant="outline" className="text-xs font-normal gap-1"><Cpu className="h-3 w-3" />prompt : {uc.prompt_name}</Badge>
                </div>
                {uc.description && <p className="text-sm text-muted-foreground mt-1">{uc.description}</p>}
              </div>
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive shrink-0" onClick={() => remove(uc.key)} disabled={busy}><Trash2 className="h-4 w-4" /></Button>
            </div>
            {expanded === uc.key && (
              <div className="border-t border-border p-4 space-y-5 bg-muted/30">
                <SchemaFieldsEditor title="Schéma d'entrée (données nécessaires à l'IA)" fields={uc.input_schema || []} onChange={(input_schema) => patchUc(uc.key, { input_schema })} />
                <SchemaFieldsEditor title="Schéma de sortie (ce que l'IA doit retourner)" fields={uc.output_schema || []} onChange={(output_schema) => patchUc(uc.key, { output_schema })} />
                <div className="rounded-lg border border-border bg-background p-3 space-y-3">
                  <div><div className="font-medium text-sm">Configuration RAG du use case</div><p className="text-xs text-muted-foreground">Cette collection est prioritaire sur la configuration RAG du module.</p></div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1.5"><Label className="text-xs">Collection</Label><Select value={uc.rag_config?.collection || "none"} onValueChange={(v) => patchUc(uc.key, { rag_config: { ...(uc.rag_config || {}), enabled: v !== "none", collection: v === "none" ? "" : v } })}><SelectTrigger className="h-9"><SelectValue placeholder="Aucune" /></SelectTrigger><SelectContent><SelectItem value="none">Aucune collection</SelectItem>{collections.filter((c) => !c.status || c.status === "active").map((c) => <SelectItem key={c.id} value={c.collection_name}>{c.name} ({c.collection_name})</SelectItem>)}</SelectContent></Select></div>
                    <div className="space-y-1.5"><Label className="text-xs">Knowledge Base ID</Label><Input className="h-9 font-mono text-xs" value={uc.rag_config?.knowledge_base_id || ""} onChange={(e) => patchUc(uc.key, { rag_config: { ...(uc.rag_config || {}), knowledge_base_id: e.target.value } })} placeholder="kb-gpr-regulatory" /></div>
                    <div className="space-y-1.5"><Label className="text-xs">Top K</Label><Input className="h-9" type="number" min="1" max="20" value={uc.rag_config?.top_k || 5} onChange={(e) => patchUc(uc.key, { rag_config: { ...(uc.rag_config || {}), top_k: Number(e.target.value) || 5 } })} /></div>
                  </div>
                  {uc.rag_config?.enabled && <Badge variant="secondary">RAG actif · {uc.rag_config.collection}</Badge>}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Type d'analyse</Label>
                    <Select value={uc.type} onValueChange={(v) => patchUc(uc.key, { type: v })}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>{USE_CASE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Prompt associé (nom)</Label>
                    <Input className="h-9 font-mono text-sm" value={uc.prompt_name || ""} onChange={(e) => patchUc(uc.key, { prompt_name: e.target.value })} />
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nouveau AI Use Case</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label htmlFor="un">Nom *</Label><Input id="un" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, prompt_name: form.prompt_name || featureKeyOf(e.target.value) })} placeholder="Risk Analysis" /></div>
              <div className="space-y-1.5"><Label htmlFor="ut">Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger id="ut"><SelectValue /></SelectTrigger>
                  <SelectContent>{USE_CASE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label htmlFor="uf">Fonctionnalité</Label>
                <Select value={form.feature_key} onValueChange={(v) => setForm({ ...form, feature_key: v })}>
                  <SelectTrigger id="uf"><SelectValue placeholder="(optionnel)" /></SelectTrigger>
                  <SelectContent>{features.map((f) => <SelectItem key={f.key} value={f.key}>{f.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label htmlFor="up">Identifiant / Prompt</Label><Input id="up" className="font-mono text-sm" value={form.prompt_name} onChange={(e) => setForm({ ...form, prompt_name: e.target.value })} placeholder="risk-analysis" /></div>
            </div>
            <div className="space-y-1.5"><Label htmlFor="ud">Description</Label><Textarea id="ud" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>Annuler</Button><Button onClick={add} disabled={!form.name.trim() || busy}>{busy ? "Enregistrement…" : "Créer le Use Case"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}