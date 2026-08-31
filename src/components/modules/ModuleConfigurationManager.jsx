import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Save, ShieldCheck, Lock } from "lucide-react";
import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

export default function ModuleConfigurationManager({ module, updateModule }) {
  const cfg = module.configuration ? (typeof module.configuration === "string" ? JSON.parse(module.configuration) : module.configuration) : {};
  const [draft, setDraft] = useState(cfg);
  const [saving, setSaving] = useState(false);
  const [dbModels, setDbModels] = useState([]);

  useEffect(() => {
    base44.entities.AiModel.list().then(setDbModels);
  }, []);

  const set = (k, v) => setDraft({ ...draft, [k]: v });
  const save = async () => { 
    setSaving(true); 
    try { 
      await updateModule({ configuration: JSON.stringify(draft) }); 
    } finally { 
      setSaving(false); 
    } 
  };

  const selectedModelInfo = dbModels.find((m) => m.id === draft.model || m.model_id === draft.model || m.model_key === draft.model) || null;
  const placeholderTemp = selectedModelInfo && selectedModelInfo.temperature !== null ? `Hérité : ${selectedModelInfo.temperature}` : "(Hérité du modèle)";
  const placeholderTokens = selectedModelInfo && selectedModelInfo.max_output_tokens !== null ? `Hérité : ${selectedModelInfo.max_output_tokens}` : "(Hérité du modèle)";

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">Le module possède sa propre configuration. Elle surcharge les paramètres par défaut définis dans le AI Core pour le modèle choisi.</p>
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 flex items-start gap-2 text-xs text-amber-800">
        <Lock className="h-4 w-4 shrink-0 mt-0.5" />
        <span>L'audit et la validation humaine ne sont jamais désactivables par le module : ils sont imposés par le Core pour garantir la traçabilité des exécutions IA.</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5 md:col-span-2">
          <Label>Modèle d'Exécution</Label>
          <Select value={draft.model || "none"} onValueChange={(v) => {
            const selectedModel = dbModels.find((m) => m.id === v || m.model_id === v || m.model_key === v);
            setDraft({
              ...draft,
              model: v === "none" ? "" : (selectedModel?.id || v),
              provider_id: v === "none" ? "" : (selectedModel?.provider_id || draft.provider_id || ""),
              provider: v === "none" ? "" : (selectedModel?.provider_id || selectedModel?.provider_name || draft.provider || ""),
            });
          }}>
            <SelectTrigger><SelectValue placeholder="Sélectionner le modèle" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Par défaut (Géré par le Core)</SelectItem>
              {dbModels.map((m) => <SelectItem key={m.id} value={m.id}>{m.name} ({m.provider_name})</SelectItem>)}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">Le choix du modèle inclut automatiquement son Provider (fournisseur).</p>
        </div>
        <div className="space-y-1.5">
          <Label>Température (Surcharge)</Label>
          <Input type="number" step="0.1" min="0" max="2" placeholder={placeholderTemp} value={draft.temperature ?? ""} onChange={(e) => set("temperature", e.target.value === "" ? null : Number(e.target.value))} />
        </div>
        <div className="space-y-1.5">
          <Label>Max tokens (Surcharge)</Label>
          <Input type="number" min="1" placeholder={placeholderTokens} value={draft.max_tokens ?? ""} onChange={(e) => set("max_tokens", e.target.value === "" ? null : Number(e.target.value))} />
        </div>
      </div>
      <div className="space-y-3">
        <Toggle label="RAG activé (recherche sémantique sur les documents du projet)" checked={!!draft.rag_enabled} onChange={(v) => set("rag_enabled", v)} />
        <Toggle label="Validation humaine requise" checked={true} onChange={() => {}} locked />
        <Toggle label="Audit activé" checked={true} onChange={() => {}} locked />
      </div>
      <div className="flex justify-end"><Button onClick={save} disabled={saving}><Save className="h-4 w-4 mr-1.5" /> {saving ? "Enregistrement…" : "Enregistrer la configuration"}</Button></div>
    </div>
  );
}

function Toggle({ label, checked, onChange, locked }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border p-4">
      <div className="flex items-center gap-2">
        {locked ? <ShieldCheck className="h-4 w-4 text-emerald-600" /> : null}
        <span className="text-sm">{label}{locked && <span className="text-xs text-muted-foreground ml-2">(imposé par le Core)</span>}</span>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} disabled={locked} />
    </div>
  );
}