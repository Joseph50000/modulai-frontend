import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import StatusBadge from "@/components/StatusBadge";
import { Plus, Trash2, Pencil, Star } from "lucide-react";
import { getCoreSettings } from "@/core/ai/coreConfig";

const CAPS = [
  { value: "text_generation", label: "Text generation" },
  { value: "structured_output", label: "Structured output" },
  { value: "vision", label: "Vision" },
  { value: "tool_calling", label: "Tool calling" },
];

export default function ModelsManager() {
  const { toast } = useToast();
  const [items, setItems] = useState(null);
  const [providers, setProviders] = useState([]);
  const [defaultId, setDefaultId] = useState("");
  const [editing, setEditing] = useState(null);

  const load = async () => {
    const [ms, ps] = await Promise.all([base44.entities.AiModel.list("-created_date", 100), base44.entities.AiProvider.list()]);
    setItems(ms); setProviders(ps.filter((p) => p.status === "active"));
    const settings = await getCoreSettings();
    setDefaultId(settings.default_model_id || "");
  };
  useEffect(() => { load(); }, []);

  const save = async (d) => {
    const prov = providers.find((p) => p.id === d.provider_id);
    const rec = { name: d.name, provider_id: d.provider_id, provider_name: prov?.name || "", model_id: d.model_id, version: d.version, context_window: Number(d.context_window) || 0, max_output_tokens: Number(d.max_output_tokens) || 0, temperature: Number(d.temperature) || 0, capabilities: d.capabilities, status: d.status };
    if (editing?.id) { await base44.entities.AiModel.update(editing.id, rec); toast({ title: "Modèle mis à jour" }); }
    else { await base44.entities.AiModel.create(rec); toast({ title: "Modèle créé" }); }
    setEditing(null); load();
  };
  const remove = async (m) => { await base44.entities.AiModel.delete(m.id); load(); };
  const setDefault = async (m) => {
    await base44.entities.AiModel.update(m.id, { is_default: true });
    const others = (items || []).filter((x) => x.id !== m.id && x.is_default);
    await base44.entities.AiModel.bulkUpdate(others.map((o) => ({ id: o.id, is_default: false })));
    const settings = await getCoreSettings();
    await base44.entities.CoreSettings.update(settings.id, { default_model_id: m.id, default_model_name: m.name });
    toast({ title: "Modèle par défaut", description: `${m.name} sera utilisé par toutes les exécutions (sauf policy contraire).` });
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button onClick={() => setEditing({})}><Plus className="h-4 w-4 mr-1.5" /> Ajouter un modèle</Button></div>
      {!items && <p className="text-sm text-muted-foreground">Chargement…</p>}
      <div className="grid gap-3">
        {items?.map((m) => (
          <Card key={m.id}><CardContent className="p-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{m.name}</span>
                  <Badge variant="outline" className="font-mono">{m.model_id}</Badge>
                  {m.version && <Badge variant="secondary" className="font-mono">v{m.version}</Badge>}
                  <StatusBadge status={m.status} />
                  {defaultId === m.id && <Badge className="bg-amber-100 text-amber-800 border-amber-200"><Star className="h-3 w-3 mr-1" /> Défaut Core</Badge>}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Provider : {m.provider_name || "—"} · Context : {m.context_window || "—"} tokens · Max output : {m.max_output_tokens || "—"} · Temp : {m.temperature ?? "—"}
                </div>
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  {(m.capabilities || []).map((c) => <Badge key={c} variant="outline" className="font-normal">{c}</Badge>)}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {defaultId !== m.id && <Button size="sm" variant="outline" onClick={() => setDefault(m)}><Star className="h-3.5 w-3.5 mr-1" /> Définir défaut</Button>}
                <Button size="sm" variant="ghost" onClick={() => setEditing(m)}><Pencil className="h-3.5 w-3.5" /></Button>
                <Button size="sm" variant="ghost" onClick={() => remove(m)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          </CardContent></Card>
        ))}
      </div>
      {editing && <ModelDialog initial={editing} providers={providers} onClose={() => setEditing(null)} onSave={save} />}
    </div>
  );
}

function ModelDialog({ initial, providers, onClose, onSave }) {
  const [f, setF] = useState({
    name: initial.name || "", provider_id: initial.provider_id || "", model_id: initial.model_id || "",
    version: initial.version || "", context_window: initial.context_window || 4096,
    max_output_tokens: initial.max_output_tokens || 1024, temperature: initial.temperature ?? 0.2,
    status: initial.status || "active", capabilities: initial.capabilities || [],
  });
  const toggleCap = (c) => setF((s) => ({ ...s, capabilities: s.capabilities.includes(c) ? s.capabilities.filter((x) => x !== c) : [...s.capabilities, c] }));

  return (
    <Dialog open onOpenChange={onClose}><DialogContent className="max-w-lg">
      <DialogHeader><DialogTitle>{initial.id ? "Modifier le modèle" : "Nouveau modèle"}</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div><Label>Nom</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="GPT-5 Mini" /></div>
        <div><Label>Provider</Label>
          <Select value={f.provider_id} onValueChange={(v) => setF({ ...f, provider_id: v })}><SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger><SelectContent>{providers.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Model ID</Label><Input value={f.model_id} onChange={(e) => setF({ ...f, model_id: e.target.value })} placeholder="gpt_5_mini" /></div>
          <div><Label>Version</Label><Input value={f.version} onChange={(e) => setF({ ...f, version: e.target.value })} placeholder="1.0" /></div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div><Label>Context window</Label><Input type="number" value={f.context_window} onChange={(e) => setF({ ...f, context_window: e.target.value })} /></div>
          <div><Label>Max output</Label><Input type="number" value={f.max_output_tokens} onChange={(e) => setF({ ...f, max_output_tokens: e.target.value })} /></div>
          <div><Label>Température</Label><Input type="number" step="0.1" value={f.temperature} onChange={(e) => setF({ ...f, temperature: e.target.value })} /></div>
        </div>
        <div><Label>Capabilities</Label>
          <div className="grid grid-cols-2 gap-2 mt-1">
            {CAPS.map((c) => (
              <label key={c.value} className="flex items-center gap-2 text-sm"><Checkbox checked={f.capabilities.includes(c.value)} onCheckedChange={() => toggleCap(c.value)} /> {c.label}</label>
            ))}
          </div>
        </div>
        <div><Label>Statut</Label>
          <Select value={f.status} onValueChange={(v) => setF({ ...f, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Actif</SelectItem><SelectItem value="inactive">Inactif</SelectItem></SelectContent></Select>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Annuler</Button>
        <Button onClick={() => onSave(f)} disabled={!f.name || !f.provider_id || !f.model_id}>Enregistrer</Button>
      </DialogFooter>
    </DialogContent></Dialog>
  );
}