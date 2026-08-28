import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, KeyRound, Route, ShieldCheck, Activity, BookOpen, Terminal, Globe, Cpu, Blocks, Layers } from "lucide-react";
import ApiKeyManager from "@/components/api/ApiKeyManager";
import ApiEndpointsViewer from "@/components/api/ApiEndpointsViewer";
import ApiScopesViewer from "@/components/api/ApiScopesViewer";
import ApiLogsViewer from "@/components/api/ApiLogsViewer";
import ApiDocumentation from "@/components/api/ApiDocumentation";
import ApiTester from "@/components/api/ApiTester";
import { listScopes } from "@/core/gateway/openapi";

export default function ProjectApi() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [moduleRecords, setModuleRecords] = useState([]);
  const [keys, setKeys] = useState([]);
  const [tab, setTab] = useState(() => localStorage.getItem(`modulai-tab-api-${id}`) || "overview");
  
  useEffect(() => {
    localStorage.setItem(`modulai-tab-api-${id}`, tab);
  }, [tab, id]);
  const baseUrl = (typeof window !== "undefined" && window.location.origin) || "";

  const load = async () => {
    const p = await base44.entities.Project.get(id);
    setProject(p);
    const recs = [];
    await Promise.all((p.modules || []).map(async (m) => { try { recs.push(await base44.entities.Module.get(m.module_id)); } catch (_) {} }));
    setModuleRecords(recs);
    setKeys(await base44.entities.ApiKey.filter({ project_id: id }, "-created_date", 100));
  };
  useEffect(() => { load(); }, [id]);

  const availableScopes = useMemo(() => listScopes(moduleRecords), [moduleRecords]);
  const endpointCount = moduleRecords.reduce((s, m) => s + (m.endpoints || []).length, 0);

  if (!project) return <div className="p-10"><div className="h-6 w-64 bg-muted rounded animate-pulse" /></div>;

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto">
      <Button variant="ghost" size="sm" onClick={() => navigate(`/projects/${id}`)} className="mb-4 -ml-2 text-muted-foreground">
        <ArrowLeft className="h-4 w-4 mr-1.5" /> {project.name}
      </Button>

      <PageHeader title="API & Integrations" subtitle={`Exposition sécurisée des fonctionnalités du projet « ${project.name} ». Clés d'API, scopes, gateway, logs et documentation auto-générée.`} />

      <Tabs value={tab} onValueChange={setTab} className="mt-6">
        <TabsList className="w-full justify-start overflow-x-auto grid grid-cols-3 sm:grid-cols-7 h-auto">
          <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
          <TabsTrigger value="keys" className="text-xs">API Keys</TabsTrigger>
          <TabsTrigger value="endpoints" className="text-xs">Endpoints</TabsTrigger>
          <TabsTrigger value="scopes" className="text-xs">Scopes</TabsTrigger>
          <TabsTrigger value="usage" className="text-xs">Usage</TabsTrigger>
          <TabsTrigger value="docs" className="text-xs">Documentation</TabsTrigger>
          <TabsTrigger value="tester" className="text-xs">Tester</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card><CardContent className="p-5"><div className="flex items-center gap-3"><div className="h-10 w-10 rounded-lg bg-primary/10 text-primary grid place-items-center"><KeyRound className="h-5 w-5" /></div><div><div className="text-2xl font-heading font-semibold">{keys.length}</div><div className="text-xs text-muted-foreground">Clés API</div></div></div></CardContent></Card>
            <Card><CardContent className="p-5"><div className="flex items-center gap-3"><div className="h-10 w-10 rounded-lg bg-primary/10 text-primary grid place-items-center"><Route className="h-5 w-5" /></div><div><div className="text-2xl font-heading font-semibold">{endpointCount}</div><div className="text-xs text-muted-foreground">Endpoints exposés</div></div></div></CardContent></Card>
            <Card><CardContent className="p-5"><div className="flex items-center gap-3"><div className="h-10 w-10 rounded-lg bg-primary/10 text-primary grid place-items-center"><ShieldCheck className="h-5 w-5" /></div><div><div className="text-2xl font-heading font-semibold">{availableScopes.length}</div><div className="text-xs text-muted-foreground">Scopes</div></div></div></CardContent></Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-heading font-semibold flex items-center gap-2"><Cpu className="h-4 w-4" /> Architecture du Gateway</h3>
              <div className="rounded-lg border border-border bg-card p-4 text-sm font-mono text-muted-foreground leading-relaxed">
                <div>Application externe</div>
                <div className="pl-4">│  <code className="text-foreground">Authorization: Bearer sk_proj_…</code></div>
                <div className="pl-4">↓</div>
                <div><span className="text-primary">API Gateway</span> <code className="text-foreground">/functions/apiGateway</code></div>
                <div className="pl-4">│  auth · scope · rate-limit</div>
                <div className="pl-4">↓</div>
                <div>Project → Module → Use Case</div>
                <div className="pl-4">↓</div>
                <div>AI Core (Engine · RAG · Audit)</div>
                <div className="pl-4">↓</div>
                <div>Réponse structurée + <code className="text-foreground">request_id</code></div>
              </div>
              {endpointCount === 0 && (
                <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
                  Aucun endpoint exposé. <Link to="/modules" className="underline">Définissez des endpoints</Link> sur vos modules installés pour activer l'API.
                </div>
              )}
            </div>

            <div className="space-y-4">
              <h3 className="font-heading font-semibold flex items-center gap-2"><Globe className="h-4 w-4" /> Endpoint du gateway</h3>
              <div className="rounded-lg border border-border bg-card p-4 space-y-2 text-sm">
                <div><span className="text-muted-foreground">URL :</span> <code className="font-mono">{baseUrl}/functions/apiGateway</code></div>
                <div><span className="text-muted-foreground">Méthode :</span> POST</div>
                <div><span className="text-muted-foreground">Auth :</span> <code className="font-mono">Bearer &lt;API_KEY&gt;</code></div>
                <div><span className="text-muted-foreground">Corps :</span> <code className="font-mono">{"{ path, method, body }"}</code></div>
                <div className="pt-2 border-t border-border">
                  <span className="text-muted-foreground text-xs">Le gateway externe (HTTP public) nécessite un plan Builder+. Le tester ci-dessous exécute le même flux dans l'app.</span>
                </div>
              </div>
              <Button onClick={() => setTab("keys")}><KeyRound className="h-4 w-4 mr-1.5" /> Créer une clé API</Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="keys" className="mt-6"><ApiKeyManager project={project} availableScopes={availableScopes} onChange={load} /></TabsContent>
        <TabsContent value="endpoints" className="mt-6"><ApiEndpointsViewer moduleRecords={moduleRecords} /></TabsContent>
        <TabsContent value="scopes" className="mt-6"><ApiScopesViewer moduleRecords={moduleRecords} keys={keys} /></TabsContent>
        <TabsContent value="usage" className="mt-6"><ApiLogsViewer project={project} /></TabsContent>
        <TabsContent value="docs" className="mt-6"><ApiDocumentation project={project} moduleRecords={moduleRecords} baseUrl={baseUrl} /></TabsContent>
        <TabsContent value="tester" className="mt-6"><ApiTester project={project} moduleRecords={moduleRecords} /></TabsContent>
      </Tabs>
    </div>
  );
}