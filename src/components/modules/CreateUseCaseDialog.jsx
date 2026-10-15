import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { Zap, Layers, Sparkles, BookOpen, Code, FileText, ArrowRight, Mic, Search } from "lucide-react";
import SchemaFieldsEditor from "./SchemaFieldsEditor.jsx";
import PipelineStepsEditor from "./PipelineStepsEditor.jsx";
import { slugify, featureKeyOf } from "@/lib/modules";

const parseArray = (val) => {
  if (Array.isArray(val)) return val;
  if (typeof val !== "string" || !val.trim()) return [];
  try {
    const parsed = JSON.parse(val);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export default function CreateUseCaseDialog({
  open,
  onOpenChange,
  targetModule: initialModule = null,
  availableModules = [],
  onSuccess
}) {
  const { toast } = useToast();
  const [selectedModuleId, setSelectedModuleId] = useState(initialModule?.id || (availableModules[0]?.id || ""));
  const [activeModule, setActiveModule] = useState(initialModule || availableModules[0] || null);

  const [mode, setMode] = useState("simple"); // "simple" | "pipeline" | "audio" | "search"
  const [busy, setBusy] = useState(false);
  const [collections, setCollections] = useState([]);

  const [form, setForm] = useState({
    name: "",
    key: "",
    description: "",
    instructions: "Tu es un expert IA. Analyse les données fournies et renvoie une réponse structurée.",
    output_strategy: "merge_all",
    input_schema: [
      { name: "texte", type: "string", required: true, description: "Texte ou contenu à traiter" }
    ],
    output_schema: [
      { name: "resultat", type: "string", description: "Analyse ou synthèse générée" },
      { name: "score", type: "number", description: "Score d'évaluation (0 à 100)" }
    ],
    rag_config: {
      enabled: false,
      collection: "",
      top_k: 3
    },
    steps: [
      {
        step_id: "step_1_analyse",
        name: "Étape 1 : Analyse Initiale",
        prompt_template: "Tu es l'IA d'analyse. Évalue le texte suivant : {{input.texte}} et détermine l'évaluation et le sentiment.",
        output_schema: [
          { name: "sentiment", type: "string", description: "positif, neutre ou negatif" },
          { name: "urgence", type: "string", description: "BASSE, MOYENNE ou HAUTE" }
        ],
        rag_config: { enabled: false, collection: "", top_k: 3 }
      },
      {
        step_id: "step_2_qualification",
        name: "Étape 2 : Qualification Métier",
        prompt_template: "À partir du sentiment ({{steps.step_1_analyse.sentiment}}) et du texte initial ({{input.texte}}), qualifie la catégorie métier.",
        output_schema: [
          { name: "categorie", type: "string", description: "Catégorie qualifiée" },
          { name: "action_recommandee", type: "string", description: "Action à entreprendre" }
        ],
        rag_config: { enabled: false, collection: "", top_k: 3 }
      }
    ]
  });

  useEffect(() => {
    if (initialModule) {
      setActiveModule(initialModule);
      setSelectedModuleId(initialModule.id);
    } else if (availableModules.length > 0) {
      const found = availableModules.find((m) => m.id === selectedModuleId) || availableModules[0];
      setActiveModule(found);
      setSelectedModuleId(found.id);
    }
  }, [initialModule, availableModules, selectedModuleId]);

  useEffect(() => {
    base44.entities.RagCollection.list("-created_date", 200)
      .then(setCollections)
      .catch(() => setCollections([]));
  }, []);

  const handleNameChange = (val) => {
    setForm((prev) => ({
      ...prev,
      name: val,
      key: prev.key && prev.key !== slugify(prev.name) ? prev.key : slugify(val)
    }));
  };

  const resetForm = () => {
    setForm({
      name: "",
      key: "",
      description: "",
      instructions: "Tu es un expert IA. Analyse les données fournies et renvoie une réponse structurée.",
      output_strategy: "merge_all",
      input_schema: [
        { name: "texte", type: "string", required: true, description: "Texte ou contenu à traiter" }
      ],
      output_schema: [
        { name: "resultat", type: "string", description: "Analyse ou synthèse générée" },
        { name: "score", type: "number", description: "Score d'évaluation (0 à 100)" }
      ],
      rag_config: { enabled: false, collection: "", top_k: 3 },
      steps: [
        {
          step_id: "step_1_analyse",
          name: "Étape 1 : Analyse Initiale",
          prompt_template: "Tu es l'IA d'analyse. Évalue le texte suivant : {{input.texte}} et détermine l'évaluation et le sentiment.",
          output_schema: [
            { name: "sentiment", type: "string", description: "positif, neutre ou negatif" },
            { name: "urgence", type: "string", description: "BASSE, MOYENNE ou HAUTE" }
          ],
          rag_config: { enabled: false, collection: "", top_k: 3 }
        },
        {
          step_id: "step_2_qualification",
          name: "Étape 2 : Qualification Métier",
          prompt_template: "À partir du sentiment ({{steps.step_1_analyse.sentiment}}) et du texte initial ({{input.texte}}), qualifie la catégorie métier.",
          output_schema: [
            { name: "categorie", type: "string", description: "Catégorie qualifiée" },
            { name: "action_recommandee", type: "string", description: "Action à entreprendre" }
          ],
          rag_config: { enabled: false, collection: "", top_k: 3 }
        }
      ]
    });
  };

  const changeMode = (newMode) => {
    setMode(newMode);
    if (newMode === "audio") {
      setForm((prev) => ({
        ...prev,
        type: "audio",
        instructions: "Transcription automatique pure par le moteur Speech-to-Text Whisper.",
        input_schema: [
          { name: "audio_base64", type: "string", required: true, description: "Données audio encodées en base64" },
          { name: "diarization", type: "boolean", required: false, description: "Activer la détection des locuteurs (Conseiller, Client)" }
        ],
        output_schema: [
          { name: "text", type: "string", description: "Texte brut transcrit" },
          { name: "segments", type: "array", description: "Segments horodatés et locuteurs" }
        ],
        rag_config: { enabled: false, collection: "", top_k: 3 }
      }));
    } else if (newMode === "search") {
      setForm((prev) => ({
        ...prev,
        type: "search",
        instructions: "Recherche sémantique vectorielle autonome dans ChromaDB sans passer par le LLM.",
        input_schema: [
          { name: "query", type: "string", required: true, description: "Requête sémantique de recherche" },
          { name: "top_k", type: "number", required: false, description: "Nombre de documents à retourner (défaut 3)" }
        ],
        output_schema: [
          { name: "documents", type: "array", description: "Extraits documentaires pertinents et métadonnées" }
        ],
        rag_config: { enabled: true, collection: prev.rag_config?.collection || (collections[0]?.collection_name || ""), top_k: 3 }
      }));
    } else if (newMode === "pipeline") {
      setForm((prev) => ({
        ...prev,
        type: "pipeline"
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        type: "standard",
        instructions: "Tu es un expert IA. Analyse les données fournies et renvoie une réponse structurée.",
        input_schema: [
          { name: "texte", type: "string", required: true, description: "Texte ou contenu à traiter" }
        ],
        output_schema: [
          { name: "resultat", type: "string", description: "Analyse ou synthèse générée" },
          { name: "score", type: "number", description: "Score d'évaluation (0 à 100)" }
        ]
      }));
    }
  };

  const handleCreate = async () => {
    if (!form.name.trim()) {
      toast({ variant: "destructive", title: "Nom requis", description: "Veuillez saisir un nom pour le Use Case." });
      return;
    }

    let targetMod = activeModule;
    if (!targetMod) {
      toast({
        variant: "destructive",
        title: "Module requis",
        description: "Un Use Case appartient obligatoirement à un Module. Veuillez ouvrir ou sélectionner un module dans le Module Registry (/modules)."
      });
      return;
    }

    setBusy(true);
    try {
      const existingUseCases = parseArray(targetMod.use_cases);
      const baseKey = form.key || slugify(form.name);
      let uniqueKey = baseKey;
      let counter = 2;
      while (existingUseCases.some((u) => u.key === uniqueKey)) {
        uniqueKey = `${baseKey}-${counter++}`;
      }

      // Construction du Use Case
      const isPipeline = mode === "pipeline";
      const resolvedType = isPipeline ? "pipeline" : (mode === "audio" ? "audio" : mode === "search" ? "search" : (form.type || "standard"));
      const newUseCase = {
        key: uniqueKey,
        name: form.name.trim(),
        description: form.description.trim(),
        type: resolvedType,
        prompt_name: uniqueKey,
        input_schema: form.input_schema || [],
        output_schema: isPipeline
          ? (form.output_strategy === "last_step"
              ? (form.steps[form.steps.length - 1]?.output_schema || [])
              : form.steps.flatMap((s) => s.output_schema || []))
          : (form.output_schema || []),
        rag_config: isPipeline ? { enabled: false } : (form.rag_config || { enabled: false }),
        instructions: !isPipeline ? form.instructions : undefined,
        output_strategy: isPipeline ? form.output_strategy : undefined,
        steps: isPipeline ? form.steps : undefined
      };

      // Création automatique de l'endpoint correspondant
      const modKey = targetMod.module_key || "app";
      const endpointPath = `/${modKey}/v1/${uniqueKey}`;
      const existingEndpoints = parseArray(targetMod.endpoints);
      
      const newEndpoint = {
        key: `ep_${uniqueKey.replace(/[^a-zA-Z0-9_]/g, "_")}`,
        name: `API ${form.name.trim()}`,
        description: form.description.trim() || `Endpoint dynamique pour le Use Case ${form.name.trim()}`,
        method: "POST",
        path: endpointPath,
        use_case_key: `${modKey}:${uniqueKey}`,
        required_scopes: [`${modKey}:${uniqueKey}`],
        auth_required: true
      };

      const updatedEndpoints = [...existingEndpoints.filter((e) => e.use_case_key !== `${modKey}:${uniqueKey}` && e.use_case_key !== uniqueKey), newEndpoint];

      // Mise à jour du module en base de données
      await base44.entities.Module.update(targetMod.id, {
        use_cases: [...existingUseCases, newUseCase],
        endpoints: updatedEndpoints
      });

      // Si mode Simple et instructions fournies, enregistrer également dans Prompt
      if (!isPipeline && form.instructions?.trim() && resolvedType !== "audio") {
        try {
          await base44.entities.Prompt.create({
            name: uniqueKey,
            use_case: uniqueKey,
            module_id: targetMod.id,
            version: "1.0.0",
            description: form.description || `Prompt pour ${form.name}`,
            instructions: form.instructions.trim(),
            status: "active"
          });
        } catch (_) {}
      }

      toast({
        title: "Use Case créé avec succès !",
        description: `${form.name} (${resolvedType}) a été ajouté au module « ${targetMod.name} ».`
      });

      resetForm();
      onOpenChange(false);
      if (onSuccess) onSuccess(newUseCase, targetMod);
    } catch (err) {
      console.error("Error creating use case:", err);
      toast({
        variant: "destructive",
        title: "Erreur lors de la création",
        description: err.response?.data?.error || err.message
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetForm(); onOpenChange(o); }}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg">Créer un nouveau Use Case IA</DialogTitle>
              <DialogDescription className="text-xs">
                Configurez de zéro votre Use Case sur le AI Core, en mode direct ou avec un pipeline d'étapes chaînées.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* 1. Sélection du Module Cible */}
          {availableModules.length > 1 && (
            <div className="space-y-1.5 p-3 rounded-lg border bg-muted/30">
              <Label className="text-xs font-semibold">Module d'accueil *</Label>
              <Select
                value={selectedModuleId}
                onValueChange={(val) => {
                  setSelectedModuleId(val);
                  setActiveModule(availableModules.find((m) => m.id === val));
                }}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Sélectionnez le module..." />
                </SelectTrigger>
                <SelectContent>
                  {availableModules.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name} ({m.module_key}) v{m.version}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* 2. Choix de l'Architecture & Mode du Use Case (3 Piliers Core + Pipelines) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <button
              type="button"
              onClick={() => changeMode("simple")}
              className={`p-3 rounded-xl border text-left transition-all ${
                mode === "simple"
                  ? "border-primary bg-primary/5 ring-1 ring-primary shadow-sm"
                  : "border-border hover:bg-muted/40"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-xs flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-amber-500" /> Direct LLM
                </span>
                {mode === "simple" && <Badge variant="secondary" className="text-[9px]">Actif</Badge>}
              </div>
              <p className="text-[11px] text-muted-foreground line-clamp-2">
                1 prompt direct envoyé au LLM.
              </p>
            </button>

            <button
              type="button"
              onClick={() => changeMode("pipeline")}
              className={`p-3 rounded-xl border text-left transition-all ${
                mode === "pipeline"
                  ? "border-primary bg-primary/5 ring-1 ring-primary shadow-sm"
                  : "border-border hover:bg-muted/40"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-xs flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-primary" /> Pipeline
                </span>
                {mode === "pipeline" && <Badge variant="secondary" className="text-[9px]">Actif</Badge>}
              </div>
              <p className="text-[11px] text-muted-foreground line-clamp-2">
                Chaînage d'étapes séquentielles avec variables.
              </p>
            </button>

            <button
              type="button"
              onClick={() => changeMode("audio")}
              className={`p-3 rounded-xl border text-left transition-all ${
                mode === "audio"
                  ? "border-primary bg-primary/5 ring-1 ring-primary shadow-sm"
                  : "border-border hover:bg-muted/40"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-xs flex items-center gap-1.5">
                  <Mic className="h-3.5 w-3.5 text-cyan-600" /> Pilier Audio
                </span>
                {mode === "audio" && <Badge variant="secondary" className="text-[9px]">Actif</Badge>}
              </div>
              <p className="text-[11px] text-muted-foreground line-clamp-2">
                Transcription Speech-to-Text Whisper pure.
              </p>
            </button>

            <button
              type="button"
              onClick={() => changeMode("search")}
              className={`p-3 rounded-xl border text-left transition-all ${
                mode === "search"
                  ? "border-primary bg-primary/5 ring-1 ring-primary shadow-sm"
                  : "border-border hover:bg-muted/40"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-xs flex items-center gap-1.5">
                  <Search className="h-3.5 w-3.5 text-emerald-600" /> Pilier RAG
                </span>
                {mode === "search" && <Badge variant="secondary" className="text-[9px]">Actif</Badge>}
              </div>
              <p className="text-[11px] text-muted-foreground line-clamp-2">
                Recherche vectorielle ChromaDB autonome.
              </p>
            </button>
          </div>

          {/* 3. Informations Générales */}
          <div className="space-y-3.5 border rounded-lg p-4 bg-card">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="uc-name" className="text-xs">Nom du Use Case *</Label>
                <Input
                  id="uc-name"
                  value={form.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="ex: Qualification Réclamations ou Transcription Audio"
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="uc-key" className="text-xs">Identifiant technique (slug)</Label>
                <Input
                  id="uc-key"
                  value={form.key}
                  onChange={(e) => setForm({ ...form, key: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "-") })}
                  placeholder="ex: qualification-reclamations"
                  className="h-9 font-mono text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="uc-desc" className="text-xs">Description</Label>
              <Textarea
                id="uc-desc"
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Décrivez l'objectif et les règles métier de ce Use Case..."
                className="text-xs"
              />
            </div>
          </div>

          {/* 4. Schéma d'entrée */}
          <div className="space-y-2">
            <SchemaFieldsEditor
              title="Données d'entrée requises (ce que l'utilisateur ou l'API transmet)"
              fields={form.input_schema}
              onChange={(input_schema) => setForm({ ...form, input_schema })}
            />
          </div>

          {/* 5. Configuration Spécifique selon le Mode */}
          {mode === "simple" && (
            <div className="space-y-4 border rounded-lg p-4 bg-muted/20">
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5">
                  <Code className="h-3.5 w-3.5" /> Instructions / Prompt Système *
                </Label>
                <Textarea
                  rows={4}
                  className="font-mono text-xs leading-relaxed"
                  value={form.instructions}
                  onChange={(e) => setForm({ ...form, instructions: e.target.value })}
                  placeholder="Tu es un assistant IA expert. Analyse le texte : {{texte}} et retourne la décision."
                />
              </div>

              <SchemaFieldsEditor
                title="Schéma de sortie JSON (ce que l'IA doit extraire et retourner)"
                fields={form.output_schema}
                onChange={(output_schema) => setForm({ ...form, output_schema })}
              />

              {/* RAG Optionnel en mode direct */}
              <div className="rounded-lg border p-3 bg-background space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-medium">Enrichissement documentaire RAG</span>
                    <p className="text-[11px] text-muted-foreground">Interroge ChromaDB pour injecter des sources documentaires dans le contexte.</p>
                  </div>
                  <Switch
                    checked={Boolean(form.rag_config?.enabled)}
                    onCheckedChange={(checked) =>
                      setForm({
                        ...form,
                        rag_config: { ...(form.rag_config || {}), enabled: checked }
                      })
                    }
                  />
                </div>
                {form.rag_config?.enabled && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t">
                    <div className="space-y-1">
                      <Label className="text-[11px]">Collection ChromaDB</Label>
                      <Select
                        value={form.rag_config?.collection || "none"}
                        onValueChange={(val) =>
                          setForm({
                            ...form,
                            rag_config: {
                              ...(form.rag_config || {}),
                              collection: val === "none" ? "" : val,
                              enabled: val !== "none"
                            }
                          })
                        }
                      >
                        <SelectTrigger className="h-8 text-xs font-mono">
                          <SelectValue placeholder="Choisir une collection..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Aucune</SelectItem>
                          {collections.map((c) => (
                            <SelectItem key={c.id} value={c.collection_name}>
                              {c.name} ({c.collection_name})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px]">Top K Documents</Label>
                      <Input
                        type="number"
                        min="1"
                        max="10"
                        className="h-8 text-xs"
                        value={form.rag_config?.top_k || 3}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            rag_config: { ...(form.rag_config || {}), top_k: Number(e.target.value) || 3 }
                          })
                        }
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {mode === "pipeline" && (
            <div className="space-y-4 border rounded-lg p-4 bg-muted/20">
              <div className="flex items-center justify-between pb-3 border-b">
                <div>
                  <span className="text-xs font-semibold">Stratégie de sortie du Pipeline</span>
                  <p className="text-[11px] text-muted-foreground">Format du résultat final renvoyé à l'utilisateur.</p>
                </div>
                <Select
                  value={form.output_strategy}
                  onValueChange={(val) => setForm({ ...form, output_strategy: val })}
                >
                  <SelectTrigger className="h-8 w-48 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="merge_all">Fusionner toutes les étapes (merge_all)</SelectItem>
                    <SelectItem value="last_step">Dernière étape uniquement (last_step)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <PipelineStepsEditor
                steps={form.steps}
                onChange={(steps) => setForm({ ...form, steps })}
                collections={collections}
              />
            </div>
          )}

          {mode === "audio" && (
            <div className="space-y-4 border rounded-lg p-4 bg-cyan-500/5 border-cyan-500/20">
              <div className="flex items-center gap-2">
                <Mic className="h-4 w-4 text-cyan-600" />
                <h4 className="text-xs font-semibold text-foreground">Pilier 1 Audio Core (Whisper STT Autonome)</h4>
              </div>
              <p className="text-xs text-muted-foreground">
                Ce Use Case exécute le service Audio de manière autonome (transcription Speech-to-Text, calcul des durées, segmentation et diarisation locuteurs) sans appel forcé au LLM.
              </p>
              <SchemaFieldsEditor
                title="Schéma de sortie Transcription"
                fields={form.output_schema}
                onChange={(output_schema) => setForm({ ...form, output_schema })}
              />
            </div>
          )}

          {mode === "search" && (
            <div className="space-y-4 border rounded-lg p-4 bg-emerald-500/5 border-emerald-500/20">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-emerald-600" />
                <h4 className="text-xs font-semibold text-foreground">Pilier 2 RAG Core (Recherche Vectorielle Autonome)</h4>
              </div>
              <p className="text-xs text-muted-foreground">
                Ce Use Case interroge ChromaDB en recherche sémantique pure (cosine similarity) sans passer par le LLM.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-background rounded-lg border">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">Collection ChromaDB cible *</Label>
                  <Select
                    value={form.rag_config?.collection || "none"}
                    onValueChange={(val) =>
                      setForm({
                        ...form,
                        rag_config: { ...(form.rag_config || {}), collection: val === "none" ? "" : val, enabled: val !== "none" }
                      })
                    }
                  >
                    <SelectTrigger className="h-8 text-xs font-mono">
                      <SelectValue placeholder="Sélectionner une collection..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sélectionner...</SelectItem>
                      {collections.map((c) => (
                        <SelectItem key={c.id} value={c.collection_name}>
                          {c.name} ({c.collection_name})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">Top K Extraits</Label>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    className="h-8 text-xs"
                    value={form.rag_config?.top_k || 3}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        rag_config: { ...(form.rag_config || {}), top_k: Number(e.target.value) || 3 }
                      })
                    }
                  />
                </div>
              </div>
              <SchemaFieldsEditor
                title="Schéma de sortie Résultats RAG"
                fields={form.output_schema}
                onChange={(output_schema) => setForm({ ...form, output_schema })}
              />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Annuler
          </Button>
          <Button onClick={handleCreate} disabled={!form.name.trim() || busy}>
            {busy ? "Création en cours…" : "Créer et Activer le Use Case"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
