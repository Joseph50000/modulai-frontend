import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Code2, FileJson, BookOpen, Download, Copy, Check } from "lucide-react";
import EmptyState from "@/components/EmptyState";
import { dynamicGatewayUrl } from "@/config/runtime";

const generateOpenAPI = (project) => ({ openapi: "3.0.0", info: { title: project?.name || "API", version: "1.0.0" }, paths: {} });
const listScopes = () => ["execute"];

export default function ApiDocumentation({ project, moduleRecords, baseUrl }) {
  const endpoints = useMemo(() => (moduleRecords || []).flatMap((m) => (m.endpoints || []).map((ep) => ({ ep, m, uc: (m.use_cases || []).find((u) => u.key === ep.use_case_key) }))), [moduleRecords]);
  const spec = useMemo(() => generateOpenAPI(project, moduleRecords, baseUrl), [project, moduleRecords, baseUrl]);
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState("endpoints");

  if (endpoints.length === 0) return <EmptyState icon={BookOpen} title="Aucune documentation à générer" description="Définissez des endpoints sur vos modules pour générer automatiquement la documentation API." />;

  const copySpec = () => { navigator.clipboard.writeText(JSON.stringify(spec, null, 2)); setCopied(true); setTimeout(() => setCopied(false), 1500); };
  const downloadSpec = () => { const blob = new Blob([JSON.stringify(spec, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `${project.name.replace(/\s+/g, "-").toLowerCase()}-openapi.json`; a.click(); URL.revokeObjectURL(url); };

  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList className="w-full justify-start mb-4 grid grid-cols-2 sm:grid-cols-4">
        <TabsTrigger value="endpoints" className="text-xs"><BookOpen className="h-3.5 w-3.5 mr-1.5" /> Endpoints</TabsTrigger>
        <TabsTrigger value="module" className="text-xs"><Code2 className="h-3.5 w-3.5 mr-1.5" /> Par module</TabsTrigger>
        <TabsTrigger value="auth" className="text-xs">Authentification</TabsTrigger>
        <TabsTrigger value="openapi" className="text-xs"><FileJson className="h-3.5 w-3.5 mr-1.5" /> OpenAPI</TabsTrigger>
      </TabsList>

      <TabsContent value="endpoints" className="space-y-4 mt-0">
        {endpoints.map(({ ep, m, uc }) => {
          // L'API Gateway Node.js prend directement les variables dans le body, plus besoin de wrapper {path, method, body}
          const bodyObj = uc && (uc.input_schema || []).length ? exampleBody(uc.input_schema) : {};
          const body = JSON.stringify(bodyObj);
          const cleanPath = ep.path.startsWith('/') ? ep.path : `/${ep.path}`;
          const apiUrl = dynamicGatewayUrl(cleanPath);
          const curl = `curl -X POST ${apiUrl} \\\n  -H "Authorization: Bearer $API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -H "x-project-id: ${project.id}" \\\n  -d '${body}'`;
          return (
            <div key={ep.key} className="rounded-lg border border-border p-4 bg-card text-sm">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="font-mono text-xs">{ep.method || "POST"}</Badge>
                <code className="font-mono">{apiUrl}</code>
                <Badge variant="secondary" className="text-xs font-normal">{m.name}</Badge>
              </div>
              {ep.description && <p className="text-muted-foreground mt-2">{ep.description}</p>}
              <h4 className="font-medium mt-3 mb-1.5">Authentification</h4>
              <pre className="text-xs bg-muted rounded-md p-2 font-mono">Authorization: Bearer &lt;API_KEY&gt;</pre>
              {(ep.required_scopes || []).length > 0 && <div className="mt-3"><h4 className="font-medium mb-1.5">Scopes requis</h4><div className="flex flex-wrap gap-1.5">{ep.required_scopes.map((s) => <Badge key={s} className="text-xs font-mono font-normal">{s}</Badge>)}</div></div>}
              {uc && (uc.input_schema || []).length > 0 && <SchemaBlock title="Requête" fields={uc.input_schema} />}
              {uc && (uc.output_schema || []).length > 0 && <SchemaBlock title="Réponse" fields={uc.output_schema} />}
              {uc && (uc.input_schema || []).length > 0 && (
                <div className="mt-3"><h4 className="font-medium mb-1.5">Exemple</h4><pre className="text-xs bg-muted rounded-md p-2 font-mono overflow-x-auto whitespace-pre-wrap">{curl}</pre></div>
              )}
            </div>
          );
        })}
      </TabsContent>

      <TabsContent value="module" className="mt-0 space-y-3">
        {(moduleRecords || []).filter((m) => (m.endpoints || []).length > 0).map((m) => (
          <div key={m.id} className="rounded-lg border border-border p-4 bg-card">
            <h4 className="font-medium text-sm">{m.name} <Badge variant="outline" className="font-mono text-xs ml-1">v{m.version}</Badge></h4>
            <p className="text-xs text-muted-foreground mt-1">{m.description}</p>
            <div className="mt-3 space-y-1.5">
              {(m.endpoints || []).map((ep) => (
                <div key={ep.key} className="flex items-center gap-2 text-xs">
                  <Badge variant="outline" className="font-mono">{ep.method || "POST"}</Badge>
                  <code className="font-mono">{ep.path}</code>
                  <span className="text-muted-foreground">— {ep.name}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </TabsContent>

      <TabsContent value="auth" className="mt-0 text-sm space-y-3">
        <div className="rounded-lg border border-border p-4 bg-card">
          <h4 className="font-medium">Authentification par clé API</h4>
          <ol className="list-decimal list-inside text-muted-foreground space-y-1.5 mt-2 text-sm">
            <li>Créez une clé API sur ce projet avec les scopes nécessaires.</li>
            <li>La clé (<code className="font-mono">sk_proj_…</code>) détermine le projet : impossible d'accéder à un autre projet.</li>
            <li>Passez-la dans l'en-tête <code className="font-mono">Authorization: Bearer &lt;API_KEY&gt;</code>.</li>
            <li>Le gateway vérifie la clé, les scopes, le rate limiting, puis exécute le Use Case IA.</li>
            <li>Scopes disponibles : {listScopes(moduleRecords).map((s) => <code key={s} className="font-mono mx-1">{s}</code>)}</li>
          </ol>
        </div>
      </TabsContent>

      <TabsContent value="openapi" className="mt-0">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-muted-foreground">Spécification OpenAPI 3.0 générée automatiquement.</p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={copySpec}>{copied ? <Check className="h-3.5 w-3.5 mr-1 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 mr-1" />} Copier</Button>
            <Button size="sm" variant="outline" onClick={downloadSpec}><Download className="h-3.5 w-3.5 mr-1" /> Télécharger</Button>
          </div>
        </div>
        <pre className="text-xs bg-muted rounded-lg p-4 font-mono overflow-auto max-h-[500px]">{JSON.stringify(spec, null, 2)}</pre>
      </TabsContent>
    </Tabs>
  );
}

function SchemaBlock({ title, fields }) {
  return (
    <div className="mt-3">
      <h4 className="font-medium mb-1.5">{title}</h4>
      <div className="rounded-md border border-border overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-muted/50 text-muted-foreground"><tr><th className="text-left p-2 font-medium">Champ</th><th className="text-left p-2 font-medium">Type</th><th className="text-left p-2 font-medium">Requis</th><th className="text-left p-2 font-medium">Description</th></tr></thead>
          <tbody className="divide-y divide-border">
            {fields.map((f) => (
              <tr key={f.name}><td className="p-2 font-mono">{f.name}</td><td className="p-2">{f.type}</td><td className="p-2">{f.required ? "✓" : ""}</td><td className="p-2 text-muted-foreground">{f.description || ""}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function exampleBody(fields) {
  const o = {};
  fields.forEach((f) => {
    if (f.type === "number") o[f.name] = 1;
    else if (f.type === "array") o[f.name] = [];
    else if (f.type === "boolean") o[f.name] = false;
    else o[f.name] = "";
  });
  return o;
}