import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import EmptyState from "@/components/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Cpu, Blocks, ShieldCheck, Plus, ArrowLeft, ArrowRight, Package, Zap, KeyRound } from "lucide-react";
import { PROVIDER_OPTIONS, DEFAULT_PROVIDER } from "@/lib/platform";
import UseCaseRunner from "@/components/projects/UseCaseRunner";
import ProjectCoreConfig from "@/components/core/ProjectCoreConfig";

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [project, setProject] = useState(null);
  const [risks, setRisks] = useState([]);
  const [moduleRecords, setModuleRecords] = useState({});
  const [provider, setProvider] = useState(DEFAULT_PROVIDER);
  const [runner, setRunner] = useState(null); // { moduleVersion, useCase }

  const load = async () => {
    const p = await base44.entities.Project.get(id);
    setProject(p);
    setRisks(await base44.entities.Risk.filter({ project_id: id }, "-created_date", 100));
    const recs = {};
    await Promise.all((p.modules || []).map(async (m) => {
      try { recs[m.module_id] = await base44.entities.Module.get(m.module_id); } catch (_) { recs[m.module_id] = null; }
    }));
    setModuleRecords(recs);
  };

  useEffect(() => { load(); }, [id]);

  if (!project) return <div className="p-10"><div className="h-6 w-64 bg-muted rounded animate-pulse" /></div>;

  const removeModule = async (moduleId) => {
    const updated = (project.modules || []).filter((m) => m.module_id !== moduleId);
    await base44.entities.Project.update(id, { modules: updated });
    toast({ title: "Module retiré du projet" });
    load();
  };

  const hasRiskModule = (project.modules || []).some((m) => m.name === "Risk Management");
  const useCases = (project.modules || []).flatMap((m) => {
    const rec = moduleRecords[m.module_id];
    if (!rec) return [];
    return (rec.use_cases || []).map((uc) => ({ moduleRef: m, moduleRecord: rec, uc }));
  });

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto">
      <Button variant="ghost" size="sm" onClick={() => navigate("/projects")} className="mb-4 -ml-2 text-muted-foreground">
        <ArrowLeft className="h-4 w-4 mr-1.5" /> Projets
      </Button>

      <PageHeader title={project.name} subtitle={project.description || "Aucune description"}>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" onClick={() => navigate(`/projects/${id}/api`)}>
            <KeyRound className="h-4 w-4 mr-2" /> API & Integrations
          </Button>
          {hasRiskModule && (
            <Button onClick={() => navigate(`/projects/${id}/risk`)}>
              <ShieldCheck className="h-4 w-4 mr-2" /> Ouvrir le module Risk
            </Button>
          )}
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Cpu className="h-4 w-4" /> AI Core</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-heading font-semibold">AI Core v{project.core_version}</div>
                <p className="text-sm text-muted-foreground mt-1">Le socle générique : provider IA, prompt engine, context builder, RAG, structured output, exécutions et audit.</p>
              </div>
              <div className="flex items-center gap-2">
                {useCases.length > 0 && (
                  <select value={provider} onChange={(e) => setProvider(e.target.value)} className="text-xs h-8 rounded-md border border-border bg-background px-2">
                    {PROVIDER_OPTIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                )}
                <StatusBadge status="active" label="Actif" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><Blocks className="h-4 w-4" /> Modules installés</CardTitle>
            <Button asChild variant="outline" size="sm"><Link to="/modules"><Plus className="h-3.5 w-3.5 mr-1" /> Ajouter</Link></Button>
          </CardHeader>
          <CardContent>
            {(project.modules || []).length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">Aucun module installé. Ajoutez-en depuis le Module Registry.</p>
            ) : (
              <div className="space-y-3">
                {(project.modules || []).map((m) => {
                  const rec = moduleRecords[m.module_id];
                  return (
                    <div key={m.module_id} className="flex items-center justify-between rounded-lg border border-border p-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium flex items-center gap-2">{m.name}<Badge variant="outline" className="font-mono text-xs">v{m.version}</Badge></div>
                        <div className="text-xs text-muted-foreground mt-0.5">{rec ? `${(rec.use_cases || []).length} Use Case(s)` : "—"}</div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button asChild variant="ghost" size="sm"><Link to={`/modules/${m.module_id}`}>Ouvrir</Link></Button>
                        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive" onClick={() => removeModule(m.module_id)}>Retirer</Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Separator className="my-8" />

      <ProjectCoreConfig project={project} onSaved={load} />

      <Separator className="my-8" />

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-heading font-semibold flex items-center gap-2"><Zap className="h-5 w-5" /> Use Cases IA</h2>
      </div>
      {useCases.length === 0 ? (
        <EmptyState icon={Zap} title="Aucun Use Case exécutable" description="Installez un module avec des Use Cases définis, puis exécutez-les : le Core lit la définition du module.">
          <Button asChild variant="outline"><Link to="/modules">Parcourir le Registry</Link></Button>
        </EmptyState>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {useCases.map(({ moduleRef, moduleRecord, uc }) => (
            <Card key={moduleRef.module_id + uc.key} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-medium text-sm">{uc.name}</h3>
                  <Badge variant="outline" className="font-mono text-xs">{uc.key}</Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-1.5">{moduleRecord.name} v{moduleRef.version}</div>
                {uc.description && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{uc.description}</p>}
                <Button size="sm" className="w-full mt-4" onClick={() => setRunner({ moduleVersion: moduleRecord, useCase: uc })}>
                  <Zap className="h-3.5 w-3.5 mr-1.5" /> Exécuter le Use Case
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Separator className="my-8" />

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-heading font-semibold flex items-center gap-2"><ShieldCheck className="h-5 w-5" /> Risques analysés (module Risk)</h2>
        {hasRiskModule && <Button variant="outline" size="sm" onClick={() => navigate(`/projects/${id}/risk`)}>Gérer les risques</Button>}
      </div>

      {risks.length === 0 ? (
        <EmptyState icon={Package} title="Aucun risque" description={hasRiskModule ? "Ouvrez le module Risk pour créer et analyser votre premier risque." : "Installez le module Risk Management pour commencer."}>
          {hasRiskModule ? <Button onClick={() => navigate(`/projects/${id}/risk`)}>Ouvrir le module Risk</Button> : <Button asChild variant="outline"><Link to="/modules">Installer le module</Link></Button>}
        </EmptyState>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {risks.map((r) => (
            <Link key={r.id} to={`/projects/${id}/risk/${r.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-medium text-sm">{r.title}</h3>
                    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{r.processus || "—"} · {r.evenement || "—"}</div>
                  <div className="mt-3"><StatusBadge status={r.status} /></div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {runner && (
        <UseCaseRunner open={!!runner} onOpenChange={(o) => !o && setRunner(null)} project={project} moduleVersion={runner.moduleVersion} useCase={runner.useCase} provider={provider} />
      )}
    </div>
  );
}