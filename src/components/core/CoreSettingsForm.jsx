import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { getCoreSettings } from "@/core/ai/coreConfig";

export default function CoreSettingsForm() {
  const { toast } = useToast();
  const [settings, setSettings] = useState(null);
  const [models, setModels] = useState([]);
  const [providers, setProviders] = useState([]);

  const load = async () => {
    const s = await getCoreSettings();
    setSettings(s);
    setModels(await base44.entities.AiModel.filter({ status: "active" }));
    setProviders(await base44.entities.AiProvider.filter({ status: "active" }));
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    await base44.entities.CoreSettings.update(settings.id, {
      default_provider: settings.default_provider, default_model_id: settings.default_model_id,
      default_model_name: (models.find((m) => m.id === settings.default_model_id) || {}).name || "",
      default_embedding_model: settings.default_embedding_model, default_vector_store: settings.default_vector_store,
      default_temperature: Number(settings.default_temperature), default_token_limit: Number(settings.default_token_limit),
      default_rag_strategy: settings.default_rag_strategy, default_validation_policy: settings.default_validation_policy,
      current_core_version: settings.current_core_version,
    });
    toast({ title: "Core Settings enregistrées", description: "Les nouvelles exécutions utiliseront ces valeurs par défaut." });
  };

  if (!settings) return <p className="text-sm text-muted-foreground">Chargement…</p>;

  return (
    <div className="max-w-2xl space-y-4">
      <p className="text-sm text-muted-foreground">Ces valeurs constituent les défauts du Core. Elles sont surchargeables par une Policy (plus spécifique) au niveau Projet / Module / Use Case.</p>
      <Card><CardContent className="p-5 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Default Provider</Label>
            <Select value={settings.default_provider} onValueChange={(v) => setSettings({ ...settings, default_provider: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{providers.map((p) => <SelectItem key={p.id} value={p.type}>{p.name} ({p.type})</SelectItem>)}</SelectContent></Select>
          </div>
          <div><Label>Default Model</Label>
            <Select value={settings.default_model_id || "__none"} onValueChange={(v) => setSettings({ ...settings, default_model_id: v === "__none" ? "" : v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="__none">Aucun (fallback mock)</SelectItem>{models.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent></Select>
          </div>
          <div><Label>Default Embedding Model</Label><Input value={settings.default_embedding_model || ""} onChange={(e) => setSettings({ ...settings, default_embedding_model: e.target.value })} /></div>
          <div><Label>Default Vector Store</Label><Input value={settings.default_vector_store || ""} onChange={(e) => setSettings({ ...settings, default_vector_store: e.target.value })} /></div>
          <div><Label>Default Temperature</Label><Input type="number" step="0.1" value={settings.default_temperature ?? 0.2} onChange={(e) => setSettings({ ...settings, default_temperature: e.target.value })} /></div>
          <div><Label>Default Token Limit</Label><Input type="number" value={settings.default_token_limit ?? 1024} onChange={(e) => setSettings({ ...settings, default_token_limit: e.target.value })} /></div>
          <div><Label>Default RAG Strategy</Label><Input value={settings.default_rag_strategy || ""} onChange={(e) => setSettings({ ...settings, default_rag_strategy: e.target.value })} /></div>
          <div><Label>Default Validation Policy</Label>
            <Select value={settings.default_validation_policy} onValueChange={(v) => setSettings({ ...settings, default_validation_policy: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="required">Required</SelectItem><SelectItem value="not_required">Not required</SelectItem></SelectContent></Select>
          </div>
          <div><Label>Core Version courante</Label><Input value={settings.current_core_version || ""} onChange={(e) => setSettings({ ...settings, current_core_version: e.target.value })} /></div>
        </div>
        <Button onClick={save}>Enregistrer</Button>
      </CardContent></Card>
    </div>
  );
}