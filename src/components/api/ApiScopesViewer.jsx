import { Badge } from "@/components/ui/badge";
import { ShieldCheck } from "lucide-react";
import EmptyState from "@/components/EmptyState";

export default function ApiScopesViewer({ moduleRecords, keys }) {
  const scopeDefs = [];
  const seen = new Set();
  (moduleRecords || []).forEach((m) => (m.endpoints || []).forEach((ep) => (ep.required_scopes || []).forEach((s) => {
    if (!seen.has(s)) { seen.add(s); scopeDefs.push({ scope: s, ep, module: m.name }); }
  })));
  if (scopeDefs.length === 0) return <EmptyState icon={ShieldCheck} title="Aucun scope défini" description="Les scopes sont dérivés des endpoints exposés par les modules." />;

  const keysFor = (scope) => (keys || []).filter((k) => (k.scopes || []).includes(scope) && k.status !== "revoked");

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground mb-3">Les scopes limitent ce qu'une clé peut faire. Le gateway vérifie les scopes avant chaque appel.</p>
      <div className="rounded-lg border border-border divide-y divide-border overflow-hidden">
        {scopeDefs.map(({ scope, ep, module }) => (
          <div key={scope} className="flex items-center justify-between gap-3 p-3 bg-card">
            <div className="min-w-0">
              <code className="text-sm font-mono">{scope}</code>
              <div className="text-xs text-muted-foreground mt-0.5">{ep.name} · {module} · <code className="font-mono">{ep.method} {ep.path}</code></div>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              {keysFor(scope).length === 0 ? <span className="text-xs text-muted-foreground">Aucune clé</span> : keysFor(scope).map((k) => <Badge key={k.id} variant="secondary" className="text-xs font-normal">{k.name}</Badge>)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}