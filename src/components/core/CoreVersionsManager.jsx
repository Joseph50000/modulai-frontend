import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import StatusBadge from "@/components/StatusBadge";
import { Plus, Trash2, CheckCircle2 } from "lucide-react";
import { getCoreSettings } from "@/core/ai/coreConfig";

export default function CoreVersionsManager() {
  const { toast } = useToast();
  const [items, setItems] = useState(null);
  const [current, setCurrent] = useState("");
  const [editing, setEditing] = useState(null);

  const load = async () => {
    setItems(await base44.entities.CoreVersion.list("-version", 100));
    const s = await getCoreSettings();
    setCurrent(s.current_core_version || "");
  };
  useEffect(() => { load(); }, []);

  const save = async (d) => {
    const rec = { version: d.version, status: d.status || "draft", changelog: d.changes || "" };
    if (editing?.id) { await base44.entities.CoreVersion.update(editing.id, rec); toast({ title: "Version mise à jour" }); }
    else { await base44.entities.CoreVersion.create(rec); toast({ title: "Version créée" }); }
    setEditing(null); load();
  };
  const remove = async (v) => { await base44.entities.CoreVersion.delete(v.id); load(); };
  const setCurrentVersion = async (v) => {
    await base44.entities.CoreVersion.update(v.id, { is_latest: true, status: "active", release_date: new Date().toISOString() });
    const others = (items || []).filter((x) => x.id !== v.id && x.is_latest);
    if (others.length > 0) {
      await Promise.all(others.map(o => base44.entities.CoreVersion.update(o.id, { is_latest: false })));
    }
    const s = await getCoreSettings();
    await base44.entities.CoreSettings.update(s.id, { current_core_version: v.version });
    toast({ title: "Version courante", description: `Le Core utilise désormais v${v.version}.` });
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">Chaque projet reste lié à sa version du Core. Une mise à jour ne casse pas les projets existants. Version courante : <Badge variant="secondary" className="font-mono">v{current}</Badge></p>
        <Button onClick={() => setEditing({})}><Plus className="h-4 w-4 mr-1.5" /> Nouvelle version</Button>
      </div>
      <div className="grid gap-3">
        {items?.map((v) => (
          <Card key={v.id}><CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap"><Badge variant="secondary" className="font-mono">v{v.version}</Badge><StatusBadge status={v.status} />{v.is_latest && <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200"><CheckCircle2 className="h-3 w-3 mr-1" /> Courante</Badge>}</div>
              <div className="text-xs text-muted-foreground mt-1">{v.changelog || "—"}</div>
            </div>
            <div className="flex items-center gap-1.5">
              {!v.is_latest && <Button size="sm" variant="outline" onClick={() => setCurrentVersion(v)}>Définir courante</Button>}
              <Button size="sm" variant="ghost" onClick={() => setEditing(v)}>Éditer</Button>
              <Button size="sm" variant="ghost" onClick={() => remove(v)}><Trash2 className="h-3.5 w-3.5" /></Button>
            </div>
          </CardContent></Card>
        ))}
      </div>
      {editing && <VersionDialog initial={editing} onClose={() => setEditing(null)} onSave={save} />}
    </div>
  );
}

function VersionDialog({ initial, onClose, onSave }) {
  const [f, setF] = useState({ version: initial.version || "1.0.0", status: initial.status || "draft", changes: initial.changelog || "" });
  return (
    <Dialog open onOpenChange={onClose}><DialogContent>
      <DialogHeader><DialogTitle>{initial.id ? "Modifier la version" : "Nouvelle version du Core"}</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div><Label>Version</Label><Input value={f.version} onChange={(e) => setF({ ...f, version: e.target.value })} placeholder="1.1.0" /></div>
        <div><Label>Statut</Label><Select value={f.status} onValueChange={(v) => setF({ ...f, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="released">Released</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="archived">Archived</SelectItem></SelectContent></Select></div>
        <div><Label>Changements</Label><Textarea rows={4} value={f.changes} onChange={(e) => setF({ ...f, changes: e.target.value })} placeholder="Ajout du model routing…" /></div>
      </div>
      <DialogFooter><Button variant="outline" onClick={onClose}>Annuler</Button><Button onClick={() => onSave(f)} disabled={!f.version}>Enregistrer</Button></DialogFooter>
    </DialogContent></Dialog>
  );
}