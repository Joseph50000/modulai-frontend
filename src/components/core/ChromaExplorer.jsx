import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { inspectCollection } from "@/core/ai/ragLayer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCw, Database, ChevronDown, ChevronRight, Search, FileText, Layers3 } from "lucide-react";

const PAGE_SIZE = 10;
const parseJson = (value, fallback = {}) => {
  if (value && typeof value === "object") return value;
  try { return value ? JSON.parse(value) : fallback; } catch { return fallback; }
};

export default function ChromaExplorer() {
  const [knowledgeBases, setKnowledgeBases] = useState([]);
  const [collections, setCollections] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [expandedKbs, setExpandedKbs] = useState({});
  const [inspected, setInspected] = useState(null);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadCollections = async () => {
    setLoading(true); setError("");
    try {
      const [kbs, cols] = await Promise.all([
        base44.entities.KnowledgeBase.list("-created_date", 200),
        base44.entities.RagCollection.list("-created_date", 200),
      ]);
      setKnowledgeBases(kbs); setCollections(cols);
      if (!selectedId && cols[0]) setSelectedId(cols[0].id);
    } catch (err) { setError(err.message || "Impossible de charger les collections"); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadCollections(); }, []);

  const selected = collections.find((item) => item.id === selectedId) || null;
  const filteredCollections = useMemo(() => collections.filter((item) => {
    const text = `${item.name} ${item.collection_name} ${item.knowledge_base_id || ""}`.toLowerCase();
    return text.includes(filter.toLowerCase());
  }), [collections, filter]);
  const grouped = useMemo(() => {
    const groups = new Map();
    filteredCollections.forEach((item) => {
      const key = item.knowledge_base_id || "__unassigned__";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(item);
    });
    return groups;
  }, [filteredCollections]);

  const selectCollection = async (item) => {
    setSelectedId(item.id); setPage(1); setLoading(true); setError("");
    try { setInspected(await inspectCollection(item.id, PAGE_SIZE, 0)); }
    catch (err) { setInspected(null); setError(err.response?.data?.message || err.message || "Inspection impossible"); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (selected && !inspected) selectCollection(selected);
  }, [selectedId, selected]);

  const loadPage = async (nextPage) => {
    if (!selected) return;
    setLoading(true); setError("");
    try { setInspected(await inspectCollection(selected.id, PAGE_SIZE, (nextPage - 1) * PAGE_SIZE)); setPage(nextPage); }
    catch (err) { setError(err.response?.data?.message || err.message || "Page indisponible"); }
    finally { setLoading(false); }
  };

  const rows = inspected?.ids || [];
  const total = inspected?.count || 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageStart = total ? (page - 1) * PAGE_SIZE + 1 : 0;
  const pageEnd = Math.min(page * PAGE_SIZE, total);

  return <section className="rounded-xl border border-border bg-card overflow-hidden">
    <div className="flex items-center justify-between gap-3 border-b p-4 flex-wrap">
      <div><div className="flex items-center gap-2"><Database className="h-4 w-4 text-primary" /><h3 className="font-semibold">ChromaDB Explorer</h3><Badge variant="secondary">{collections.length} collections</Badge></div><p className="text-xs text-muted-foreground mt-1">Knowledge Base → Collection → Chunks → Metadata</p></div>
      <Button size="sm" variant="outline" onClick={loadCollections} disabled={loading}><RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} /> Actualiser</Button>
    </div>
    <div className="grid min-h-[520px] lg:grid-cols-[280px_1fr]">
      <aside className="border-b lg:border-b-0 lg:border-r bg-muted/20 p-3">
        <div className="relative mb-3"><Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" /><Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Rechercher…" className="h-8 pl-8 text-xs" /></div>
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Bases et collections</div>
        <div className="space-y-1">
          {[...grouped.entries()].map(([kbId, items]) => { const kb = knowledgeBases.find((base) => base.id === kbId); const open = expandedKbs[kbId] !== false; return <div key={kbId}>
            <button className="flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-left text-xs font-medium hover:bg-muted" onClick={() => setExpandedKbs((state) => ({ ...state, [kbId]: !open }))}>{open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}<Layers3 className="h-3.5 w-3.5 text-primary" />{kb?.name || (kbId === "__unassigned__" ? "Sans Knowledge Base" : kbId)}<span className="ml-auto text-[10px] text-muted-foreground">{items.length}</span></button>
            {open && <div className="ml-4 space-y-0.5">{items.map((item) => <button key={item.id} onClick={() => selectCollection(item)} className={`flex w-full items-start gap-2 rounded px-2 py-2 text-left text-xs ${item.id === selectedId ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}><Database className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span className="min-w-0"><span className="block truncate font-medium">{item.name}</span><span className="block truncate font-mono text-[10px] text-muted-foreground">{item.collection_name}</span></span></button>)}</div>}
          </div>; })}
          {!filteredCollections.length && <div className="rounded border border-dashed p-4 text-center text-xs text-muted-foreground">Aucune collection</div>}
        </div>
      </aside>
      <main className="min-w-0 p-4">
        {!selected ? <div className="flex h-full min-h-64 flex-col items-center justify-center text-center text-muted-foreground"><Database className="h-8 w-8 mb-2" /><p className="text-sm">Sélectionnez une collection</p></div> : <>
          <div className="flex items-start justify-between gap-3 flex-wrap mb-4"><div className="min-w-0"><h4 className="font-semibold truncate">{selected.name}</h4><div className="font-mono text-xs text-muted-foreground mt-1 truncate">{selected.collection_name}</div></div><div className="flex gap-2 text-xs"><Badge variant="secondary">{total} vecteurs</Badge><Badge variant="outline">{inspected?.embedding_dimensions || "—"} dims</Badge></div></div>
          {error && <div className="mb-3 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}
          <div className="rounded-lg border overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-muted/50"><tr><th className="p-3">ID</th><th className="p-3">Document / chunk</th><th className="p-3">Source</th><th className="p-3">Metadata</th><th className="p-3">Embedding</th></tr></thead><tbody>{rows.map((id, index) => { const metadata = parseJson(inspected.metadatas?.[index], {}); return <tr key={id} className="border-t align-top hover:bg-muted/20"><td className="p-3 font-mono whitespace-nowrap">{id}</td><td className="p-3 min-w-64 max-w-lg"><div className="line-clamp-3">{inspected.documents?.[index] || "—"}</div></td><td className="p-3 whitespace-nowrap">{metadata.source || metadata.document_name || "—"}</td><td className="p-3 min-w-40"><span className="text-muted-foreground">{Object.keys(metadata).length} propriété(s)</span><pre className="mt-1 max-w-xs truncate text-[10px]">{JSON.stringify(metadata)}</pre></td><td className="p-3 whitespace-nowrap"><Badge variant="outline">{inspected.embeddings?.[index]?.length || inspected.embedding_dimensions || "—"} dimensions</Badge></td></tr>; })}</tbody></table>{loading && <div className="p-6 text-center text-sm text-muted-foreground">Chargement…</div>}{!loading && !rows.length && <div className="p-8 text-center text-sm text-muted-foreground"><FileText className="h-6 w-6 mx-auto mb-2" />Collection vide</div>}</div>
          <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground"><span>{pageStart}–{pageEnd} sur {total}</span><div className="flex items-center gap-2"><Button size="sm" variant="outline" disabled={page <= 1 || loading} onClick={() => loadPage(page - 1)}>Précédent</Button><span>Page {page} / {pageCount}</span><Button size="sm" variant="outline" disabled={page >= pageCount || loading} onClick={() => loadPage(page + 1)}>Suivant</Button></div></div>
        </>}
      </main>
    </div>
  </section>;
}

export { parseJson };
