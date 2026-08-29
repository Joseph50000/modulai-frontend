import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Play, Terminal, Loader2, CheckCircle2, AlertCircle, KeyRound } from "lucide-react";
import { runGateway } from "@/core/gateway/gateway";
import EmptyState from "@/components/EmptyState";
import { dynamicGatewayUrl } from "@/config/runtime";

export default function ApiTester({ project, moduleRecords }) {
  const endpoints = useMemo(() => (moduleRecords || []).flatMap((m) => (m.endpoints || []).map((ep) => ({ ep, m, uc: (m.use_cases || []).find((u) => u.key === ep.use_case_key) }))), [moduleRecords]);
  const [selKey, setSelKey] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [body, setBody] = useState({});
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);

  const current = endpoints.find((x) => x.ep.key === selKey);

  const onPick = (k) => {
    setSelKey(k);
    const c = endpoints.find((x) => x.ep.key === k);
    const b = {};
    (c?.uc?.input_schema || []).forEach((f) => { b[f.name] = f.type === "number" ? "" : f.type === "array" ? [] : ""; });
    setBody(b);
    setResult(null);
  };

  const run = async () => {
    if (!current || !apiKey) return;
    setRunning(true); setResult(null);
    try {
      const res = await runGateway({ apiKey, path: current.ep.path, method: current.ep.method || "POST", body, clientName: "in-app-tester", projectId: project.id });
      setResult(res);
    } catch (e) { setResult({ success: false, status_code: 500, error: e.message, request_id: "—" }); }
    finally { setRunning(false); }
  };

  if (endpoints.length === 0) return <EmptyState icon={Terminal} title="Aucun endpoint à tester" description="Définissez des endpoints sur les modules installés pour les tester via le gateway." />;

  const path = current?.ep.path || "";
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const gatewayUrl = dynamicGatewayUrl(cleanPath);
  const curlCmd = `curl -X POST ${gatewayUrl} \\
  -H "Authorization: Bearer ${apiKey || "<API_KEY>"}" \\
  -H "Content-Type: application/json" \\
  -H "x-project-id: ${project.id}" \\
  -d '${JSON.stringify(body, null, 2)}'`;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>Endpoint</Label>
          <Select value={selKey} onValueChange={onPick}>
            <SelectTrigger><SelectValue placeholder="Sélectionnez un endpoint…" /></SelectTrigger>
            <SelectContent>{endpoints.map((x) => <SelectItem key={x.ep.key} value={x.ep.key}><span className="font-mono text-xs">{x.ep.method || "POST"} {x.ep.path}</span> · {x.m.name}</SelectItem>)}</SelectContent>
          </Select>
          {current && (current.ep.required_scopes || []).length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1.5">{current.ep.required_scopes.map((s) => <Badge key={s} className="text-xs font-mono font-normal">{s}</Badge>)}</div>
          )}
        </div>

        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5"><KeyRound className="h-3.5 w-3.5" /> Clé API</Label>
          <Input value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk_proj_…" className="font-mono text-xs" />
          <p className="text-xs text-muted-foreground">Collez une clé créée dans l'onglet « API Keys ». La clé détermine le projet et les scopes.</p>
        </div>

        {current?.uc?.input_schema?.map((f) => (
          <div key={f.name} className="space-y-1">
            <Label className="text-xs">{f.name} {f.required && <span className="text-destructive">*</span>} <span className="text-muted-foreground font-normal">({f.type})</span></Label>
            {f.type === "array" ? (
              <textarea value={Array.isArray(body[f.name]) ? body[f.name].join(", ") : body[f.name]} onChange={(e) => setBody({ ...body, [f.name]: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} className="w-full min-h-20 text-sm rounded-md border border-input bg-transparent px-3 py-2" />
            ) : (
              <Input value={body[f.name] ?? ""} onChange={(e) => setBody({ ...body, [f.name]: e.target.value })} placeholder={f.description || f.name} />
            )}
          </div>
        ))}

        <Button onClick={run} disabled={!current || !apiKey || running}>
          {running ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Play className="h-4 w-4 mr-1.5" />} {running ? "Exécution…" : "Exécuter l'appel API"}
        </Button>

        <div>
          <Label className="text-xs mb-1.5 block">Équivalent cURL (gateway externe)</Label>
          <pre className="text-xs bg-muted rounded-md p-3 font-mono overflow-x-auto whitespace-pre-wrap">{curlCmd}</pre>
        </div>
      </div>

      <div>
        <Label className="text-xs mb-1.5 block">Réponse</Label>
        {!result ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Le résultat de l'appel apparaîtra ici, avec le <code className="font-mono">request_id</code> et l'<code className="font-mono">execution_id</code>.</div>
        ) : (
          <div className="rounded-lg border border-border p-4 bg-card text-sm">
            <div className="flex items-center gap-2 mb-3">
              {result.success ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertCircle className="h-4 w-4 text-rose-600" />}
              <Badge variant="outline" className={result.success ? "text-emerald-700 border-emerald-300" : "text-rose-700 border-rose-300"}>{result.status_code}</Badge>
              <code className="text-xs text-muted-foreground font-mono">{result.request_id}</code>
            </div>
            {result.execution_id && <div className="text-xs text-muted-foreground mb-2">execution_id: <code className="font-mono">{result.execution_id}</code></div>}
            {result.error && <div className="text-rose-600 text-sm mb-2">{result.error}</div>}
            {result.data && <pre className="text-xs bg-muted rounded-md p-3 font-mono overflow-x-auto">{JSON.stringify(result.data, null, 2)}</pre>}
            {result.key_preview && <div className="text-xs text-muted-foreground mt-2">Clé utilisée : <code className="font-mono">{result.key_preview}</code></div>}
          </div>
        )}
      </div>
    </div>
  );
}