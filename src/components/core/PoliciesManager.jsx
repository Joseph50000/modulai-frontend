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
import { Plus, Trash2, Pencil } from "lucide-react";

const SCOPES = [
  { value: "global", label: "Global" },
  { value: "project", label: "Projet" },
  { value: "module", label: "Module" },
  { value: "usecase", label: "Use Case" },
];

export default function PoliciesManager() {
  const { toast } = useToast();
  const [items, setItems] = useState(null);
  const [models, setModels] = useState([]);
  const [projects, setProjects] = useState([]);
  const [modules, setModules] = useState([]);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    setItems(await base44.entities.AiPolicy.list("-created_date", 100));
    setModels(await base44.entities.AiModel.list());
    setProjects(await base44.entities.Project.list());
    setModules(await base44.entities.Module.list());
  };
  useEffect(() => { load(); }, []);

  const save = async (d) => {
    const rec = { name: d.name, scope: d.scope, scope_ref: d.scope_ref || "", max_tokens: d.max_tokens ? Number(d.max_tokens) : null, temperature_max: d.temperature_max ? Number(d.temperature_max) : null, max_execution_time: d.max_execution_time ? Number(d.max_execution_time) : null, fallback_model_id: d.fallback_model_id || "", rag_required: !!d.rag_required, human_validation_required: !!d.human_validation_required, status: d.status };
    if (editing?.id) { await base44.entities.AiPolicy.update(editing.id, rec); toast({ title: "Policy mise à jour" }); }
    else { await base44.entities.AiPolicy.create(rec); toast({ title: "Policy créée" }); }
    setEditing(null); load();
  };
  const remove = async (p) => { await base44.entities.AiPolicy.delete(p.id); load(); };
  const toggle = async (p) => { await base44.entities.AiPolicy.update(p.id, { status: p.status === "active" ? "disabled" : "active" }); load(); };

  const fallbackName = (id) => (models.find((m) => m.id === id) || {}).name || "—";

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">Une policy contrôle le comportement du Core. La règle la plus spécifique (Use Case &gt; Module &gt; Projet &gt; Global) prend le dessus.</p>
        <Button onClick={() => setEditing({})}><Plus className="h-4 w-4 mr-1.5" /> Nouvelle policy</Button>
      </div>
      <div className="grid gap-3">
        {items?.map((p) => (
          <Card key={p.id}><CardContent className="p-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap"><span className="font-medium">{p.name}</span><Badge variant="outline">{p.scope}</Badge>{p.scope_ref && <Badge variant="secondary" className="font-mono">{p.scope_ref}</Badge>}<StatusBadge status={p.status} /></div>
                <div className="text-xs text-muted-foreground mt-1">
                  max_tokens : {p.max_tokens || "—"} • temp_max : {p.temperature_max ?? "—"} • exec_time : {p.max_execution_time || "—"} • fallback : {fallbackName(p.fallback_model_id)}
                </div>
                <div className="flex gap-1.5 mt-1">
                  {p.rag_required && <Badge variant="outline" className="font-normal">RAG requis</Badge>}
                  {p.human_validation_required && <Badge variant="outline" className="font-normal">Validation humaine</Badge>}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Button size="sm" variant="outline" onClick={() => toggle(p)}>{p.status === "active" ? "Désactiver" : "Activer"}</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(p)}><Pencil className="h-3.5 w-3.5" /></Button>
                <Button size="sm" variant="ghost" onClick={() => remove(p)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          </CardContent></Card>
        ))}
      </div>
      {editing && <PolicyDialog initial={editing} models={models} projects={projects} modules={modules} onClose={() => setEditing(null)} onSave={save} />}
    </div>
  );
}

function PolicyDialog({ initial, models, projects, modules, onClose, onSave }) {
  const [f, setF] = useState({
    name: initial.name || "", scope: initial.scope || "global", scope_ref: initial.scope_ref || "",
    max_tokens: initial.max_tokens || "", temperature_max: initial.temperature_max ?? "",
    max_execution_time: initial.max_execution_time || "", fallback_model_id: initial.fallback_model_id || "",
    rag_required: initial.rag_required || false, human_validation_required: initial.human_validation_required || false,
    status: initial.status || "active",
  });

  const getReferenceOptions = () => {
    if (f.scope === "project") return projects.map(p => ({ value: p.id, label: p.name }));
    if (f.scope === "module") return modules.map(m => ({ value: m.id, label: m.name }));
    if (f.scope === "usecase") {
      const opts = [];
      modules.forEach(m => {
        (m.use_cases || []).forEach(uc => {
          opts.push({ value: `${m.module_key}:${uc.key}`, label: `${m.name} - ${uc.name}` });
        });
      });
      return opts;
    }
    return [];
  };

  return (
    <Dialog open onOpenChange={onClose}><DialogContent className="max-w-lg">
      <DialogHeader><DialogTitle>{initial.id ? "Modifier la policy" : "Nouvelle policy"}</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div><Label>Nom</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Global conservative" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Scope</Label><Select value={f.scope} onValueChange={(v) => setF({ ...f, scope: v, scope_ref: "" })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{SCOPES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>Référence</Label>
            {f.scope === "global" ? (
              <Input value="" placeholder="(non requis)" disabled />
            ) : (
              <Select value={f.scope_ref} onValueChange={(v) => setF({ ...f, scope_ref: v })}>
                <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                <SelectContent>
                  {getReferenceOptions().map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div><Label>Max tokens</Label><Input type="number" value={f.max_tokens} onChange={(e) => setF({ ...f, max_tokens: e.target.value })} /></div>
          <div><Label>Température max</Label><Input type="number" step="0.1" value={f.temperature_max} onChange={(e) => setF({ ...f, temperature_max: e.target.value })} /></div>
          <div><Label>Exec max (ms)</Label><Input type="number" value={f.max_execution_time} onChange={(e) => setF({ ...f, max_execution_time: e.target.value })} /></div>
        </div>
        <div><Label>Modèle de fallback (Model Routing)</Label>
          <Select value={f.fallback_model_id} onValueChange={(v) => setF({ ...f, fallback_model_id: v === "__none" ? "" : v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="__none">Aucun</SelectItem>{models.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent></Select>
        </div>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm"><Checkbox checked={f.rag_required} onCheckedChange={(c) => setF({ ...f, rag_required: c })} /> RAG requis</label>
          <label className="flex items-center gap-2 text-sm"><Checkbox checked={f.human_validation_required} onCheckedChange={(c) => setF({ ...f, human_validation_required: c })} /> Validation humaine</label>
        </div>
        <div><Label>Statut</Label><Select value={f.status} onValueChange={(v) => setF({ ...f, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="disabled">Désactivée</SelectItem></SelectContent></Select></div>
      </div>
      <DialogFooter><Button variant="outline" onClick={onClose}>Annuler</Button><Button onClick={() => onSave(f)} disabled={!f.name}>Enregistrer</Button></DialogFooter>
    </DialogContent></Dialog>
  );
}