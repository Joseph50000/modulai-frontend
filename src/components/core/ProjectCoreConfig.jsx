import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Cpu, Save } from "lucide-react";
import { PROVIDER_OPTIONS } from "@/lib/platform";

const NONE = "__none__";

export default function ProjectCoreConfig({ project, onSaved }) {
  const { toast } = useToast();
  const [versions, setVersions] = useState([]);
  const [models, setModels] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [kbs, setKbs] = useState([]);
  const [providers, setProviders] = useState([]);
  const [f, setF] = useState(null);
  const [saving, setSaving] = useState(false);

  const cfg = (project.configuration && project.configuration.core) || {};

  useEffect(() => {
    setF({
      core_version: project.core_version || "",
      default_provider: cfg.default_provider || "",
      default_model_id: cfg.default_model_id || "",
      temperature: cfg.temperature ?? "",
      max_tokens: cfg.max_tokens ?? "",
      policy_id: cfg.policy_id || "",
      knowledge_base_id: cfg.knowledge_base_id || "",
      rag_enabled: !!cfg.rag_enabled,
    });
    (async () => {
      const [v, m, p, k, provs] = await Promise.all([
        base44.entities.CoreVersion.list("-created_date", 50),
        base44.entities.AiModel.filter({ status: "active" }),
        base44.entities.AiPolicy.filter({ status: "active" }),
        base44.entities.KnowledgeBase.list("-created_date", 50),
        base44.entities.AiProvider.filter({ status: "active" })
      ]);
      setVersions(v); setModels(m); setPolicies(p); setKbs(k); setProviders(provs);
    })();
  }, [project.id]);

  if (!f) return null;

  const upd = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const sel = (v, field) => upd(field, v === NONE ? "" : v);

  const save = async () => {
    setSaving(true);
    try {
      const core = {
        default_provider: f.default_provider || "",
        default_model_id: f.default_model_id || "",
        temperature: f.temperature === "" ? null : Number(f.temperature),
        max_tokens: f.max_tokens === "" ? null : Number(f.max_tokens),
        policy_id: f.policy_id || "",
        knowledge_base_id: f.knowledge_base_id || "",
        rag_enabled: !!f.rag_enabled,
      };
      await base44.entities.Project.update(project.id, {
        core_version: f.core_version || project.core_version,
        configuration: { ...(project.configuration || {}), core },
      });
      toast({ title: "Configuration Core enregistrée", description: "Appliquée aux prochaines exécutions IA du projet." });
      onSaved?.();
    } catch (e) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2"><Cpu className="h-4 w-4" /> Configuration Core (projet)</CardTitle>
        <Badge variant="outline" className="text-xs">override par projet</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">Surcharge le Core global pour ce projet : version, provider/modèle, limits, policy pin et KB RAG. Résolu à chaque exécution (priorité : Policy, puis override projet, puis defaults Core).</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div><Label>Version Core</Label>
            <Select value={f.core_version || NONE} onValueChange={(v) => sel(v, "core_version")}>
              <SelectTrigger><SelectValue placeholder="Héritée" /></SelectTrigger>
              <SelectContent>
                {versions.map((v) => <SelectItem key={v.id} value={v.version}>{v.version} · {v.status}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Provider</Label>
            <Select value={f.default_provider || NONE} onValueChange={(v) => sel(v, "default_provider")}>
              <SelectTrigger><SelectValue placeholder="Hérité du Core" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Hériter du Core</SelectItem>
                {providers.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Modèle par défaut</Label>
            <Select value={f.default_model_id || NONE} onValueChange={(v) => sel(v, "default_model_id")}>
              <SelectTrigger><SelectValue placeholder="Hérité du Core" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Hériter du Core</SelectItem>
                {models.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Temperature</Label><Input type="number" step="0.1" min="0" max="2" value={f.temperature} onChange={(e) => upd("temperature", e.target.value)} placeholder="Héritée" /></div>
          <div><Label>Max tokens</Label><Input type="number" step="1" min="0" value={f.max_tokens} onChange={(e) => upd("max_tokens", e.target.value)} placeholder="Hérité" /></div>
          <div><Label>Policy pin</Label>
            <Select value={f.policy_id || NONE} onValueChange={(v) => sel(v, "policy_id")}>
              <SelectTrigger><SelectValue placeholder="Auto (scope)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Auto (résolution par scope)</SelectItem>
                {policies.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} · {p.scope}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2 lg:col-span-1"><Label>Knowledge Base (RAG)</Label>
            <Select value={f.knowledge_base_id || NONE} onValueChange={(v) => sel(v, "knowledge_base_id")}>
              <SelectTrigger><SelectValue placeholder="Aucune" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Aucune</SelectItem>
                {kbs.map((k) => <SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <Switch checked={f.rag_enabled} onCheckedChange={(v) => upd("rag_enabled", v)} />
          RAG activé pour ce projet (retrieval sur la KB ci-dessus)
        </label>

        <Button onClick={save} disabled={saving}><Save className="h-4 w-4 mr-1.5" /> {saving ? "Enregistrement…" : "Enregistrer"}</Button>
      </CardContent>
    </Card>
  );
}