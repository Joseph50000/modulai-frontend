import { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import StatusBadge from "@/components/StatusBadge";
import { Plus, Trash2, RefreshCw, Search, FileText, Upload, Link2, Database } from "lucide-react";
import { ingestFile, ingestUrl, ingestSqlPreset, indexDocument, reindexKnowledgeBase, semanticSearch } from "@/core/ai/ragLayer";

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

  const load = async () => {
    const list = await base44.entities.KnowledgeBase.list("-created_date", 100);
    setKbs(list);
    const active = kbId || (list[0] && list[0].id) || "";
    setKbId(active);
    setDocs(active ? await base44.entities.Document.filter({ knowledge_base_id: active }, "-created_date", 100) : []);
  };
  useEffect(() => { load(); }, []);

  const reloadDocs = async () => setDocs(kbId ? await base44.entities.Document.filter({ knowledge_base_id: kbId }, "-created_date", 100) : []);

  const onUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !kbId) { toast({ title: "Sélectionnez d'abord une Knowledge Base", variant: "destructive" }); return; }
    try {
      setBusy(true);
      const result = await ingestFile({ knowledgeBaseId: kbId, file });
      toast({ title: "Document indexé", description: `${file.name} — ${result.chunks || 0} chunks vectorisés.` });
      await reloadDocs();
    } catch (err) {
      toast({ title: "Erreur d'indexation", description: err.response?.data?.message || err.message, variant: "destructive" });
    } finally { setBusy(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  const addUrl = async () => {
    if (!url.trim() || !kbId) return;
    try {
      setBusy(true);
      const result = await ingestUrl({ knowledgeBaseId: kbId, url: url.trim() });
      toast({ title: "URL indexée", description: `${result.document_id} — ${result.chunks || 0} chunks.` });
      setUrl("");
      await reloadDocs();
    } catch (err) {
      toast({ title: "Erreur URL", description: err.response?.data?.message || err.message, variant: "destructive" });
    } finally { setBusy(false); }
  };

  const runSqlPreset = async () => {
    if (!sqlPreset.trim()) return;
    try {
      setBusy(true);
      const result = await ingestSqlPreset({ preset: sqlPreset.trim() });
      toast({ title: "Source SQL indexée", description: `${result.indexed || 0} lignes.` });
      setSqlPreset("");
      await reloadDocs();
    } catch (err) {
      toast({ title: "Erreur SQL", description: err.response?.data?.message || err.message, variant: "destructive" });
    } finally { setBusy(false); }
  };

  const reindex = async (doc) => { setBusy(true); const n = await indexDocument(doc.id); toast({ title: "Re-indexé", description: `${n} chunks.` }); reloadDocs(); setBusy(false); };
  const remove = async (doc) => { await base44.entities.Document.delete(doc.id); reloadDocs(); };
  const reindexAll = async () => { if (!kbId) return; setBusy(true); const n = await reindexKnowledgeBase(kbId); toast({ title: "Re-indexation KB", description: `${n} documents.` }); reloadDocs(); setBusy(false); };

  const runSearch = async () => {
    if (!query.trim()) return;
    setBusy(true);
    setResults(await semanticSearch({ knowledgeBaseId: kbId || undefined, query, topK: 6 }));
    setBusy(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="min-w-60"><Label>Knowledge Base</Label>
          <Select value={kbId} onValueChange={setKbId}><SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger><SelectContent>{kbs.map((k) => <SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>)}</SelectContent></Select>
        </div>
        <div className="self-end flex gap-2">
          <input ref={fileRef} type="file" accept=".pdf,.docx,.xlsx,.csv,.txt,.md,.text" onChange={onUpload} className="hidden" />
          <Button onClick={() => fileRef.current?.click()} disabled={busy || !kbId}><Upload className="h-4 w-4 mr-1.5" /> Upload & indexer</Button>
          <Button variant="outline" onClick={reindexAll} disabled={busy || !kbId}><RefreshCw className="h-4 w-4 mr-1.5" /> Tout ré-indexer</Button>
        </div>
      </div>
      {!kbId && <p className="text-sm text-muted-foreground">Créez d'abord une Knowledge Base (onglet Knowledge Bases).</p>}
      <div className="grid gap-3 md:grid-cols-2">
        <div className="flex gap-2">
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://exemple.com/procedure" disabled={busy || !kbId} />
          <Button variant="outline" onClick={addUrl} disabled={busy || !kbId || !url.trim()}><Link2 className="h-4 w-4 mr-1.5" /> URL</Button>
        </div>
        <div className="flex gap-2">
          <Input value={sqlPreset} onChange={(e) => setSqlPreset(e.target.value)} placeholder="Preset SQL autorisé" disabled={busy} />
          <Button variant="outline" onClick={runSqlPreset} disabled={busy || !sqlPreset.trim()}><Database className="h-4 w-4 mr-1.5" /> SQL</Button>
        </div>
      </div>

      <div className="space-y-2">
        {docs?.map((d) => (
          <Card key={d.id}><CardContent className="p-3 flex items-center justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <div className="flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground" /><span className="font-medium truncate">{d.name}</span><StatusBadge status={d.status} /></div>
              <div className="text-xs text-muted-foreground mt-1">{(d.content || "").length.toLocaleString()} chars · {d.chunk_count || 0} chunks · {d.embedding_model || "—"}</div>
            </div>
            <div className="flex items-center gap-1.5">
              <Button size="sm" variant="ghost" onClick={() => reindex(d)} disabled={busy}><RefreshCw className="h-3.5 w-3.5" /></Button>
              <Button size="sm" variant="ghost" onClick={() => remove(d)}><Trash2 className="h-3.5 w-3.5" /></Button>
            </div>
          </CardContent></Card>
        ))}
        {docs && docs.length === 0 && kbId && <p className="text-sm text-muted-foreground">Aucun document. Importez un PDF, DOCX, XLSX, CSV, TXT ou Markdown, ajoutez une URL publique, ou lancez un preset SQL autorisé.</p>}
      </div>

      <Card><CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2"><Search className="h-4 w-4 text-primary" /><h3 className="font-heading font-semibold text-sm">Search Test (retrieval sémantique cosine)</h3></div>
        <div className="flex gap-2">
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Requête : ex. contrôles internes DMR" onKeyDown={(e) => e.key === "Enter" && runSearch()} />
          <Button onClick={runSearch} disabled={busy || !kbId}>Rechercher</Button>
        </div>
        {results && (results.length === 0
          ? <p className="text-sm text-muted-foreground">Aucun passage pertinent. Indexez des documents puis relancez.</p>
          : <div className="space-y-2">{results.map((r, i) => (
            <div key={i} className="rounded-md border border-border p-2.5">
              <div className="flex items-center justify-between"><span className="text-xs font-medium">{r.source}</span><Badge variant="secondary" className="font-mono">score {r.score.toFixed(3)}</Badge></div>
              <p className="text-sm text-muted-foreground mt-1 line-clamp-3">{r.passage}</p>
            </div>
          ))}</div>)}
      </CardContent></Card>
    </div>
  );
}