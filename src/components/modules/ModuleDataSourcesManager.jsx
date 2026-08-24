import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, Database, FileText, Boxes, Plug, History } from "lucide-react";
import { useState } from "react";

const TYPE_ICON = {
  database: Database, documents: FileText, vector_store: Boxes, api: Plug, history: History,
};

export default function ModuleDataSourcesManager({ module, updateModule }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", type: "database", enabled: true });
  const sources = module.data_sources || [];

  const toggle = async (i) => updateModule({ data_sources: sources.map((s, idx) => (idx === i ? { ...s, enabled: !s.enabled } : s)) });
  const remove = async (i) => updateModule({ data_sources: sources.filter((_, idx) => idx !== i) });
  const add = async () => {
    if (!form.name.trim()) return;
    await updateModule({ data_sources: [...sources, { name: form.name.trim(), type: form.type, enabled: true }] });
    setForm({ name: "", type: "database", enabled: true });
    setOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Déclarez les sources de données dont le module a besoin pour alimenter l'IA.</p>
        <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1.5" /> Ajouter une source</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {sources.length === 0 && <div className="text-sm text-muted-foreground col-span-2 text-center py-8 border border-dashed border-border rounded-xl">Aucune source.</div>}
        {sources.map((s, i) => {
          const Icon = TYPE_ICON[s.type] || Database;
          return (
            <div key={i} className="flex items-center gap-3 rounded-lg border border-border p-4">
              <div className="h-9 w-9 rounded-lg bg-muted grid place-items-center"><Icon className="h-4 w-4 text-muted-foreground" /></div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{s.name}</div>
                <div className="text-xs text-muted-foreground font-mono">{s.type}</div>
              </div>
              <Switch checked={!!s.enabled} onCheckedChange={() => toggle(i)} />
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => remove(i)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          );
        })}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Nouvelle source de données</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Label htmlFor="sname">Nom</Label><Input id="sname" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Knowledge base contrats" /></div>
            <div className="space-y-1.5"><Label htmlFor="stype">Type</Label>
              <div className="text-xs text-muted-foreground bg-muted/50 rounded-md p-2">database · documents · vector_store · api · history</div>
              <Input id="stype" className="font-mono text-sm" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} />
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button><Button onClick={add} disabled={!form.name.trim()}>Ajouter</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}