import { useState } from "react";
import PageHeader from "@/components/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CoreOverview from "@/components/core/CoreOverview";
import ProvidersManager from "@/components/core/ProvidersManager";
import ModelsManager from "@/components/core/ModelsManager";
import PoliciesManager from "@/components/core/PoliciesManager";
import CorePromptsManager from "@/components/core/CorePromptsManager";
import ContextEngine from "@/components/core/ContextEngine";
import RagManager from "@/components/core/RagManager";
import KnowledgeBasesManager from "@/components/core/KnowledgeBasesManager";
import CoreSettingsForm from "@/components/core/CoreSettingsForm";
import CoreVersionsManager from "@/components/core/CoreVersionsManager";

const TABS = [
  ["overview", "Overview"],
  ["providers", " Providers"],
  ["models", "Models"],
  ["policies", "Policies"],
  ["prompts", "Prompt Engine"],
  ["context", "Context"],
  ["rag", "RAG"],
  ["kbs", "Knowledge Bases"],
  ["settings", "Core Settings"],
  ["versions", "Versions"],
];

export default function CoreAdmin() {
  const [tab, setTab] = useState("overview");
  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto">
      <PageHeader title="AI Core" subtitle="Infrastructure IA configurable : providers, modèles, routage, prompts, RAG, policies, audit et versionnage. Le Core choisit le modèle pour chaque exécution — les modules restent génériques." />
      <Tabs value={tab} onValueChange={setTab} className="mt-6">
        <TabsList className="w-full justify-start overflow-x-auto grid grid-cols-4 sm:grid-cols-10 h-auto">
          {TABS.map(([id, label]) => <TabsTrigger key={id} value={id} className="text-xs">{label.trim()}</TabsTrigger>)}
        </TabsList>
        <TabsContent value="overview" className="mt-6"><CoreOverview /></TabsContent>
        <TabsContent value="providers" className="mt-6"><ProvidersManager /></TabsContent>
        <TabsContent value="models" className="mt-6"><ModelsManager /></TabsContent>
        <TabsContent value="policies" className="mt-6"><PoliciesManager /></TabsContent>
        <TabsContent value="prompts" className="mt-6"><CorePromptsManager /></TabsContent>
        <TabsContent value="context" className="mt-6"><ContextEngine /></TabsContent>
        <TabsContent value="rag" className="mt-6"><RagManager /></TabsContent>
        <TabsContent value="kbs" className="mt-6"><KnowledgeBasesManager /></TabsContent>
        <TabsContent value="settings" className="mt-6"><CoreSettingsForm /></TabsContent>
        <TabsContent value="versions" className="mt-6"><CoreVersionsManager /></TabsContent>
      </Tabs>
    </div>
  );
}