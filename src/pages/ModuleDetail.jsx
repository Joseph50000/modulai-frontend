import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Share2, Rocket, Archive, Pencil } from "lucide-react";
import { recordAudit } from "@/core/ai/auditTrail";
import ModuleOverview from "@/components/modules/ModuleOverview";
import ModuleFeaturesManager from "@/components/modules/ModuleFeaturesManager";
import ModuleUseCasesManager from "@/components/modules/ModuleUseCasesManager";
import ModulePromptsManager from "@/components/modules/ModulePromptsManager";
import ModuleSchemasViewer from "@/components/modules/ModuleSchemasViewer";
import ModuleDataSourcesManager from "@/components/modules/ModuleDataSourcesManager";
import ModuleDependenciesManager from "@/components/modules/ModuleDependenciesManager";
import ModuleVersionsManager from "@/components/modules/ModuleVersionsManager";
import ModuleConfigurationManager from "@/components/modules/ModuleConfigurationManager";
import ModuleEndpointsManager from "@/components/api/ModuleEndpointsManager";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "features", label: "Features" },
  { id: "usecases", label: "AI Use Cases" },
  { id: "prompts", label: "Prompts" },
  { id: "inputs", label: "Input Schemas" },
  { id: "outputs", label: "Output Schemas" },
  { id: "sources", label: "Data Sources" },
  { id: "deps", label: "Dependencies" },
  { id: "endpoints", label: "API Endpoints" },
  { id: "versions", label: "Versions" },
  { id: "config", label: "Configuration" },
];

export default function ModuleDetail() {
  const { moduleId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [module, setModule] = useState(null);
  const [tab, setTab] = useState("overview");

  const load = useCallback(async () => {
    setModule(await base44.entities.Module.get(moduleId));
  }, [moduleId]);

  useEffect(() => { load(); }, [load]);

  const updateModule = useCallback(async (patch) => {
    const updated = await base44.entities.Module.update(moduleId, patch);
    setModule(updated);
  }, [moduleId]);

  const publish = async () => {
    await updateModule({ lifecycle: "published" });
    await recordAudit({ module_id: moduleId, module_name: module.name, user_id: user?.id, user_name: user?.full_name || user?.email, action: "modified", entity_type: "Module", entity_id: moduleId, new_value: { lifecycle: "published", version: module.version } });
    toast({ title: "Module publié", description: `${module.name} v${module.version} est désormais utilisable dans les projets.` });
  };
  const archive = async () => {
    await updateModule({ lifecycle: "archived" });
    toast({ title: "Version archivée" });
  };
  const unarchive = async () => {
    await updateModule({ lifecycle: "published" });
    toast({ title: "Version désarchivée", description: "Le module est de nouveau actif." });
  };

  if (!module) return <div className="p-10"><div className="h-6 w-64 bg-muted rounded animate-pulse" /></div>;

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto">
      <Button variant="ghost" size="sm" onClick={() => navigate("/modules")} className="mb-4 -ml-2 text-muted-foreground">
        <ArrowLeft className="h-4 w-4 mr-1.5" /> Module Registry
      </Button>

      <PageHeader title={module.name} subtitle={module.description || "Module métier"}>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="font-mono">v{module.version}</Badge>
          <StatusBadge status={module.lifecycle} />
          {module.lifecycle === "draft" && <Button size="sm" onClick={publish}><Rocket className="h-4 w-4 mr-1.5" /> Publier</Button>}
          {module.lifecycle === "published" && <Button size="sm" variant="outline" onClick={archive}><Archive className="h-4 w-4 mr-1.5" /> Archiver</Button>}
          {module.lifecycle === "archived" && <Button size="sm" variant="outline" onClick={unarchive}><Rocket className="h-4 w-4 mr-1.5" /> Désarchiver</Button>}
        </div>
      </PageHeader>

      <div className="flex flex-wrap gap-1.5 mb-6 border-b border-border pb-3 -mx-1 px-1 overflow-x-auto">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 text-sm rounded-md whitespace-nowrap transition-colors ${tab === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && <ModuleOverview module={module} />}
      {tab === "features" && <ModuleFeaturesManager module={module} updateModule={updateModule} />}
      {tab === "usecases" && <ModuleUseCasesManager module={module} updateModule={updateModule} />}
      {tab === "prompts" && <ModulePromptsManager module={module} />}
      {tab === "inputs" && <ModuleSchemasViewer module={module} kind="input" />}
      {tab === "outputs" && <ModuleSchemasViewer module={module} kind="output" />}
      {tab === "sources" && <ModuleDataSourcesManager module={module} updateModule={updateModule} />}
      {tab === "deps" && <ModuleDependenciesManager module={module} updateModule={updateModule} />}
      {tab === "endpoints" && <ModuleEndpointsManager moduleData={module} onChange={updateModule} />}
      {tab === "versions" && <ModuleVersionsManager module={module} onNewVersion={load} />}
      {tab === "config" && <ModuleConfigurationManager module={module} updateModule={updateModule} />}
    </div>
  );
}