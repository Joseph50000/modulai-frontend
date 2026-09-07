import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { inspectCollection, semanticSearch } from "@/core/ai/ragLayer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCw, Database, ChevronDown, ChevronRight, Search, FileText, Layers3, Code2, ArrowLeft } from "lucide-react";

const PAGE_SIZE = 10;
const TABS = ["browse", "documents", "search", "structure"];
const parseJson = (value, fallback = {}) => { if (value && typeof value === "object") return value; try { return value ? JSON.parse(value) : fallback; } catch { return fallback; } };

export default function ChromaExplorer({ onKnowledgeBaseChange }) {
  const [knowledgeBases, setKnowledgeBases] = useState([]);
  const [collections, setCollections] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [expandedKbs, setExpandedKbs] = useState({});
  const [inspected, setInspected] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [tab, setTab] = useState("browse");
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState("");
  const [query, setQuery] = useState("");
  const [topK, setTopK] = useState(5);
  const [results, setResults] = useState(null);
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
      setExpandedKbs((state) => Object.keys(state).length ? state : Object.fromEntries(kbs.map((kb) => [kb.id, true])));
    } catch (err) { setError(err.message || "Impossible de charger les Knowledge Bases"); }
    finally { setLoading(false); }
  };
  useEffect(() => { loadCollections(); }, []);

  const selected = collections.find((item) => item.id === selectedId) || null;
  const filteredCollections = useMemo(() => collections.filter((item) => `${item.name} ${item.collection_name} ${item.knowledge_base_id || ""}`.toLowerCase().includes(filter.toLowerCase())), [collections, filter]);
  const grouped = useMemo(() => { const groups = new Map(); filteredCollections.forEach((item) => { const key = item.knowledge_base_id || "__unassigned__"; if (!groups.has(key)) groups.set(key, []); groups.get(key).push(item); }); return groups; }, [filteredCollections]);

  const inspect = async (item, nextPage = 1) => {
    setSelectedId(item.id); setLoading(true); setError("");
    try {
      const result = await inspectCollection(item.id, PAGE_SIZE, (nextPage - 1) * PAGE_SIZE);
      setInspected(result); setPage(nextPage); onKnowledgeBaseChange?.(item.knowledge_base_id || "");
      setDocuments(item.knowledge_base_id ? await base44.entities.Document.filter({ knowledge_base_id: item.knowledge_base_id }, "-created_date", 200) : []);
    } catch (err) { setInspected(null); setError(err.response?.data?.message || err.message || "Inspection impossible"); }
    finally { setLoading(false); }
  };
  const openCollection = (item) => { setInspected(null); setResults(null); setTab("browse"); inspect(item); };
  const backToCollections = () => { setSelectedId(""); setInspected(null); setResults(null); setError(""); };
  const runSearch = async () => { if (!selected || !query.trim()) return; setLoading(true); setError(""); try { setResults(await semanticSearch({ collection: selected.collection_name, query, topK })); } catch (err) { setError(err.response?.data?.message || err.message || "Recherche impossible"); } finally { setLoading(false); } };

  const rows = inspected?.ids || [];
  const total = inspected?.count || 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageStart = total ? (page - 1) * PAGE_SIZE + 1 : 0;
  const pageEnd = Math.min(page * PAGE_SIZE, total);

  if (!selected) return <section className="w-full rounded-xl border border-border bg-card overflow-hidden">
    <div className="flex items-start justify-between gap-4 border-b p-5 flex-wrap"><div><div className="flex items-center gap-2"><Layers3 className="h-5 w-5 text-primary" /><h3 className="text-lg font-semibold">Knowledge Bases</h3><Badge variant="secondary">{knowledgeBases.length} bases</Badge><Badge variant="outline">{collections.length} collections</Badge></div><p className="text-sm text-muted-foreground mt-1">Ouvrez une base pour consulter ses collections vectorielles.</p></div><Button size="sm" variant="outline" onClick={loadCollections} disabled={loading}><RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} /> Actualiser</Button></div>
    <div className="p-5 space-y-3"><div className="relative max-w-xl"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Rechercher une Knowledge Base ou une collection…" className="pl-9" /></div>{error && <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}{knowledgeBases.map((kb) => { const items = grouped.get(kb.id) || []; const open = expandedKbs[kb.id] !== false; return <div key={kb.id} className="rounded-lg border border-border overflow-hidden"><button className="flex w-full items-center gap-3 p-4 text-left hover:bg-muted/40" onClick={() => setExpandedKbs((state) => ({ ...state, [kb.id]: !open }))}>{open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}<div className="h-9 w-9 rounded-lg bg-primary/10 text-primary grid place-items-center"><Layers3 className="h-4 w-4" /></div><div className="min-w-0 flex-1"><div className="font-medium truncate">{kb.name}</div><div className="text-xs text-muted-foreground font-mono truncate">{kb.id}</div></div><Badge variant="secondary">{items.length} collection{items.length === 1 ? "" : "s"}</Badge></button>{open && <div className="border-t bg-muted/10 p-3">{items.length ? <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">{items.map((item) => <button key={item.id} onClick={() => openCollection(item)} className="flex items-start gap-3 rounded-lg border bg-card p-4 text-left hover:border-primary/50 hover:bg-primary/5 transition-colors"><Database className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><span className="min-w-0"><span className="block font-medium truncate">{item.name}</span><span className="block mt-1 font-mono text-xs text-muted-foreground truncate">{item.collection_name}</span><span className="block mt-2 text-xs text-muted-foreground">Ouvrir les documents et vecteurs →</span></span></button>)}</div> : <div className="p-5 text-center text-sm text-muted-foreground">Aucune collection associée.</div>}</div>}</div>; })}{!knowledgeBases.length && !loading && <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">Aucune Knowledge Base disponible.</div>}</div>
  </section>;

  return <section className="w-full rounded-xl border border-border bg-card overflow-hidden">
    <div className="flex items-center justify-between gap-3 border-b p-4 flex-wrap"><div className="flex items-center gap-3 min-w-0"><Button size="sm" variant="ghost" onClick={backToCollections}><ArrowLeft className="h-4 w-4 mr-1.5" /> Bases et collections</Button><div className="h-5 w-px bg-border" /><div className="min-w-0"><h3 className="font-semibold truncate">{selected.name}</h3><div className="font-mono text-xs text-muted-foreground truncate">{selected.collection_name}</div></div></div><div className="flex gap-2 text-xs"><Badge variant="secondary">{total} vecteurs</Badge><Badge variant="outline">{inspected?.embedding_dimensions || "—"} dims</Badge><Button size="sm" variant="outline" onClick={() => inspect(selected, page)} disabled={loading}><RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} /> Actualiser</Button></div></div>
    <div className="p-5">{error && <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}<div className="flex gap-1 border-b mb-5 overflow-x-auto">{TABS.map((key) => <button key={key} onClick={() => setTab(key)} className={`px-4 py-2.5 text-sm whitespace-nowrap border-b-2 ${tab === key ? "border-primary text-primary font-medium" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{key === "browse" ? "Parcourir" : key === "documents" ? "Documents" : key === "search" ? "Recherche" : "Structure"}</button>)}</div>
      {tab === "browse" && <><div className="rounded-lg border overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-muted/50"><tr><th className="p-3">ID</th><th className="p-3">Document / chunk</th><th className="p-3">Source</th><th className="p-3">Metadata</th><th className="p-3">Embedding</th></tr></thead><tbody>{rows.map((id, index) => { const metadata = parseJson(inspected.metadatas?.[index], {}); return <tr key={id} className="border-t align-top hover:bg-muted/20"><td className="p-3 font-mono whitespace-nowrap">{id}</td><td className="p-3 min-w-64 max-w-lg"><div className="line-clamp-3">{inspected.documents?.[index] || "—"}</div></td><td className="p-3 whitespace-nowrap">{metadata.source || metadata.document_name || "—"}</td><td className="p-3 min-w-40"><span className="text-muted-foreground">{Object.keys(metadata).length} propriété(s)</span><pre className="mt-1 max-w-xs truncate text-[10px]">{JSON.stringify(metadata)}</pre></td><td className="p-3 whitespace-nowrap"><Badge variant="outline">{inspected.embeddings?.[index]?.length || inspected.embedding_dimensions || "—"} dimensions</Badge></td></tr>; })}</tbody></table>{loading && <div className="p-6 text-center text-sm text-muted-foreground">Chargement…</div>}{!loading && !rows.length && <div className="p-8 text-center text-sm text-muted-foreground"><FileText className="h-6 w-6 mx-auto mb-2" />Collection vide</div>}</div><div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground"><span>{pageStart}–{pageEnd} sur {total}</span><div className="flex items-center gap-2"><Button size="sm" variant="outline" disabled={page <= 1 || loading} onClick={() => inspect(selected, page - 1)}>Précédent</Button><span>Page {page} / {pageCount}</span><Button size="sm" variant="outline" disabled={page >= pageCount || loading} onClick={() => inspect(selected, page + 1)}>Suivant</Button></div></div></>}
      {tab === "documents" && <div className="space-y-2">{documents.map((doc) => <div key={doc.id} className="rounded-lg border p-4 flex items-start gap-3"><FileText className="h-4 w-4 mt-0.5 text-primary" /><div className="min-w-0"><div className="font-medium text-sm truncate">{doc.name}</div><div className="text-xs text-muted-foreground mt-1">{doc.chunk_count || 0} chunks · {doc.type || "source"} · {doc.source || "—"}</div></div><Badge className="ml-auto" variant="outline">{doc.status}</Badge></div>)}{!documents.length && <div className="border border-dashed rounded-lg p-8 text-center text-sm text-muted-foreground">Aucun document rattaché à cette Knowledge Base.</div>}</div>}
      {tab === "search" && <div className="space-y-4"><div className="flex gap-2"><Input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && runSearch()} placeholder="Rechercher dans la collection…" /><Input className="w-20" type="number" min="1" max="20" value={topK} onChange={(e) => setTopK(Number(e.target.value) || 5)} /><Button onClick={runSearch} disabled={loading || !query.trim()}><Search className="h-4 w-4 mr-1.5" /> Rechercher</Button></div>{results && <div className="space-y-2">{results.map((result, index) => <div key={result.id || index} className="rounded-lg border p-3"><div className="flex items-center justify-between gap-2"><span className="font-mono text-xs">#{index + 1} · {result.id}</span><Badge variant="secondary">score {Number(result.score || 0).toFixed(3)}</Badge></div><p className="text-sm mt-2">{result.passage}</p><pre className="mt-2 text-[10px] text-muted-foreground truncate">{JSON.stringify(result.metadata || {})}</pre></div>)}{!results.length && <p className="text-sm text-muted-foreground">Aucun passage pertinent.</p>}</div>}</div>}
      {tab === "structure" && <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-lg border p-4"><div className="flex items-center gap-2 font-medium text-sm"><Code2 className="h-4 w-4 text-primary" /> Collection</div><dl className="mt-3 space-y-2 text-xs"><div className="flex justify-between gap-3"><dt className="text-muted-foreground">Nom physique</dt><dd className="font-mono text-right">{selected.collection_name}</dd></div><div className="flex justify-between gap-3"><dt className="text-muted-foreground">Embedding model</dt><dd className="font-mono text-right">{selected.embedding_model || "défaut"}</dd></div><div className="flex justify-between gap-3"><dt className="text-muted-foreground">Dimensions</dt><dd>{inspected?.embedding_dimensions || "—"}</dd></div><div className="flex justify-between gap-3"><dt className="text-muted-foreground">Distance</dt><dd>{selected.distance_metric || "cosine"}</dd></div></dl></div><div className="rounded-lg border p-4"><div className="font-medium text-sm">Statistiques</div><dl className="mt-3 space-y-2 text-xs"><div className="flex justify-between"><dt className="text-muted-foreground">Vecteurs inspectés</dt><dd>{total}</dd></div><div className="flex justify-between"><dt className="text-muted-foreground">Documents sources</dt><dd>{documents.length}</dd></div><div className="flex justify-between"><dt className="text-muted-foreground">Métadonnées</dt><dd>JSON</dd></div></dl></div></div>}
    </div>
  </section>;
}

export { parseJson };
