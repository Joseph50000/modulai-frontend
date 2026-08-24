import { Badge } from "@/components/ui/badge";
import { Blocks, Route } from "lucide-react";
import EmptyState from "@/components/EmptyState";

export default function ApiEndpointsViewer({ moduleRecords }) {
  const endpoints = (moduleRecords || []).flatMap((m) => (m.endpoints || []).map((ep) => ({ ep, m, uc: (m.use_cases || []).find((u) => u.key === ep.use_case_key) })));
  if (endpoints.length === 0) return <EmptyState icon={Route} title="Aucun endpoint exposé" description="Définissez des endpoints sur vos modules installés dans le Module Registry pour les exposer via l'API." />;
  return (
    <div className="space-y-3">
      {endpoints.map(({ ep, m, uc }) => (
        <div key={ep.key} className="rounded-lg border border-border p-4 bg-card">
          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant="outline" className="font-mono text-xs">{ep.method || "POST"}</Badge>
            <code className="text-sm font-mono">{ep.path}</code>
            <Badge variant="secondary" className="text-xs font-normal">{m.name}</Badge>
          </div>
          <div className="font-medium text-sm mt-2">{ep.name}</div>
          {ep.description && <p className="text-xs text-muted-foreground mt-1">{ep.description}</p>}
          <div className="flex flex-wrap gap-1 mt-2">
            {(ep.required_scopes || []).map((s) => <Badge key={s} className="text-xs font-mono font-normal">{s}</Badge>)}
            {(!ep.required_scopes || ep.required_scopes.length === 0) && <span className="text-xs text-muted-foreground">Aucun scope requis</span>}
          </div>
          {uc && (uc.input_schema || []).length > 0 && (
            <details className="mt-3"><summary className="text-xs text-muted-foreground cursor-pointer">Schéma d'entrée ({uc.input_schema.length} champs)</summary>
              <ul className="mt-1 text-xs text-muted-foreground space-y-0.5 pl-4">
                {uc.input_schema.map((f) => <li key={f.name}><code className="font-mono">{f.name}</code> ({f.type}{f.required ? ", requis" : ""}) — {f.description || ""}</li>)}
              </ul>
            </details>
          )}
        </div>
      ))}
    </div>
  );
}