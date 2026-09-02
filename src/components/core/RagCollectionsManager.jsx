import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Database, Plus, Pencil, Trash2, RefreshCw, Layers3 } from "lucide-react";
import { inspectCollection } from "@/core/ai/ragLayer";

const EMPTY = { name: "", collection_name: "", description: "", project_id: "", module_id: "", knowledge_base_id: "", embedding_model: "paraphrase-multilingual-MiniLM-L12-v2", distance_metric: "cosine", status: "active" };

export default function RagCollectionsManager({ onCollectionChange }) {
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [projects, setProjects] = useState([]);
  const [knowledgeBases, setKnowledgeBases] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [inspected, setInspected] = useState(null);
  const load = async () => {
    try {
      const [collections, projectList, kbList] = await Promise.all([
        base44.entities.RagCollection.list("-created_date", 200),
        base44.entities.Project.list("-created_date", 200),
        base44.entities.KnowledgeBase.list("-created_date", 200),
      ]);
      setItems(collections); setProjects(projectList); setKnowledgeBases(kbList);
    } catch (err) { toast({ title: "Collections indisponibles", description: err.message, variant: "destructive" }); }
  };
  useEffect(() => { load(); }, []);
  const save = async () => {
    if (!form.name.trim() || !form.collection_name.trim()) return;
    try { setBusy(true); const payload = { ...form, project_id: form.project_id === "__none__" ? "" : form.project_id, knowledge_base_id: form.knowledge_base_id === "__none__" ? "" : form.knowledge_base_id, name: form.name.trim(), collection_name: form.collection_name.trim() }; if (editing) await base44.entities.RagCollection.update(editing.id, payload); else await base44.entities.RagCollection.create(payload); setOpen(false); setEditing(null); setForm(EMPTY); await load(); toast({ title: editing ? "Collection mise à jour" : "Collection créée" }); }
    catch (err) { toast({ title: "Enregistrement impossible", description: err.response?.data?.error || err.message, variant: "destructive" }); }
    finally { setBusy(false); }
  };
  const remove = async (item) => { if (!window.confirm(`Supprimer la collection « ${item.name} » ? Les vecteurs Chroma ne sont pas supprimés automatiquement.`)) return; try { await base44.entities.RagCollection.delete(item.id); await load(); toast({ title: "Collection supprimée" }); } catch (err) { toast({ title: "Suppression impossible", description: err.message, variant: "destructive" }); } };
  const startEdit = (item) => { setEditing(item); setForm({ ...EMPTY, ...item, project_id: item.project_id || "__none__", knowledge_base_id: item.knowledge_base_id || "__none__" }); setOpen(true); };
  const startCreate = () => { setEditing(null); setForm(EMPTY); setOpen(true); };
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const inspect = async (item) => {
    try { setBusy(true); setInspected(await inspectCollection(item.id)); }
    catch (err) { toast({ title: "Inspection impossible", description: err.response?.data?.message || err.message, variant: "destructive" }); }
    finally { setBusy(false); }
  };

  return <>
    <Card>
      <CardHeader className="pb-3"><div className="flex items-start justify-between gap-3 flex-wrap"><div><CardTitle className="text-base flex items-center gap-2"><Database className="h-4 w-4 text-primary" /> Collections vectorielles <Badge variant="secondary">{items.length}</Badge></CardTitle><p className="text-sm text-muted-foreground mt-1">Visualisez et reliez les collections Chroma utilisées par vos bases et Use Cases.</p></div><div className="flex gap-2"><Button variant="outline" size="sm" onClick={load} disabled={busy}><RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Actualiser</Button><Button size="sm" onClick={startCreate}><Plus className="h-3.5 w-3.5 mr-1.5" /> Nouvelle collection</Button></div></div></CardHeader>
      <CardContent>{items.length === 0 ? <div className="rounded-xl border border-dashed p-8 text-center"><Layers3 className="h-7 w-7 mx-auto text-muted-foreground mb-2" /><p className="text-sm text-muted-foreground">Aucune collection déclarée.</p></div> : <div className="grid gap-3 md:grid-cols-2">{items.map((item) => <div key={item.id} className="rounded-xl border p-4 hover:border-primary/40 transition-colors"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex items-center gap-2 flex-wrap"><span className="font-semibold truncate">{item.name}</span><Badge variant={item.status === "active" ? "secondary" : "outline"}>{item.status || "active"}</Badge></div><div className="mt-2 rounded-md bg-muted/50 px-2 py-1 font-mono text-xs break-all">{item.collection_name}</div></div><div className="flex gap-1 shrink-0"><Button size="sm" variant="outline" onClick={() => { onCollectionChange?.(item); }} title="Utiliser cette collection">Utiliser</Button><Button size="sm" variant="ghost" onClick={() => inspect(item)} title="Inspecter la collection"><Database className="h-3.5 w-3.5" /></Button><Button aria-label="Modifier" variant="ghost" size="sm" onClick={() => startEdit(item)}><Pencil className="h-3.5 w-3.5" /></Button><Button aria-label="Supprimer" variant="ghost" size="sm" className="text-destructive" onClick={() => remove(item)}><Trash2 className="h-3.5 w-3.5" /></Button></div></div><p className="text-xs text-muted-foreground mt-3 line-clamp-2">{item.description || "Sans description"}</p><div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground"><span>Embedding : {item.embedding_model || "défaut"}</span><span>Métrique : {item.distance_metric || "cosine"}</span>{item.knowledge_base_id && <span>KB : {item.knowledge_base_id}</span>}</div></div>)}</div>}</CardContent>
    </Card>
    <Dialog open={open} onOpenChange={(value) => !value && !busy && setOpen(false)}><DialogContent className="sm:max-w-2xl"><DialogHeader><DialogTitle>{editing ? "Modifier la collection" : "Nouvelle collection vectorielle"}</DialogTitle><DialogDescription>Déclarez le nom lisible et le nom physique de la collection Chroma.</DialogDescription></DialogHeader><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-1.5"><Label>Nom affiché *</Label><Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Réglementation réclamations" /></div><div className="space-y-1.5"><Label>Nom physique Chroma *</Label><Input className="font-mono" value={form.collection_name} onChange={(e) => set("collection_name", e.target.value)} placeholder="gpr_claims_regulatory" /></div><div className="space-y-1.5 sm:col-span-2"><Label>Description</Label><Textarea rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Règles et procédures réglementaires…" /></div><div className="space-y-1.5"><Label>Projet</Label><Select value={form.project_id || "__none__"} onValueChange={(value) => set("project_id", value)}><SelectTrigger><SelectValue placeholder="Sélectionner un projet" /></SelectTrigger><SelectContent><SelectItem value="__none__">Aucun projet</SelectItem>{projects.map((project) => <SelectItem key={project.id} value={project.id}>{project.name || project.id}</SelectItem>)}</SelectContent></Select></div><div className="space-y-1.5"><Label>Knowledge Base</Label><Select value={form.knowledge_base_id || "__none__"} onValueChange={(value) => set("knowledge_base_id", value)}><SelectTrigger><SelectValue placeholder="Sélectionner une base" /></SelectTrigger><SelectContent><SelectItem value="__none__">Aucune Knowledge Base</SelectItem>{knowledgeBases.map((kb) => <SelectItem key={kb.id} value={kb.id}>{kb.name || kb.id}</SelectItem>)}</SelectContent></Select></div><div className="space-y-1.5"><Label>Embedding model</Label><Input className="font-mono text-xs" value={form.embedding_model} onChange={(e) => set("embedding_model", e.target.value)} /></div><div className="space-y-1.5"><Label>Distance metric</Label><Input value={form.distance_metric} onChange={(e) => set("distance_metric", e.target.value)} placeholder="cosine" /></div></div><DialogFooter><Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>Annuler</Button><Button onClick={save} disabled={busy || !form.name.trim() || !form.collection_name.trim()}>{busy ? "Enregistrement…" : "Enregistrer"}</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={Boolean(inspected)} onOpenChange={(value) => !value && setInspected(null)}><DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Arborescence Chroma — {inspected?.display_name || inspected?.name}</DialogTitle><DialogDescription>Vue bornée des documents, IDs, embeddings et métadonnées réellement stockés dans la collection.</DialogDescription></DialogHeader>{inspected && <div className="space-y-4"><div className="grid gap-3 sm:grid-cols-3"><div className="rounded-lg bg-muted/50 p-3"><div className="text-xs text-muted-foreground">Collection</div><div className="font-mono text-sm mt-1 break-all">{inspected.collection_name || inspected.name}</div></div><div className="rounded-lg bg-muted/50 p-3"><div className="text-xs text-muted-foreground">Vecteurs</div><div className="text-xl font-semibold mt-1">{inspected.count}</div></div><div className="rounded-lg bg-muted/50 p-3"><div className="text-xs text-muted-foreground">Dimension embeddings</div><div className="text-xl font-semibold mt-1">{inspected.embedding_dimensions || "—"}</div></div></div><div className="rounded-xl border overflow-auto"><table className="w-full text-left text-xs"><thead className="bg-muted/50"><tr><th className="p-3">ID</th><th className="p-3">Document</th><th className="p-3">Metadata</th><th className="p-3">Embedding</th></tr></thead><tbody>{(inspected.ids || []).map((id, index) => <tr key={id} className="border-t align-top"><td className="p-3 font-mono whitespace-nowrap">{id}</td><td className="p-3 min-w-56 max-w-md">{inspected.documents?.[index] || "—"}</td><td className="p-3 min-w-48"><pre className="whitespace-pre-wrap">{JSON.stringify(inspected.metadatas?.[index] || {}, null, 2)}</pre></td><td className="p-3 font-mono max-w-48 break-all">{inspected.embeddings?.[index] ? `[${inspected.embeddings[index].slice(0, 8).map((v) => Number(v).toFixed(4)).join(", ")}…]` : "—"}</td></tr>)}</tbody></table>{!inspected.ids?.length && <p className="p-6 text-center text-sm text-muted-foreground">Collection vide.</p>}</div></div>}</DialogContent></Dialog>
  </>;
}
