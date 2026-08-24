import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Save, ShieldCheck, Lock } from "lucide-react";
import { PROVIDER_OPTIONS } from "@/lib/platform";
import { useState } from "react";

const MODELS = {
  openai: ["gpt_5_mini", "gpt_5_4"],
  anthropic: ["claude_sonnet_4_6", "claude_opus_4_6"],
  gemini: ["gemini_3_flash", "gemini_3_1_pro"],
  mock: ["mock"],
};

export default function ModuleConfigurationManager({ module, updateModule }) {
  const cfg = { ...module.configuration } || {};
  const [draft, setDraft] = useState(cfg);
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setDraft({ ...draft, [k]: v });
  const save = async () => { setSaving(true); try { await updateModule({ configuration: draft }); } finally { setSaving(false); } };
  const models = MODELS[draft.provider] || [];

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">Le module possède sa propre configuration. Les mécanismes critiques du Core (audit, validation) restent contrôlés par le Core.</p>
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 flex items-start gap-2 text-xs text-amber-800">
        <Lock className="h-4 w-4 shrink-0 mt-0.5" />
        <span>L'audit et la validation humaine ne sont jamais désactivables par le module : ils sont imposés par le Core pour garantir la traçabilité des exécutions IA.</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>AI Provider</Label>
          <Select value={draft.provider || "mock"} onValueChange={(v) => set("provider", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{PROVIDER_OPTIONS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Modèle</Label>
          <Select value={draft.model || ""} onValueChange={(v) => set("model", v)}>
            <SelectTrigger><SelectValue placeholder="(défaut du provider)" /></SelectTrigger>
            <SelectContent>{models.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5"><Label>Température</Label><Input type="number" step="0.1" min="0" max="2" value={draft.temperature ?? 0.2} onChange={(e) => set("temperature", Number(e.target.value))} /></div>
        <div className="space-y-1.5"><Label>Max tokens</Label><Input type="number" min="1" value={draft.max_tokens ?? 1024} onChange={(e) => set("max_tokens", Number(e.target.value))} /></div>
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