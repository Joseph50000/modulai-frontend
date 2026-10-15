import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Plus, Trash2, ChevronDown, ChevronRight, Cpu, Layers } from "lucide-react";
import SchemaFieldsEditor from "./SchemaFieldsEditor.jsx";
import PipelineStepsEditor from "./PipelineStepsEditor.jsx";
import CreateUseCaseDialog from "./CreateUseCaseDialog.jsx";

const USE_CASE_TYPES = ["pipeline", "standard", "analysis", "generation", "extraction", "classification", "review", "audio", "search"];

const parseArray = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
};

export default function ModuleUseCasesManager({ module, updateModule }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [collections, setCollections] = useState([]);
  const [busy, setBusy] = useState(false);
  const useCases = parseArray(module.use_cases);
  const features = parseArray(module.features);

  useEffect(() => {
    base44.entities.RagCollection.list("-created_date", 200)
      .then(setCollections)
      .catch(() => setCollections([]));
  }, []);

  const patchUc = async (key, patch) => {
    if (busy) return;
    setBusy(true);
    try {
      await updateModule({ use_cases: useCases.map((u) => (u.key === key ? { ...u, ...patch } : u)) });
      toast({ title: "Use Case mis à jour" });
    } catch (error) {
      toast({ title: "Mise à jour impossible", description: error.response?.data?.error || error.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (key) => {
    if (busy) return;
    const target = useCases.find((u) => u.key === key);
    setBusy(true);
    try {
      await updateModule({ use_cases: useCases.filter((u) => u.key !== key) });
      if (expanded === key) setExpanded(null);
      toast({ title: "Use Case supprimé", description: target?.name || key });
    } catch (error) {
      toast({ title: "Suppression impossible", description: error.response?.data?.error || error.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const featureName = (k) => (features.find((f) => f.key === k) || {}).name || "—";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-muted-foreground">
          Chaque fonctionnalité expose un ou plusieurs AI Use Cases (directs ou sous forme de pipeline multi-étapes).
        </p>
        <Button size="sm" onClick={() => setOpen(true)} disabled={busy}>
          <Plus className="h-4 w-4 mr-1.5" /> Ajouter un Use Case
        </Button>
      </div>

      {useCases.length === 0 && (
        <div className="text-center py-10 text-sm text-muted-foreground border border-dashed border-border rounded-xl">
          Aucun Use Case défini. Cliquez sur "Ajouter un Use Case" pour en créer un de zéro.
        </div>
      )}

      <div className="space-y-2.5">
        {useCases.map((uc) => {
          const isPipeline = uc.type === "pipeline" || (Array.isArray(uc.steps) && uc.steps.length > 0);
          return (
            <div key={uc.key} className="rounded-lg border border-border">
              <div className="flex items-center gap-3 p-4">
                <button
                  type="button"
                  onClick={() => setExpanded(expanded === uc.key ? null : uc.key)}
                  className="text-muted-foreground"
                  disabled={busy}
                >
                  {expanded === uc.key ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{uc.name}</span>
                    <Badge variant="outline" className="font-mono text-xs">{uc.key}</Badge>
                    {isPipeline ? (
                      <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20 gap-1 font-medium">
                        <Layers className="h-3 w-3" /> pipeline ({(uc.steps || []).length} étapes)
                      </Badge>
                    ) : uc.type === "audio" ? (
                      <Badge variant="secondary" className="text-xs bg-cyan-500/10 text-cyan-700 border-cyan-500/20 font-medium">
                        Pilier 1 Audio
                      </Badge>
                    ) : uc.type === "search" ? (
                      <Badge variant="secondary" className="text-xs bg-emerald-500/10 text-emerald-700 border-emerald-500/20 font-medium">
                        Pilier 2 RAG
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs font-normal">{uc.type || "standard"}</Badge>
                    )}
                    {uc.feature_key && <Badge variant="outline" className="text-xs font-normal">Feature : {featureName(uc.feature_key)}</Badge>}
                    <Badge variant="outline" className="text-xs font-normal gap-1">
                      <Cpu className="h-3 w-3" /> prompt : {uc.prompt_name || uc.key}
                    </Badge>
                  </div>
                  {uc.description && <p className="text-sm text-muted-foreground mt-1">{uc.description}</p>}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => remove(uc.key)}
                  disabled={busy}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {expanded === uc.key && (
                <div className="border-t border-border p-4 space-y-5 bg-muted/30">
                  {isPipeline ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between pb-2 border-b">
                        <span className="text-xs font-semibold">Stratégie de fusion du Pipeline</span>
                        <Select
                          value={uc.output_strategy || "merge_all"}
                          onValueChange={(val) => patchUc(uc.key, { output_strategy: val })}
                        >
                          <SelectTrigger className="h-8 w-48 text-xs font-mono">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="merge_all">merge_all</SelectItem>
                            <SelectItem value="last_step">last_step</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <SchemaFieldsEditor
                        title="Schéma d'entrée global du Pipeline"
                        fields={uc.input_schema || []}
                        onChange={(input_schema) => patchUc(uc.key, { input_schema })}
                      />

                      <PipelineStepsEditor
                        steps={uc.steps || []}
                        onChange={(steps) => patchUc(uc.key, { steps })}
                        collections={collections}
                      />
                    </div>
                  ) : (
                    <>
                      <SchemaFieldsEditor
                        title="Schéma d'entrée (données nécessaires à l'IA)"
                        fields={uc.input_schema || []}
                        onChange={(input_schema) => patchUc(uc.key, { input_schema })}
                      />
                      <SchemaFieldsEditor
                        title="Schéma de sortie (ce que l'IA doit retourner)"
                        fields={uc.output_schema || []}
                        onChange={(output_schema) => patchUc(uc.key, { output_schema })}
                      />
                      <div className="rounded-lg border border-border bg-background p-3 space-y-3">
                        <div>
                          <div className="font-medium text-sm">Configuration RAG du use case</div>
                          <p className="text-xs text-muted-foreground">Cette collection est prioritaire sur la configuration RAG du module.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs">Collection</Label>
                            <Select
                              value={uc.rag_config?.collection || "none"}
                              onValueChange={(v) =>
                                patchUc(uc.key, {
                                  rag_config: { ...(uc.rag_config || {}), enabled: v !== "none", collection: v === "none" ? "" : v }
                                })
                              }
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder="Aucune" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Aucune collection</SelectItem>
                                {collections
                                  .filter((c) => !c.status || c.status === "active")
                                  .map((c) => (
                                    <SelectItem key={c.id} value={c.collection_name}>
                                      {c.name} ({c.collection_name})
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Knowledge Base ID</Label>
                            <Input
                              className="h-9 font-mono text-xs"
                              value={uc.rag_config?.knowledge_base_id || ""}
                              onChange={(e) =>
                                patchUc(uc.key, { rag_config: { ...(uc.rag_config || {}), knowledge_base_id: e.target.value } })
                              }
                              placeholder="kb-gpr-regulatory"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Top K</Label>
                            <Input
                              className="h-9"
                              type="number"
                              min="1"
                              max="20"
                              value={uc.rag_config?.top_k || 5}
                              onChange={(e) =>
                                patchUc(uc.key, { rag_config: { ...(uc.rag_config || {}), top_k: Number(e.target.value) || 5 } })
                              }
                            />
                          </div>
                        </div>
                        {uc.rag_config?.enabled && <Badge variant="secondary">RAG actif · {uc.rag_config.collection}</Badge>}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Type d'analyse</Label>
                          <Select value={uc.type || "standard"} onValueChange={(v) => patchUc(uc.key, { type: v })}>
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {USE_CASE_TYPES.map((t) => (
                                <SelectItem key={t} value={t}>{t}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Prompt associé (nom)</Label>
                          <Input
                            className="h-9 font-mono text-sm"
                            value={uc.prompt_name || ""}
                            onChange={(e) => patchUc(uc.key, { prompt_name: e.target.value })}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <CreateUseCaseDialog
        open={open}
        onOpenChange={setOpen}
        targetModule={module}
        onSuccess={async () => {
          const fresh = await base44.entities.Module.get(module.id);
          if (updateModule) updateModule(fresh);
        }}
      />
    </div>
  );
}