import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import StatusBadge from "@/components/StatusBadge";
import { Plus, Trash2, Pencil } from "lucide-react";

const STORES = ["pgvector", "pinecone", "qdrant", "weaviate", "chroma"];

export default function KnowledgeBasesManager() {
  const { toast } = useToast();
  const [items, setItems] = useState(null);
  const [projects, setProjects] = useState([]);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    setItems(await base44.entities.KnowledgeBase.list("-created_date", 100));
    setProjects(await base44.entities.Project.list());
  };
  useEffect(() => { load(); }, []);

  const save = async (d) => {
    const rec = { name: d.name, description: d.description || "", project_id: d.project_id || "", module_id: "", vector_store: d.vector_store, embedding_model: d.embedding_model || "", status: d.status, documents_count: Number(d.documents_count) || 0, embeddings_count: Number(d.embeddings_count) || 0 };
    if (editing?.id) { await base44.entities.KnowledgeBase.update(editing.id, rec); toast({ title: "Knowledge Base mise à jour" }); }
    else { await base44.entities.KnowledgeBase.create(rec); toast({ title: "Knowledge Base créée" }); }
    setEditing(null); load();
  };
  const remove = async (k) => { await base44.entities.KnowledgeBase.delete(k.id); load(); };
  const projectName = (id) => (projects.find((p) => p.id === id) || {}).name || "Globale";

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">L'isolation des données est respectée : une KB liée à un projet n'est accessible qu'à ce projet (sauf KB globale).</p>
        <Button onClick={() => setEditing({})}><Plus className="h-4 w-4 mr-1.5" /> Créer une Knowledge Base</Button>
      </div>
      <div className="grid gap-3">
        {items?.map((k) => (
          <Card key={k.id}><CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap"><span className="font-medium">{k.name}</span><StatusBadge status={k.status} /><Badge variant="outline">{k.vector_store}</Badge></div>
              <div className="text-xs text-muted-foreground mt-1">
                Projet : {projectName(k.project_id)} · Docs : {k.documents_count || 0} · Embeddings : {k.embeddings_count || 0} · Embedding model : {k.embedding_model || "—"}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <Button size="sm" variant="ghost" onClick={() => setEditing(k)}><Pencil className="h-3.5 w-3.5" /></Button>
              <Button size="sm" variant="ghost" onClick={() => remove(k)}><Trash2 className="h-3.5 w-3.5" /></Button>
            </div>
          </CardContent></Card>
        ))}
      </div>
      {editing && <KbDialog initial={editing} projects={projects} onClose={() => setEditing(null)} onSave={save} />}
    </div>
  );
}

function KbDialog({ initial, projects, onClose, onSave }) {
  const [f, setF] = useState({ name: initial.name || "", description: initial.description || "", project_id: initial.project_id || "", vector_store: initial.vector_store || "pgvector", embedding_model: initial.embedding_model || "", status: initial.status || "active", documents_count: initial.documents_count || 0, embeddings_count: initial.embeddings_count || 0 });
  return (
    <Dialog open onOpenChange={onClose}><DialogContent>
      <DialogHeader><DialogTitle>{initial.id ? "Modifier la Knowledge Base" : "Nouvelle Knowledge Base"}</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div><Label>Nom</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Risk Management KB" /></div>
        <div><Label>Description</Label><Input value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
        <div><Label>Projet (isolation) — laisser vide pour globale</Label>
          <Select value={f.project_id || "__global"} onValueChange={(v) => setF({ ...f, project_id: v === "__global" ? "" : v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="__global">Globale</SelectItem>{projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Vector Store</Label><Select value={f.vector_store} onValueChange={(v) => setF({ ...f, vector_store: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{STORES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>Embedding model</Label><Input value={f.embedding_model} onChange={(e) => setF({ ...f, embedding_model: e.target.value })} placeholder="text-embedding-3-small" /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Documents (count)</Label><Input type="number" value={f.documents_count} onChange={(e) => setF({ ...f, documents_count: e.target.value })} /></div>
          <div><Label>Embeddings (count)</Label><Input type="number" value={f.embeddings_count} onChange={(e) => setF({ ...f, embeddings_count: e.target.value })} /></div>
        </div>
      </div>
      <DialogFooter><Button variant="outline" onClick={onClose}>Annuler</Button><Button onClick={() => onSave(f)} disabled={!f.name}>Enregistrer</Button></DialogFooter>
    </DialogContent></Dialog>
  );
}