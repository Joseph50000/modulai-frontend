import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Database, Plus, Pencil, Trash2, RefreshCw } from "lucide-react";

const EMPTY = { name: "", collection_name: "", description: "", project_id: "", module_id: "", knowledge_base_id: "", embedding_model: "paraphrase-multilingual-MiniLM-L12-v2", distance_metric: "cosine", status: "active" };

export default function RagCollectionsManager() {
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try { setItems(await base44.entities.RagCollection.list("-created_date", 200)); }
    catch (err) { toast({ title: "Collections indisponibles", description: err.message, variant: "destructive" }); }
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.name.trim() || !form.collection_name.trim()) return;
    try {
      setBusy(true);
      const payload = { ...form, name: form.name.trim(), collection_name: form.collection_name.trim() };
      if (editing) await base44.entities.RagCollection.update(editing.id, payload);
      else await base44.entities.RagCollection.create(payload);
      setOpen(false); setEditing(null); setForm(EMPTY); await load();
      toast({ title: editing ? "Collection mise à jour" : "Collection créée" });
    } catch (err) { toast({ title: "Enregistrement impossible", description: err.response?.data?.error || err.message, variant: "destructive" }); }
    finally { setBusy(false); }
  };

  const remove = async (item) => {
    if (!window.confirm(`Supprimer la collection « ${item.name} » ? Les vecteurs Chroma ne sont pas supprimés automatiquement.`)) return;
    try { await base44.entities.RagCollection.delete(item.id); await load(); toast({ title: "Collection supprimée" }); }
    catch (err) { toast({ title: "Suppression impossible", description: err.message, variant: "destructive" }); }
  };

  const startEdit = (item) => { setEditing(item); setForm({ ...EMPTY, ...item }); setOpen(true); };
  const startCreate = () => { setEditing(null); setForm(EMPTY); setOpen(true); };
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div><h3 className="font-heading font-semibold flex items-center gap-2"><Database className="h-4 w-4 text-primary" /> Collections vectorielles</h3><p className="text-xs text-muted-foreground mt-1">Déclarez les collections Chroma disponibles pour vos Knowledge Bases et use cases.</p></div>
          <div className="flex gap-2"><Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Actualiser</Button><Button size="sm" onClick={startCreate}><Plus className="h-3.5 w-3.5 mr-1.5" /> Nouvelle collection</Button></div>
        </div>
        {items.length === 0 ? <p className="text-sm text-muted-foreground border border-dashed rounded-lg p-5 text-center">Aucune collection déclarée.</p> : <div className="space-y-2">{items.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border p-3 flex-wrap"><div className="min-w-0"><div className="flex items-center gap-2 flex-wrap"><span className="font-medium">{item.name}</span><Badge variant="outline" className="font-mono text-xs">{item.collection_name}</Badge><Badge variant={item.status === "active" ? "secondary" : "outline"}>{item.status || "active"}</Badge></div><p className="text-xs text-muted-foreground mt-1">{item.description || "Sans description"} · {item.embedding_model || "modèle par défaut"} · {item.distance_metric || "cosine"}</p></div><div className="flex gap-1"><Button variant="ghost" size="sm" onClick={() => startEdit(item)}><Pencil className="h-3.5 w-3.5" /></Button><Button variant="ghost" size="sm" className="text-destructive" onClick={() => remove(item)}><Trash2 className="h-3.5 w-3.5" /></Button></div></div>)}</div>}
        {open && <div className="rounded-lg border bg-muted/30 p-4 space-y-3"><div className="flex items-center justify-between"><h4 className="font-medium">{editing ? "Modifier la collection" : "Nouvelle collection"}</h4><Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Fermer</Button></div><div className="grid md:grid-cols-2 gap-3"><div className="space-y-1.5"><Label>Nom *</Label><Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Réglementation réclamations" /></div><div className="space-y-1.5"><Label>Nom physique Chroma *</Label><Input className="font-mono" value={form.collection_name} onChange={(e) => set("collection_name", e.target.value)} placeholder="gpr_claims_regulatory" /></div><div className="space-y-1.5 md:col-span-2"><Label>Description</Label><Textarea rows={2} value={form.description} onChange={(e) => set("description", e.target.value)} /></div><div className="space-y-1.5"><Label>Project ID</Label><Input className="font-mono" value={form.project_id} onChange={(e) => set("project_id", e.target.value)} placeholder="demo-gpr-bank-project" /></div><div className="space-y-1.5"><Label>Knowledge Base ID</Label><Input className="font-mono" value={form.knowledge_base_id} onChange={(e) => set("knowledge_base_id", e.target.value)} /></div><div className="space-y-1.5"><Label>Embedding model</Label><Input className="font-mono text-xs" value={form.embedding_model} onChange={(e) => set("embedding_model", e.target.value)} /></div><div className="space-y-1.5"><Label>Distance metric</Label><Input value={form.distance_metric} onChange={(e) => set("distance_metric", e.target.value)} placeholder="cosine" /></div></div><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button><Button onClick={save} disabled={busy || !form.name.trim() || !form.collection_name.trim()}>{busy ? "Enregistrement…" : "Enregistrer"}</Button></div></div>}
      </CardContent>
    </Card>
  );
}
