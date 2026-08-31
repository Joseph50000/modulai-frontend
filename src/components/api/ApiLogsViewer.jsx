import { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, AlertCircle, CheckCircle2, Clock, Gauge } from "lucide-react";
import EmptyState from "@/components/EmptyState";

export default function ApiLogsViewer({ project }) {
  const [logs, setLogs] = useState(null);
  const load = async () => setLogs(await base44.entities.ApiLog.filter({ project_id: project.id }, "-created_date", 200));
  useEffect(() => { load(); }, [project.id]);
  useEffect(() => { const u = setInterval(load, 5000); return () => clearInterval(u); }, [project.id]);

  const stats = useMemo(() => {
    const arr = logs || [];
    const total = arr.length;
    const success = arr.filter((l) => l.status_code === 200).length;
    const errors = arr.filter((l) => l.status_code >= 400).length;
    const avg = total ? Math.round(arr.reduce((s, l) => s + (l.duration ?? l.execution_time ?? 0), 0) / total) : 0;
    const rateLimited = arr.filter((l) => l.rate_limited || l.status_code === 429).length;
    return { total, success, errors, avg, rateLimited };
  }, [logs]);

  if (!logs) return <div className="h-32 bg-muted rounded-lg animate-pulse" />;
  if (logs.length === 0) return <EmptyState icon={Activity} title="Aucun appel API enregistré" description="Les appels transitant par l'API Gateway (tester ou externe) apparaîtront ici." />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Stat icon={Activity} label="Total" value={stats.total} />
        <Stat icon={CheckCircle2} label="Succès" value={stats.success} tone="text-emerald-600" />
        <Stat icon={AlertCircle} label="Erreurs" value={stats.errors} tone="text-rose-600" />
        <Stat icon={Gauge} label="Rate-limit" value={stats.rateLimited} tone="text-amber-600" />
        <Stat icon={Clock} label="Temps moyen" value={`${stats.avg} ms`} />
      </div>
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs text-muted-foreground">
              <tr>
                <th className="text-left p-2.5 font-medium">Requête</th>
                <th className="text-left p-2.5 font-medium">Endpoint</th>
                <th className="text-left p-2.5 font-medium">Clé</th>
                <th className="text-left p-2.5 font-medium">Statut</th>
                <th className="text-left p-2.5 font-medium">Temps</th>
                <th className="text-left p-2.5 font-medium">Horodatage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {logs.map((l) => (
                <tr key={l.id} className="hover:bg-muted/30">
                  <td className="p-2.5"><code className="text-xs font-mono">{l.request_id}</code><div className="text-xs text-muted-foreground">{l.client_name || "—"} · {l.ip || ""}</div></td>
                  <td className="p-2.5"><Badge variant="outline" className="text-xs font-mono mr-1">{l.method}</Badge><code className="text-xs font-mono">{l.endpoint || l.endpoint_path || "—"}</code></td>
                  <td className="p-2.5 text-xs">{l.api_key_name || "—"}</td>
                  <td className="p-2.5"><StatusPill code={l.status_code} rateLimited={l.rate_limited} /></td>
                  <td className="p-2.5 text-xs text-muted-foreground">{l.duration ?? l.execution_time ?? 0} ms</td>
                  <td className="p-2.5 text-xs text-muted-foreground">{new Date(l.created_date).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, tone }) {
  return <Card><CardContent className="p-3"><div className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="h-3.5 w-3.5" /> {label}</div><div className={`text-xl font-heading font-semibold mt-1 ${tone || ""}`}>{value}</div></CardContent></Card>;
}

function StatusPill({ code, rateLimited }) {
  if (rateLimited) return <Badge variant="outline" className="text-amber-700 border-amber-300 text-xs">429</Badge>;
  if (code === 200) return <Badge variant="outline" className="text-emerald-700 border-emerald-300 text-xs">{code}</Badge>;
  return <Badge variant="outline" className="text-rose-700 border-rose-300 text-xs">{code}</Badge>;
}