import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, ArrowUp, ArrowDown, ChevronDown, ChevronRight, Layers, HelpCircle, Code } from "lucide-react";
import SchemaFieldsEditor from "./SchemaFieldsEditor.jsx";

export default function PipelineStepsEditor({ steps = [], onChange, collections = [] }) {
  const [expandedStep, setExpandedStep] = useState(0);

  const addStep = () => {
    const nextIdx = steps.length + 1;
    const newStep = {
      step_id: `step_${nextIdx}`,
      name: `Étape ${nextIdx}`,
      prompt_template: "",
      output_schema: [
        { name: `resultat_${nextIdx}`, type: "string", description: `Résultat de l'étape ${nextIdx}` }
      ],
      rag_config: {
        enabled: false,
        collection: "",
        top_k: 3
      }
    };
    onChange([...steps, newStep]);
    setExpandedStep(steps.length);
  };

  const removeStep = (index) => {
    const updated = steps.filter((_, idx) => idx !== index);
    onChange(updated);
    if (expandedStep === index) {
      setExpandedStep(Math.max(0, index - 1));
    } else if (expandedStep > index) {
      setExpandedStep(expandedStep - 1);
    }
  };

  const updateStep = (index, patch) => {
    const updated = steps.map((s, idx) => (idx === index ? { ...s, ...patch } : s));
    onChange(updated);
  };

  const moveStep = (index, direction) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= steps.length) return;
    const updated = [...steps];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIdx, 0, moved);
    onChange(updated);
    setExpandedStep(targetIdx);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-blue-200/60 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-800/40 p-3 text-xs text-blue-900 dark:text-blue-200 space-y-1.5">
        <div className="flex items-center gap-1.5 font-medium">
          <HelpCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
          <span>Chaînage & Interpolation de variables</span>
        </div>
        <p className="leading-relaxed text-muted-foreground text-[11px]">
          Chaque étape s'exécute séquentiellement. Dans le prompt système, vous pouvez injecter :
        </p>
        <div className="flex flex-wrap gap-2 pt-1 font-mono text-[10px]">
          <Badge variant="outline" className="bg-background text-foreground">{"{{input.<champ>}}"}</Badge>
          <span className="text-muted-foreground self-center">➔ Données de la requête</span>
          <Badge variant="outline" className="bg-background text-foreground">{"{{steps.<id_etape>.<champ>}}"}</Badge>
          <span className="text-muted-foreground self-center">➔ Sortie d'une étape antérieure</span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Layers className="h-4 w-4 text-primary" /> Étapes du Pipeline ({steps.length})
        </span>
        <Button type="button" size="sm" variant="outline" onClick={addStep}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Ajouter une étape
        </Button>
      </div>

      {steps.length === 0 ? (
        <div className="text-center py-8 rounded-lg border border-dashed border-border text-muted-foreground text-xs space-y-2">
          <Layers className="h-6 w-6 mx-auto opacity-50" />
          <p>Aucune étape configurée. Cliquez sur "Ajouter une étape" pour commencer.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {steps.map((step, idx) => {
            const isExpanded = expandedStep === idx;
            return (
              <div key={idx} className="rounded-lg border bg-card transition-all shadow-sm">
                <div className="flex items-center justify-between p-3 gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <button
                      type="button"
                      onClick={() => setExpandedStep(isExpanded ? null : idx)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary font-bold text-[11px]">
                      {idx + 1}
                    </span>
                    <span className="font-medium text-sm truncate">{step.name || `Étape ${idx + 1}`}</span>
                    <Badge variant="outline" className="font-mono text-[10px]">
                      id: {step.step_id || `step_${idx + 1}`}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      disabled={idx === 0}
                      onClick={() => moveStep(idx, -1)}
                      title="Monter"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      disabled={idx === steps.length - 1}
                      onClick={() => moveStep(idx, 1)}
                      title="Descendre"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => removeStep(idx)}
                      title="Supprimer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t p-4 space-y-4 bg-muted/20">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Identifiant unique (slug) *</Label>
                        <Input
                          className="h-8 font-mono text-xs"
                          value={step.step_id || ""}
                          onChange={(e) => updateStep(idx, { step_id: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") })}
                          placeholder="analyse_sentiment"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Nom de l'étape *</Label>
                        <Input
                          className="h-8 text-xs"
                          value={step.name || ""}
                          onChange={(e) => updateStep(idx, { name: e.target.value })}
                          placeholder="Étape 1 : Analyse Sentiment"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs flex items-center gap-1.5">
                          <Code className="h-3.5 w-3.5" /> Prompt Système & Instructions de l'étape *
                        </Label>
                        {idx > 0 && (
                          <span className="text-[10px] text-muted-foreground">
                            Accessible via {"{{steps." + (steps[idx - 1].step_id || `step_${idx}`) + ".<champ>}}"}
                          </span>
                        )}
                      </div>
                      <Textarea
                        rows={3}
                        className="font-mono text-xs leading-relaxed"
                        value={step.prompt_template || ""}
                        onChange={(e) => updateStep(idx, { prompt_template: e.target.value })}
                        placeholder={`Tu es l'IA chargée de l'étape ${idx + 1}. Analyse le texte : {{input.texte}} et retourne le résultat.`}
                      />
                    </div>

                    <SchemaFieldsEditor
                      title={`Schéma de sortie JSON (ce que l'étape ${idx + 1} produit)`}
                      fields={step.output_schema || []}
                      onChange={(output_schema) => updateStep(idx, { output_schema })}
                    />

                    <div className="rounded-lg border p-3 bg-background space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-medium">Recherche RAG pour cette étape</span>
                          <p className="text-[11px] text-muted-foreground">Injecter des connaissances documentaires vectorielles pour cette étape précise.</p>
                        </div>
                        <Switch
                          checked={Boolean(step.rag_config?.enabled)}
                          onCheckedChange={(checked) =>
                            updateStep(idx, {
                              rag_config: { ...(step.rag_config || {}), enabled: checked }
                            })
                          }
                        />
                      </div>
                      {step.rag_config?.enabled && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t">
                          <div className="space-y-1">
                            <Label className="text-[11px]">Collection ChromaDB</Label>
                            <Input
                              className="h-8 text-xs font-mono"
                              value={step.rag_config?.collection || ""}
                              onChange={(e) =>
                                updateStep(idx, {
                                  rag_config: { ...(step.rag_config || {}), collection: e.target.value }
                                })
                              }
                              placeholder="gpr_claims ou nom de collection"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[11px]">Top K Documents</Label>
                            <Input
                              type="number"
                              min="1"
                              max="10"
                              className="h-8 text-xs"
                              value={step.rag_config?.top_k || 3}
                              onChange={(e) =>
                                updateStep(idx, {
                                  rag_config: { ...(step.rag_config || {}), top_k: Number(e.target.value) || 3 }
                                })
                              }
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
