import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Cpu, KeyRound, Route, ShieldCheck, Activity, FileText, Boxes } from "lucide-react";
import { getCoreSettings } from "@/core/ai/coreConfig";

export default function CoreOverview({ onTab }) {
  const [stats, setStats] = useState(null);

  const load = async () => {
    const [providers, models, kbs, execs, keys, settings] = await Promise.all([
      base44.entities.AiProvider.list(),
      base44.entities.AiModel.list(),
      base44.entities.KnowledgeBase.list(),
      base44.entities.AIExecution.list("-created_date", 500),
      base44.entities.ApiKey.list(),
      getCoreSettings(),
    ]);
    const ok = execs.filter((e) => e.status === "success").length;
    const avg = execs.length ? Math.round(execs.reduce((s, e) => s + (e.execution_time || 0), 0) / execs.length) : 0;
    setStats({
      providers: providers.length, providersActive: providers.filter((p) => p.status === "active").length,
      models: models.length, modelsActive: models.filter((m) => m.status === "active").length,
      kbs: kbs.length, execs: execs.length, successRate: execs.length ? Math.round((ok / execs.length) * 1000) / 10 : 0, avg,
      keys: keys.length, currentVersion: settings.current_core_version, defaultModel: settings.default_model_name || "—",
    });
  };
  useEffect(() => { load(); }, []);

  const c = (n, active, label, icon) => (
    <Card><CardContent className="p-5">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary grid place-items-center">{icon}</div>
        <div><div className="text-2xl font-heading font-semibold">{n}{active != null && <span className="text-sm text-muted-foreground"> / {active}</span>}</div><div className="text-xs text-muted-foreground">{label}</div></div>
      </div>
    </CardContent></Card>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {c(stats?.providers ?? 0, stats?.providersActive, "Providers IA", <Cpu className="h-5 w-5" />)}
        {c(stats?.models ?? 0, stats?.modelsActive, "Modèles", <Boxes className="h-5 w-5" />)}
        {c(stats?.kbs ?? 0, null, "Knowledge Bases", <FileText className="h-5 w-5" />)}
        {c(stats?.keys ?? 0, null, "API Keys", <KeyRound className="h-5 w-5" />)}
      </div>

      <Card><CardContent className="p-5">
        <div className="flex items-center gap-2 mb-4"><Activity className="h-5 w-5 text-primary" /><h3 className="font-heading font-semibold">AI Core Health</h3></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-2 text-sm"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> API Gateway</div>
          <div className="flex items-center gap-2 text-sm"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Database</div>
          <div className="flex items-center gap-2 text-sm"><span className={`h-2.5 w-2.5 rounded-full ${stats?.providersActive ? "bg-emerald-500" : "bg-amber-500"}`} /> Providers</div>
          <div className="flex items-center gap-2 text-sm"><span className={`h-2.5 w-2.5 rounded-full ${stats?.modelsActive ? "bg-emerald-500" : "bg-amber-500"}`} /> Models</div>
          <div className="flex items-center gap-2 text-sm"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> RAG</div>
          <div className="flex items-center gap-2 text-sm"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Embeddings</div>
          <div className="flex items-center gap-2 text-sm"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Audit</div>
          <div className="flex items-center gap-2 text-sm"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Vector Store</div>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-5 pt-4 border-t border-border">
          <div><div className="text-2xl font-heading font-semibold">{stats?.execs ?? 0}</div><div className="text-xs text-muted-foreground">AI Executions</div></div>
          <div><div className="text-2xl font-heading font-semibold">{stats?.successRate ?? 0}%</div><div className="text-xs text-muted-foreground">Taux de succès</div></div>
          <div><div className="text-2xl font-heading font-semibold">{stats?.avg ? (stats.avg / 1000).toFixed(2) + "s" : "—"}</div><div className="text-xs text-muted-foreground">Temps moyen</div></div>
        </div>
      </CardContent></Card>

      <Card><CardContent className="p-5">
        <div className="flex items-center gap-2 mb-3"><Route className="h-5 w-5 text-primary" /><h3 className="font-heading font-semibold">Résolution active du Core</h3></div>
        <div className="text-sm text-muted-foreground space-y-1">
          <div>Version courante : <Badge variant="secondary" className="font-mono">v{stats?.currentVersion || "1.0.0"}</Badge></div>
          <div>Modèle par défaut : <Badge variant="outline">{stats?.defaultModel || "—"}</Badge> — utilisé par toute exécution sans policy contraire.</div>
          <div>Priorité de résolution : <span className="font-medium">Policy Use Case &gt; Module &gt; Projet &gt; Global &gt; CoreSettings defaults</span></div>
        </div>
      </CardContent></Card>

      <div className="flex gap-3 flex-wrap">
        <Link to="/executions" className="text-sm text-primary hover:underline">→ Voir les AI Executions</Link>
        <Link to="/audit" className="text-sm text-primary hover:underline">→ Voir l'Audit Trail</Link>
      </div>
    </div>
  );
}