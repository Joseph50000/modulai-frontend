import { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import StatusBadge from "@/components/StatusBadge";
import { Trash2, RefreshCw, Search, FileText, Upload, Link2, Database, Eye, Plus, Layers3 } from "lucide-react";
import { ingestFile, ingestUrl, ingestSqlPreset, indexDocument, reindexKnowledgeBase, semanticSearch } from "@/core/ai/ragLayer";
import RagCollectionsManager from "./RagCollectionsManager";
import ChromaExplorer from "./ChromaExplorer";

const parseJson = (value, fallback) => {
  if (!value) return fallback;
  if (typeof value === "object") return value;
  try { return JSON.parse(value); } catch { return fallback; }
};
const formatBytes = (value) => {
  if (!value) return "—";
  if (value < 1024) return `${value} o`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} Ko`;
  return `${(value / (1024 * 1024)).toFixed(1)} Mo`;
};

export default function RagManager() {
  const { toast } = useToast();
  const fileRef = useRef(null);
  const [kbs, setKbs] = useState([]);
  const [kbId, setKbId] = useState("");
  const [docs, setDocs] = useState(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState("");
  const [sqlPreset, setSqlPreset] = useState("");
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [modal, setModal] = useState(null);

  const load = async () => {
    const list = await base44.entities.KnowledgeBase.list("-created_date", 100);
    setKbs(list);
    const active = kbId || (list[0] && list[0].id) || "";
    setKbId(active);
    setDocs(active ? await base44.entities.Document.filter({ knowledge_base_id: active }, "-created_date", 100) : []);
  };
  useEffect(() => { load(); }, []);
  const reloadDocs = async () => setDocs(kbId ? await base44.entities.Document.filter({ knowledge_base_id: kbId }, "-created_date", 100) : []);
  const activeKb = kbs.find((k) => k.id === kbId);
  const closeModal = () => { if (!busy) setModal(null); };

  const onUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file || !kbId) return;
    try {
      setBusy(true);
      const result = await ingestFile({ knowledgeBaseId: kbId, collection: selectedCollection?.collection_name, file });
      toast({ title: "Document indexé", description: `${file.name} — ${result.chunks || 0} chunks vectorisés.` });
      setModal(null); await reloadDocs();
    } catch (err) { toast({ title: "Erreur d’indexation", description: err.response?.data?.message || err.message, variant: "destructive" }); }
    finally { setBusy(false); if (fileRef.current) fileRef.current.value = ""; }
  };
  const addUrl = async () => {
    if (!url.trim() || !kbId) return;
    try {
      setBusy(true); const result = await ingestUrl({ knowledgeBaseId: kbId, collection: selectedCollection?.collection_name, url: url.trim() });
      toast({ title: "URL indexée", description: `${result.document_id} — ${result.chunks || 0} chunks.` });
      setUrl(""); setModal(null); await reloadDocs();
    } catch (err) { toast({ title: "Erreur URL", description: err.response?.data?.message || err.message, variant: "destructive" }); }
    finally { setBusy(false); }
  };
  const runSqlPreset = async () => {
    if (!sqlPreset.trim()) return;
    try {
      setBusy(true); const result = await ingestSqlPreset({ preset: sqlPreset.trim() });
      toast({ title: "Source SQL indexée", description: `${result.indexed || 0} lignes.` });
      setSqlPreset(""); setModal(null); await reloadDocs();
    } catch (err) { toast({ title: "Erreur SQL", description: err.response?.data?.message || err.message, variant: "destructive" }); }
    finally { setBusy(false); }
  };
  const reindex = async (doc) => {
    try { setBusy(true); const n = await indexDocument(doc.id); toast({ title: "Document ré-indexé", description: `${n} chunks.` }); await reloadDocs(); }
    catch (err) { toast({ title: "Erreur de re-indexation", description: err.message, variant: "destructive" }); }
    finally { setBusy(false); }
  };
  const remove = async (doc) => {
    try { await base44.entities.Document.delete(doc.id); await reloadDocs(); toast({ title: "Document supprimé" }); }
    catch (err) { toast({ title: "Suppression impossible", description: err.message, variant: "destructive" }); }
  };
  const reindexAll = async () => {
    if (!kbId) return;
    try { setBusy(true); const n = await reindexKnowledgeBase(kbId); toast({ title: "Knowledge Base ré-indexée", description: `${n} documents.` }); await reloadDocs(); }
    catch (err) { toast({ title: "Erreur de re-indexation", description: err.message, variant: "destructive" }); }
    finally { setBusy(false); }
  };
  const runSearch = async () => {
    if (!query.trim()) return;
    try { setBusy(true); setResults(await semanticSearch({ knowledgeBaseId: kbId || undefined, query, topK: 6 })); }
    catch (err) { toast({ title: "Recherche impossible", description: err.message, variant: "destructive" }); }
    finally { setBusy(false); }
  };
  const metadata = selectedDoc ? parseJson(selectedDoc.metadata, {}) : {};
  const chunks = selectedDoc ? parseJson(selectedDoc.chunks, []) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Espace documentaire</p><h2 className="mt-1 text-2xl font-heading font-semibold">Gestion RAG</h2><p className="mt-1 text-sm text-muted-foreground">Organisez vos Knowledge Bases, collections vectorielles et sources indexées depuis un seul espace.</p></div>
        <Button variant="outline" onClick={load} disabled={busy}><RefreshCw className="h-4 w-4 mr-2" /> Actualiser</Button>
      </div>

      <Card className="border-primary/20 bg-primary/[0.03]"><CardContent className="p-5"><div className="grid gap-5 lg:grid-cols-[1fr_auto] items-end"><div><Label>Knowledge Base active</Label><Select value={kbId} onValueChange={async (value) => { setKbId(value); setDocs(await base44.entities.Document.filter({ knowledge_base_id: value }, "-created_date", 100)); setResults(null); }}><SelectTrigger className="mt-2 max-w-xl bg-background"><SelectValue placeholder="Sélectionner une Knowledge Base" /></SelectTrigger><SelectContent>{kbs.map((k) => <SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>)}</SelectContent></Select>{activeKb && <div className="mt-3 flex flex-wrap gap-2 text-xs"><Badge variant="secondary">{docs?.length || 0} document(s)</Badge><Badge variant="outline" className="font-mono">{activeKb.id}</Badge><span className="text-muted-foreground">{activeKb.description || "Base documentaire prête pour la recherche sémantique."}</span></div>}</div><div className="flex gap-2 flex-wrap"><Button onClick={() => setModal("upload")} disabled={busy || !kbId}><Upload className="h-4 w-4 mr-2" /> Importer</Button><Button variant="outline" onClick={reindexAll} disabled={busy || !kbId}><RefreshCw className="h-4 w-4 mr-2" /> Ré-indexer</Button></div></div></CardContent></Card>

      {!kbId && <Card><CardContent className="p-8 text-center"><Layers3 className="h-8 w-8 mx-auto text-muted-foreground mb-3" /><p className="font-medium">Aucune Knowledge Base sélectionnée</p><p className="text-sm text-muted-foreground mt-1">Créez ou sélectionnez une base avant d’ajouter des sources.</p></CardContent></Card>}

      <ChromaExplorer />
      <RagCollectionsManager onCollectionChange={(collection) => { setSelectedCollection(collection); if (collection.knowledge_base_id) setKbId(collection.knowledge_base_id); }} />

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="hover:border-primary/40 transition-colors"><CardContent className="p-5"><Link2 className="h-5 w-5 text-primary mb-3" /><h3 className="font-semibold">Source URL</h3><p className="text-sm text-muted-foreground mt-1 mb-4">Indexer une page publique ou une procédure en ligne.</p><Button variant="outline" className="w-full" onClick={() => setModal("url")} disabled={busy || !kbId}><Plus className="h-4 w-4 mr-2" /> Ajouter une URL</Button></CardContent></Card>
        <Card className="hover:border-primary/40 transition-colors"><CardContent className="p-5"><Database className="h-5 w-5 text-primary mb-3" /><h3 className="font-semibold">Source SQL</h3><p className="text-sm text-muted-foreground mt-1 mb-4">Lancer un preset SQL autorisé par la plateforme.</p><Button variant="outline" className="w-full" onClick={() => setModal("sql")} disabled={busy}><Plus className="h-4 w-4 mr-2" /> Ajouter une source</Button></CardContent></Card>
        <Card className="hover:border-primary/40 transition-colors"><CardContent className="p-5"><FileText className="h-5 w-5 text-primary mb-3" /><h3 className="font-semibold">Documents indexés</h3><p className="text-sm text-muted-foreground mt-1 mb-4">{docs?.length || 0} source(s) dans la base active.</p><Button variant="outline" className="w-full" onClick={() => document.getElementById("rag-documents")?.scrollIntoView({ behavior: "smooth" })} disabled={!kbId}><Eye className="h-4 w-4 mr-2" /> Voir les documents</Button></CardContent></Card>
      </div>

      <Card id="rag-documents"><CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> Sources documentaires <Badge variant="secondary">{docs?.length || 0}</Badge></CardTitle></CardHeader><CardContent className="space-y-2">{docs?.map((d) => <div key={d.id} className="rounded-xl border p-4 flex items-center justify-between gap-4 flex-wrap hover:bg-muted/30 transition-colors"><div className="min-w-0"><div className="flex items-center gap-2 flex-wrap"><FileText className="h-4 w-4 text-muted-foreground" /><span className="font-medium truncate">{d.name}</span><StatusBadge status={d.status} /></div><div className="text-xs text-muted-foreground mt-2">{(d.content || "").length.toLocaleString()} caractères · {d.chunk_count || 0} chunks · {d.type || "source"} · {d.source || "—"}</div></div><div className="flex gap-1.5"><Button size="sm" variant="outline" onClick={() => setSelectedDoc(d)} disabled={busy}><Eye className="h-3.5 w-3.5 mr-1.5" /> Détails</Button><Button size="sm" variant="ghost" onClick={() => reindex(d)} disabled={busy}><RefreshCw className="h-3.5 w-3.5" /></Button><Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(d)} disabled={busy}><Trash2 className="h-3.5 w-3.5" /></Button></div></div>)}{docs && docs.length === 0 && kbId && <p className="text-sm text-muted-foreground border border-dashed rounded-xl p-8 text-center">Aucun document dans cette Knowledge Base. Utilisez « Importer », « Source URL » ou « Source SQL ».</p>}</CardContent></Card>

      <Card><CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Search className="h-4 w-4 text-primary" /> Tester la recherche sémantique <Badge variant="outline">Cosine</Badge></CardTitle></CardHeader><CardContent className="space-y-3"><div className="flex gap-2"><Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ex. contrôles internes DMR" onKeyDown={(e) => e.key === "Enter" && runSearch()} /><Button onClick={runSearch} disabled={busy || !kbId || !query.trim()}>Rechercher</Button></div>{results && (results.length === 0 ? <p className="text-sm text-muted-foreground rounded-lg bg-muted/40 p-4">Aucun passage pertinent. Indexez des documents puis relancez la recherche.</p> : <div className="space-y-2">{results.map((r, i) => <div key={i} className="rounded-lg border p-3"><div className="flex items-center justify-between gap-3"><span className="text-xs font-medium truncate">{r.source}</span><Badge variant="secondary" className="font-mono shrink-0">score {Number(r.score || 0).toFixed(3)}</Badge></div><p className="text-sm text-muted-foreground mt-1 line-clamp-3">{r.passage}</p></div>)}</div>)}</CardContent></Card>

      <Dialog open={Boolean(modal)} onOpenChange={(open) => !open && closeModal()}><DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>{modal === "upload" ? "Importer un document" : modal === "url" ? "Indexer une URL" : "Indexer une source SQL"}</DialogTitle><DialogDescription>{modal === "upload" ? "Le document sera extrait, découpé puis indexé dans la Knowledge Base active." : modal === "url" ? "Saisissez une URL publique dont le contenu peut être récupéré par le service." : "Utilisez uniquement un preset SQL autorisé par la plateforme."}</DialogDescription></DialogHeader>{modal === "upload" && <div className="space-y-2"><Label>Fichier</Label><Input ref={fileRef} type="file" accept=".pdf,.docx,.xlsx,.csv,.txt,.md,.text" /></div>}{modal === "url" && <div className="space-y-2"><Label>URL publique</Label><Input autoFocus value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://exemple.com/procedure" /></div>}{modal === "sql" && <div className="space-y-2"><Label>Preset SQL</Label><Input autoFocus value={sqlPreset} onChange={(e) => setSqlPreset(e.target.value)} placeholder="nom-du-preset" /></div>}<DialogFooter><Button variant="outline" onClick={closeModal} disabled={busy}>Annuler</Button><Button onClick={modal === "upload" ? onUpload : modal === "url" ? addUrl : runSqlPreset} disabled={busy || (modal === "upload" ? false : !(modal === "url" ? url.trim() : sqlPreset.trim()))}>{busy ? "Traitement…" : modal === "upload" ? "Importer et indexer" : "Indexer"}</Button></DialogFooter></DialogContent></Dialog>

      <Dialog open={Boolean(selectedDoc)} onOpenChange={(open) => !open && setSelectedDoc(null)}><DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">{selectedDoc && <><DialogHeader><DialogTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> {selectedDoc.name}</DialogTitle><DialogDescription>Contenu extrait et indexé dans la Knowledge Base sélectionnée.</DialogDescription></DialogHeader><div className="grid gap-2 sm:grid-cols-4 text-xs"><div><span className="text-muted-foreground">Statut</span><div className="mt-1"><StatusBadge status={selectedDoc.status} /></div></div><div><span className="text-muted-foreground">Type</span><div className="font-medium mt-1">{selectedDoc.type || "—"}</div></div><div><span className="text-muted-foreground">Taille</span><div className="font-medium mt-1">{formatBytes(selectedDoc.size)}</div></div><div><span className="text-muted-foreground">Chunks</span><div className="font-medium mt-1">{selectedDoc.chunk_count || chunks.length || 0}</div></div></div><div className="rounded-md border bg-muted/30 p-3 text-xs break-all"><span className="font-semibold">Source :</span> {selectedDoc.source || "—"}</div><div><h4 className="font-semibold text-sm mb-2">Métadonnées</h4><pre className="rounded-md bg-muted p-3 text-xs overflow-auto whitespace-pre-wrap">{JSON.stringify(metadata, null, 2)}</pre></div><div><h4 className="font-semibold text-sm mb-2">Contenu extrait</h4><pre className="rounded-md border p-3 text-sm whitespace-pre-wrap max-h-72 overflow-y-auto">{selectedDoc.content || "Aucun contenu extrait."}</pre></div><div><h4 className="font-semibold text-sm mb-2">Chunks indexés ({chunks.length})</h4><div className="space-y-2">{chunks.length ? chunks.map((chunk, index) => <div key={index} className="rounded-md border p-3 text-sm whitespace-pre-wrap"><div className="text-xs text-muted-foreground mb-1">Chunk {index + 1}</div>{typeof chunk === "string" ? chunk : JSON.stringify(chunk, null, 2)}</div>) : <p className="text-sm text-muted-foreground">Les chunks sont conservés dans Chroma ; aucun aperçu détaillé n’est stocké dans SQLite pour ce document.</p>}</div></div></>}</DialogContent></Dialog>
    </div>
  );
}
