import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import StatusBadge from "@/components/StatusBadge";
import { Plus, Trash2, Pencil, Rocket } from "lucide-react";

export default function CorePromptsManager() {
  const { toast } = useToast();
  const [items, setItems] = useState(null);
  const [modules, setModules] = useState([]);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    setItems(await base44.entities.Prompt.list("-created_date", 100));
    setModules(await base44.entities.Module.list());
  };
  useEffect(() => { load(); }, []);

  const save = async (d) => {
    const rec = { name: d.name, version: d.version || "1.0.0", description: d.description || "", instructions: d.instructions, variables: (d.variables || "").split(",").map((v) => v.trim()).filter(Boolean), status: "draft", use_case: d.use_case || "" };
    if (editing?.id) { await base44.entities.Prompt.update(editing.id, rec); toast({ title: "Prompt mis à jour" }); }
    else { await base44.entities.Prompt.create(rec); toast({ title: "Prompt créé (draft)" }); }
    setEditing(null); load();
  };
  const remove = async (p) => { await base44.entities.Prompt.delete(p.id); load(); };
  const publish = async (p) => {
    const sameName = (items || []).filter((x) => x.name === p.name && x.id !== p.id && x.status === "active");
    if (sameName.length) await base44.entities.Prompt.bulkUpdate(sameName.map((s) => ({ id: s.id, status: "deprecated" })));
    await base44.entities.Prompt.update(p.id, { status: "active" });
    toast({ title: "Prompt publié", description: `v${p.version} est désormais la version active de « ${p.name} ».` });
    load();
  };

  const grouped = {};
  (items || []).forEach((p) => { (grouped[p.name] = grouped[p.name] || []).push(p); });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">Une AI Execution identifie toujours <code>prompt_id</code> + <code>prompt_version</code>. Publier une version la rend active et déprécie les autres du même nom.</p>
        <Button onClick={() => setEditing({})}><Plus className="h-4 w-4 mr-1.5" /> Nouveau prompt</Button>
      </div>
      {Object.keys(grouped).length === 0 && items && <p className="text-sm text-muted-foreground">Aucun prompt.</p>}
      {Object.entries(grouped).map(([name, versions]) => (
        <Card key={name}><CardContent className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="font-medium">{name}</div>
            <Badge variant="outline">{versions.length} version(s)</Badge>
          </div>
          <div className="space-y-1.5">
            {versions.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 rounded-md border border-border p-2.5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap"><Badge variant="secondary" className="font-mono">v{p.version}</Badge><StatusBadge status={p.status} /></div>
                  <div className="text-xs text-muted-foreground mt-1 truncate">{(p.instructions || "").slice(0, 120) || "—"}</div>
                </div>
                <div className="flex items-center gap-1.5">
                  {p.status !== "active" && <Button size="sm" variant="outline" onClick={() => publish(p)}><Rocket className="h-3.5 w-3.5 mr-1" /> Publier</Button>}
                  <Button size="sm" variant="ghost" onClick={() => setEditing(p)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(p)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent></Card>
      ))}
      {editing && <PromptDialog initial={editing} modules={modules} onClose={() => setEditing(null)} onSave={save} />}
    </div>
  );
}

function PromptDialog({ initial, modules, onClose, onSave }) {
  const [f, setF] = useState({ name: initial.name || "", version: initial.version || "1.0.0", description: initial.description || "", instructions: initial.instructions || "", variables: (initial.variables || []).join(", "), use_case: initial.use_case || "" });

  const getUseCaseOptions = () => {
    const opts = [];
    (modules || []).forEach(m => {
      (m.use_cases || []).forEach(uc => {
        opts.push({ value: `${m.module_key}:${uc.key}`, label: `${m.name} - ${uc.name}` });
      });
    });
    return opts;
  };
  
  return (
    <Dialog open onOpenChange={onClose}><DialogContent className="max-w-2xl">
      <DialogHeader><DialogTitle>{initial.id ? "Modifier le prompt" : "Nouveau prompt"}</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Nom</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Risk Analysis" /></div>
          <div><Label>Version</Label><Input value={f.version} onChange={(e) => setF({ ...f, version: e.target.value })} placeholder="1.0.0" /></div>
        </div>
        <div>
          <Label>Use case (clé)</Label>
          <Select value={f.use_case} onValueChange={(v) => setF({ ...f, use_case: v })}>
            <SelectTrigger><SelectValue placeholder="Sélectionner le cas d'usage associé..." /></SelectTrigger>
            <SelectContent>
              {getUseCaseOptions().map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div><Label>Variables (séparées par virgules)</Label><Input value={f.variables} onChange={(e) => setF({ ...f, variables: e.target.value })} placeholder="titre, processus" /></div>
        <div><Label>Instructions</Label><Textarea rows={10} value={f.instructions} onChange={(e) => setF({ ...f, instructions: e.target.value })} placeholder="Analyse le risque… Utilise {{titre}}." /></div>
      </div>
      <DialogFooter><Button variant="outline" onClick={onClose}>Annuler</Button><Button onClick={() => onSave(f)} disabled={!f.name || !f.instructions}>Enregistrer</Button></DialogFooter>
    </DialogContent></Dialog>
  );
}