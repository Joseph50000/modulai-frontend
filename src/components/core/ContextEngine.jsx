import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Layers, Search } from "lucide-react";
import { buildContext, contextToPrompt, contextSummary } from "@/core/ai/contextBuilder";
import { semanticSearch } from "@/core/ai/ragLayer";

export default function ContextEngine() {
  const [kbs, setKbs] = useState([]);
  const [kbId, setKbId] = useState("");
  const [structured, setStructured] = useState('{"titre":"Risque fraude","processus":"Paiements"}');
  const [query, setQuery] = useState("contrôles internes et mesures de maîtrise");
  const [rules, setRules] = useState("Toute analyse doit proposer des KRI");
  const [history, setHistory] = useState("Évaluation précédente : sévérité Élevée");
  const [useRag, setUseRag] = useState(true);
  const [useDocs, setUseDocs] = useState(false);
  const [preset, setPreset] = useState("");
  const [ctx, setCtx] = useState(null);

  useEffect(() => { (async () => { const list = await base44.entities.KnowledgeBase.list("-created_date", 100); setKbs(list); setKbId(list[0]?.id || ""); })(); }, []);

  const build = async () => {
    let structuredData = {};
    try { structuredData = structured.trim() ? JSON.parse(structured) : {}; } catch {}
    let searchResults = [];
    if (useRag && query.trim()) { try { searchResults = await semanticSearch({ knowledgeBaseId: kbId || undefined, query, topK: 4 }); } catch {} }
    let documents = [];
    if (useDocs && kbId) { try { documents = await base44.entities.Document.filter({ knowledge_base_id: kbId }, "-created_date", 3); } catch {} }
    const context = buildContext({
      structuredData,
      documents: documents.map((d) => ({ name: d.name, content: (d.content || "").slice(0, 600) })),
      history: history.trim() ? [history] : [],
      searchResults,
      rules: rules.trim() ? [rules] : [],
      promptInstructions: preset.trim() || "Analyse le contexte fourni et produis une évaluation structurée.",
    });
    setCtx({ context, prompt: contextToPrompt(context), summary: contextSummary(context), results: searchResults });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Layers className="h-4 w-4 text-primary" /> Le Context Engine assemble : User Input + Structured Data + Documents + RAG + History + Rules + Prompt = AI Context, consommé par le Prompt Engine.
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <Card><CardContent className="p-4 space-y-3">
          <h3 className="font-heading font-semibold text-sm">Sources</h3>
          <div><Label>Knowledge Base (RAG)</Label>
            <Select value={kbId} onValueChange={setKbId}><SelectTrigger><SelectValue placeholder="Aucune" /></SelectTrigger><SelectContent>{kbs.map((k) => <SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>)}</SelectContent></Select>
          </div>
          <div><Label>Structured Data (JSON)</Label><Textarea rows={3} value={structured} onChange={(e) => setStructured(e.target.value)} className="font-mono text-xs" /></div>
          <div><Label>Requête RAG</Label><Input value={query} onChange={(e) => setQuery(e.target.value)} /></div>
          <div><Label>Règles métier</Label><Input value={rules} onChange={(e) => setRules(e.target.value)} /></div>
          <div><Label>Historique</Label><Input value={history} onChange={(e) => setHistory(e.target.value)} /></div>
          <div><Label>Prompt (instructions)</Label><Textarea rows={3} value={preset} onChange={(e) => setPreset(e.target.value)} placeholder="Instructions injectées dans le contexte…" /></div>
          <div className="flex gap-5">
            <label className="flex items-center gap-2 text-sm"><Checkbox checked={useRag} onCheckedChange={setUseRag} /> RAG (retrieval)</label>
            <label className="flex items-center gap-2 text-sm"><Checkbox checked={useDocs} onCheckedChange={setUseDocs} /> Documents complets</label>
          </div>
          <Button onClick={build} className="w-full"><Search className="h-4 w-4 mr-1.5" /> Construire le contexte</Button>
        </CardContent></Card>

        <div className="space-y-3">
          {ctx?.summary && (
            <Card><CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2"><Search className="h-4 w-4 text-primary" /><h3 className="font-heading font-semibold text-sm">RAG results</h3></div>
              {ctx.results.length === 0 ? <p className="text-sm text-muted-foreground">Aucun passage récupéré.</p> : ctx.results.map((r, i) => (
                <div key={i} className="text-xs mb-1.5"><Badge variant="secondary" className="font-mono mr-2">{r.score.toFixed(3)}</Badge><span className="font-medium">{r.source}</span><p className="text-muted-foreground mt-0.5 line-clamp-2">{r.passage}</p></div>
              ))}
            </CardContent></Card>
          )}
          {ctx && (
            <Card><CardContent className="p-4">
              <h3 className="font-heading font-semibold text-sm mb-2">AI Context assemblé</h3>
              <div className="flex gap-1.5 flex-wrap mb-3">
                {ctx.summary.structured_data && <Badge variant="outline">Structured</Badge>}
                <Badge variant="outline">Docs: {ctx.summary.documents}</Badge>
                <Badge variant="outline">RAG: {ctx.summary.search_results}</Badge>
                <Badge variant="outline">History: {ctx.summary.history}</Badge>
                <Badge variant="outline">Rules: {ctx.summary.rules}</Badge>
              </div>
              <pre className="text-xs font-mono whitespace-pre-wrap bg-muted/50 rounded-md p-3 max-h-80 overflow-auto">{ctx.prompt}</pre>
            </CardContent></Card>
          )}
        </div>
      </div>
    </div>
  );
}