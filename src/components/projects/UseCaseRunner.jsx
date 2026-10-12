import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import StatusBadge from "@/components/StatusBadge";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/lib/AuthContext";
import { Loader2, Cpu, Check, X, ArrowRight, ShieldCheck, UploadCloud, FileAudio, FileText, Trash2, AlertCircle } from "lucide-react";
import { executeModuleUseCase } from "@/core/ai/moduleExecution";
import { recordAudit } from "@/core/ai/auditTrail";
import { Link } from "react-router-dom";

const parseSchema = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string" || !value.trim()) return [];
  try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
};

const isAudioField = (f) => {
  const name = (f.name || "").toLowerCase();
  const type = (f.type || "").toLowerCase();
  return (
    type === "audio" ||
    name === "audio_base64" ||
    name === "audio" ||
    (name.endsWith("_base64") && name.includes("audio")) ||
    (type === "string" && name.includes("audio"))
  );
};

const isFileField = (f) => {
  const name = (f.name || "").toLowerCase();
  const type = (f.type || "").toLowerCase();
  if (isAudioField(f)) return false;
  return (
    type === "file" ||
    type === "document" ||
    name === "file" ||
    name === "document" ||
    name === "piece_jointe" ||
    name.endsWith("_file") ||
    name.endsWith("_document") ||
    name.endsWith("_base64")
  );
};

const isBooleanField = (f) => (f.type || "").toLowerCase() === "boolean";

function ResultViewer({ output, useCase }) {
  const [viewRaw, setViewRaw] = useState(false);
  const out = typeof output === 'string' ? (() => { try { return JSON.parse(output); } catch { return { raw: output }; } })() : (output || {});

  const isAudioResult = Boolean(
    useCase?.type === 'audio' ||
    out.duration_seconds !== undefined ||
    Array.isArray(out.segments) ||
    Array.isArray(out.turns) ||
    out.raw_transcript
  );

  const isSearchResult = Boolean(
    useCase?.type === 'search' ||
    Array.isArray(out.results)
  );

  const hasStructuredFields = Boolean(
    out.sentiment ||
    out.urgence ||
    out.urgency ||
    out.propositions ||
    out.mots_sensibles_detectes ||
    out.mots_cles_sensibles ||
    out.resume ||
    out.summary
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Restitution Métier
        </span>
        <button
          type="button"
          onClick={() => setViewRaw(!viewRaw)}
          className="text-[11px] text-primary hover:underline font-mono"
        >
          {viewRaw ? "Vue Présentation" : "Voir JSON Brut"}
        </button>
      </div>

      {viewRaw ? (
        <pre className="text-xs bg-muted/60 rounded-lg p-4 font-mono leading-relaxed max-h-72 overflow-y-auto whitespace-pre-wrap break-words">
          {typeof output === 'string' ? output : JSON.stringify(output, null, 2)}
        </pre>
      ) : (
        <div className="space-y-3">
          {/* 1. Restitution Audio Standalone */}
          {isAudioResult && (
            <div className="rounded-lg border bg-card p-3 space-y-2.5">
              <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b">
                <span className="text-xs font-semibold flex items-center gap-1.5">
                  <FileAudio className="h-4 w-4 text-primary" /> Transcription Audio Structurée
                </span>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  {out.duration_seconds !== undefined && <span>Durée : {Number(out.duration_seconds).toFixed(1)}s</span>}
                  {out.structure?.word_count && <span>· {out.structure.word_count} mots</span>}
                  {out.correction_status && (
                    <span className="px-1.5 py-0.5 rounded bg-muted font-mono text-[10px]">
                      {out.correction_status}
                    </span>
                  )}
                </div>
              </div>

              {Array.isArray(out.segments) && out.segments.length > 0 ? (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {out.segments.map((seg, idx) => (
                    <div key={idx} className="rounded border bg-muted/30 p-2 text-xs space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                        <span className="font-semibold text-foreground">
                          {seg.speaker || (idx % 2 === 0 ? "Conseiller" : "Client")}
                        </span>
                        <span>
                          {seg.start !== undefined ? `${seg.start.toFixed(1)}s - ${seg.end?.toFixed(1)}s` : ""}
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed text-foreground/90">{seg.text}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-foreground/90 leading-relaxed bg-muted/30 p-2.5 rounded border whitespace-pre-wrap">
                  {out.text || out.corrected_transcript || out.raw_transcript || "Aucun texte transcrit."}
                </p>
              )}
            </div>
          )}

          {/* 2. Restitution Recherche RAG Pure */}
          {isSearchResult && Array.isArray(out.results) && (
            <div className="rounded-lg border bg-card p-3 space-y-2.5">
              <div className="flex items-center justify-between pb-2 border-b">
                <span className="text-xs font-semibold">Extraits Documentaires Pertinents ({out.results.length})</span>
                {out.collection && <span className="text-[10px] font-mono text-muted-foreground">collection: {out.collection}</span>}
              </div>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {out.results.map((res, idx) => (
                  <div key={idx} className="rounded border bg-muted/20 p-2.5 text-xs space-y-1.5">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-semibold text-primary">Extrait #{idx + 1}</span>
                      {res.similarity_score !== undefined && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-mono text-[10px]">
                          {(res.similarity_score * 100).toFixed(0)}% pertinence
                        </span>
                      )}
                    </div>
                    <p className="text-xs leading-relaxed text-muted-foreground">{res.document}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. Restitution Sémantique Structurée (NLP / Résolution RAG) */}
          {hasStructuredFields && (
            <div className="space-y-2.5">
              {(out.sentiment || out.urgence || out.urgency) && (
                <div className="flex items-center gap-2 flex-wrap">
                  {(out.urgence || out.urgency) && (
                    <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${
                      String(out.urgence || out.urgency).toUpperCase() === 'GRAVE'
                        ? 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30'
                        : String(out.urgence || out.urgency).toUpperCase() === 'MOYEN'
                        ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30'
                        : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                    }`}>
                      Urgence : {String(out.urgence || out.urgency).toUpperCase()}
                    </span>
                  )}
                  {out.sentiment && (
                    <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-muted text-foreground border">
                      Sentiment : {out.sentiment}
                    </span>
                  )}
                  {(out.categorie_suggeree || out.suggested_category) && (
                    <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                      Catégorie : {out.categorie_suggeree || out.suggested_category}
                    </span>
                  )}
                  {(out.motif_suggere || out.suggested_subcategory) && (
                    <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-muted text-muted-foreground border">
                      Motif : {out.motif_suggere || out.suggested_subcategory}
                    </span>
                  )}
                </div>
              )}

              {(Array.isArray(out.mots_sensibles_detectes) || Array.isArray(out.mots_cles_sensibles)) && (
                (out.mots_sensibles_detectes?.length > 0 || out.mots_cles_sensibles?.length > 0) && (
                  <div className="rounded-lg border bg-muted/20 p-2.5 space-y-1.5 text-xs">
                    <span className="text-[11px] font-semibold text-muted-foreground">Mots sensibles détectés :</span>
                    <div className="flex flex-wrap gap-1.5">
                      {(out.mots_sensibles_detectes || out.mots_cles_sensibles || []).map((word, i) => (
                        <span key={i} className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 font-mono text-[11px]">
                          {word}
                        </span>
                      ))}
                    </div>
                  </div>
                )
              )}

              {(out.resume || out.summary) && (
                <div className="rounded-lg border bg-muted/20 p-2.5 space-y-1 text-xs">
                  <span className="text-[11px] font-semibold text-muted-foreground">Synthèse :</span>
                  <p className="leading-relaxed text-foreground/90">{out.resume || out.summary}</p>
                </div>
              )}

              {Array.isArray(out.propositions) && out.propositions.length > 0 && (
                <div className="rounded-lg border bg-muted/20 p-2.5 space-y-2 text-xs">
                  <span className="text-[11px] font-semibold text-primary">Propositions de Solution RAG ({out.propositions.length}) :</span>
                  <div className="space-y-1.5">
                    {out.propositions.map((prop, idx) => (
                      <div key={idx} className="p-2 rounded border bg-card text-xs space-y-0.5">
                        <div className="font-medium text-foreground">
                          {typeof prop === 'string' ? prop : prop.title || prop.solution || JSON.stringify(prop)}
                        </div>
                        {prop.details && <p className="text-[11px] text-muted-foreground">{prop.details}</p>}
                      </div>
                    ))}
                  </div>
                  {(out.raisonnement || out.reasoning) && (
                    <p className="text-[11px] text-muted-foreground italic border-t pt-1.5">
                      Justification : {out.raisonnement || out.reasoning}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Fallback générique si aucun format spécifique */}
          {!isAudioResult && !isSearchResult && !hasStructuredFields && (
            <pre className="text-xs bg-muted/60 rounded-lg p-4 font-mono leading-relaxed max-h-72 overflow-y-auto whitespace-pre-wrap break-words">
              {typeof output === 'string' ? output : JSON.stringify(output, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

// Runs a use case defined inside a stored module, using only the Core engine.
// Builds the input form dynamically from the use case input_schema.
export default function UseCaseRunner({ open, onOpenChange, project, moduleVersion, useCase, provider }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const fields = parseSchema(useCase?.input_schema ?? useCase?.inputSchema);
  const [values, setValues] = useState({});
  const [audioPreviews, setAudioPreviews] = useState({});
  const [filePreviews, setFilePreviews] = useState({});
  const [showManualBase64, setShowManualBase64] = useState({});
  const [errors, setErrors] = useState({});
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [comment, setComment] = useState("");
  const [deciding, setDeciding] = useState(false);

  const handleAudioFile = (f, file) => {
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "Fichier trop volumineux",
        description: "Le fichier audio dépasse la limite maximale autorisée de 25 Mo."
      });
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      const base64Data = dataUrl.split(",")[1];
      setValues((prev) => ({
        ...prev,
        [f.name]: base64Data,
        filename: file.name
      }));
      setAudioPreviews((prev) => ({
        ...prev,
        [f.name]: {
          name: file.name,
          size: (file.size / (1024 * 1024)).toFixed(2) + " Mo",
          dataUrl: dataUrl
        }
      }));
      if (errors[f.name]) setErrors((prev) => ({ ...prev, [f.name]: null }));
    };
    reader.readAsDataURL(file);
  };

  const handleGenericFile = (f, file) => {
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "Fichier trop volumineux",
        description: "Le fichier dépasse la limite maximale autorisée de 25 Mo."
      });
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      const base64Data = dataUrl.split(",")[1];
      setValues((prev) => ({
        ...prev,
        [f.name]: base64Data,
        [`${f.name}_name`]: file.name,
        filename: file.name
      }));
      setFilePreviews((prev) => ({
        ...prev,
        [f.name]: {
          name: file.name,
          size: (file.size / (1024 * 1024)).toFixed(2) + " Mo",
          type: file.type || "Document",
          dataUrl: dataUrl
        }
      }));
      if (errors[f.name]) setErrors((prev) => ({ ...prev, [f.name]: null }));
    };
    reader.readAsDataURL(file);
  };

  if (!useCase) return null;

  const run = async () => {
    // Validation des champs requis
    const newErrors = {};
    fields.forEach((f) => {
      if (f.required && (!values[f.name] || String(values[f.name]).trim() === "")) {
        newErrors[f.name] = "Ce champ est obligatoire";
      }
    });

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      toast({
        variant: "destructive",
        title: "Champs requis manquants",
        description: "Veuillez remplir tous les champs obligatoires avant d'exécuter le Use Case."
      });
      return;
    }

    setRunning(true);
    setResult(null);
    try {
      const res = await executeModuleUseCase({
        projectId: project.id, projectName: project.name,
        moduleVersionId: moduleVersion.id, useCaseKey: useCase.key,
        inputData: values, provider, user,
        outputSchema: useCase.output_schema
      });
      setResult(res);
      if (res.status === "error") toast({ variant: "destructive", title: "Exécution échouée", description: res.error });
      else toast({ title: "Use Case exécuté", description: `${useCase.name} · exécution ${res.execution_id.slice(0, 8)}` });
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur", description: e.message });
    } finally { setRunning(false); }
  };

  const decide = async (action) => {
    setDeciding(true);
    try {
      await base44.entities.AIExecution.update(result.execution_id, {
        human_validation: {
          action, comment,
          validated_by: user?.email || user?.full_name || "",
          validated_at: new Date().toISOString(),
        },
      });
      await recordAudit({
        project_id: project.id, project_name: project.name,
        module_id: moduleVersion.id, module_name: moduleVersion.name,
        use_case: useCase.key,
        user_id: user?.id, user_name: user?.full_name || user?.email,
        action: action === "approved" ? "ai_execution_approved" : "ai_execution_rejected",
        entity_type: "AIExecution", entity_id: result.execution_id,
        new_value: result.output, comment,
      });
      toast({ title: action === "approved" ? "Résultat validé" : "Résultat rejeté" });
      setResult((r) => ({ ...r, validated: true, decision: action }));
    } finally { setDeciding(false); }
  };

  const close = () => { 
    if (running) return; 
    onOpenChange(false); 
    setValues({}); 
    setAudioPreviews({});
    setFilePreviews({});
    setShowManualBase64({});
    setResult(null); 
    setComment(""); 
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            <Cpu className="h-4 w-4" /> {useCase.name}
            <span className="text-xs text-muted-foreground font-mono font-normal">{useCase.key}</span>
          </DialogTitle>
        </DialogHeader>

        {!result ? (
          <div className="space-y-4 py-2">
            <div className="text-xs text-muted-foreground bg-muted/50 rounded-md p-3 flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5" /> {moduleVersion.name} v{moduleVersion.version} · exécuté par le AI Core ({provider})
            </div>
            {fields.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun champ d'entrée défini — l'analyse s'appuiera sur le prompt seul.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {fields.map((f) => {
                  const isAudio = isAudioField(f);
                  const isFile = isFileField(f);
                  const isBool = isBooleanField(f);
                  return (
                    <div 
                      key={f.name} 
                      className={`space-y-1.5 ${f.type === "array" || f.description?.length > 40 || isAudio || isFile ? "md:col-span-2" : ""}`}
                    >
                      <Label htmlFor={`f-${f.name}`} className={errors[f.name] ? "text-destructive" : ""}>
                        {f.name}{f.required ? " *" : ""}<span className="text-xs text-muted-foreground ml-2 font-mono">{f.type}</span>
                      </Label>

                      {isFile ? (
                        <div className="space-y-2">
                          {filePreviews[f.name] ? (
                            <div className="rounded-lg border bg-muted/40 p-3 flex items-center justify-between">
                              <div className="flex items-center gap-2.5 overflow-hidden">
                                <FileText className="h-5 w-5 text-primary shrink-0" />
                                <div className="truncate">
                                  <p className="text-xs font-medium truncate">{filePreviews[f.name].name}</p>
                                  <p className="text-[10px] text-muted-foreground">{filePreviews[f.name].size} · {filePreviews[f.name].type}</p>
                                </div>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => {
                                  const newVals = { ...values };
                                  delete newVals[f.name];
                                  delete newVals[`${f.name}_name`];
                                  setValues(newVals);
                                  const newPreviews = { ...filePreviews };
                                  delete newPreviews[f.name];
                                  setFilePreviews(newPreviews);
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5 mr-1" /> Retirer
                              </Button>
                            </div>
                          ) : (
                            <label
                              htmlFor={`file-${f.name}`}
                              className="border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30 transition-colors rounded-lg p-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer text-center"
                              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                              onDrop={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const file = e.dataTransfer.files?.[0];
                                if (file) handleGenericFile(f, file);
                              }}
                            >
                              <UploadCloud className="h-6 w-6 text-muted-foreground" />
                              <span className="text-xs font-medium text-foreground">
                                Cliquez pour sélectionner un document ou glissez-le ici
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                PDF, Office, images, CSV, texte (max 25 Mo)
                              </span>
                              <input
                                id={`file-${f.name}`}
                                type="file"
                                accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.png,.jpg,.jpeg,.json,*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleGenericFile(f, file);
                                }}
                              />
                            </label>
                          )}

                          <div className="pt-0.5">
                            <button
                              type="button"
                              onClick={() => setShowManualBase64((prev) => ({ ...prev, [f.name]: !prev[f.name] }))}
                              className="text-[11px] text-muted-foreground hover:underline"
                            >
                              {showManualBase64[f.name] ? "Masquer la saisie Base64 directe" : "Ou coller une chaîne Base64 directement"}
                            </button>
                            {showManualBase64[f.name] && (
                              <Textarea
                                rows={2}
                                value={values[f.name] || ""}
                                onChange={(e) => {
                                  setValues({ ...values, [f.name]: e.target.value });
                                  if (errors[f.name]) setErrors({ ...errors, [f.name]: null });
                                }}
                                placeholder="Coller la chaîne base64..."
                                className="mt-1.5 font-mono text-xs"
                              />
                            )}
                          </div>
                        </div>
                      ) : isAudio ? (
                        <div className="space-y-2">
                          {audioPreviews[f.name] ? (
                            <div className="rounded-lg border bg-muted/40 p-3 space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 overflow-hidden">
                                  <FileAudio className="h-5 w-5 text-primary shrink-0" />
                                  <div className="truncate">
                                    <p className="text-xs font-medium truncate">{audioPreviews[f.name].name}</p>
                                    <p className="text-[10px] text-muted-foreground">{audioPreviews[f.name].size}</p>
                                  </div>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => {
                                    const newVals = { ...values };
                                    delete newVals[f.name];
                                    delete newVals.filename;
                                    setValues(newVals);
                                    const newPreviews = { ...audioPreviews };
                                    delete newPreviews[f.name];
                                    setAudioPreviews(newPreviews);
                                  }}
                                >
                                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Retirer
                                </Button>
                              </div>
                              <audio controls src={audioPreviews[f.name].dataUrl} className="w-full h-8" />
                            </div>
                          ) : (
                            <label
                              htmlFor={`file-${f.name}`}
                              className="border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30 transition-colors rounded-lg p-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer text-center"
                              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                              onDrop={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const file = e.dataTransfer.files?.[0];
                                if (file) handleAudioFile(f, file);
                              }}
                            >
                              <UploadCloud className="h-6 w-6 text-muted-foreground" />
                              <span className="text-xs font-medium text-foreground">
                                Cliquez pour sélectionner un audio ou glissez-le ici
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                Formats acceptés : MP3, WAV, M4A, OGG, FLAC (max 25 Mo)
                              </span>
                              <input
                                id={`file-${f.name}`}
                                type="file"
                                accept="audio/*,.mp3,.wav,.ogg,.m4a,.flac,.aac"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleAudioFile(f, file);
                                }}
                              />
                            </label>
                          )}

                          <div className="pt-0.5">
                            <button
                              type="button"
                              onClick={() => setShowManualBase64((prev) => ({ ...prev, [f.name]: !prev[f.name] }))}
                              className="text-[11px] text-muted-foreground hover:underline"
                            >
                              {showManualBase64[f.name] ? "Masquer la saisie Base64 directe" : "Ou coller une chaîne Base64 directement"}
                            </button>
                            {showManualBase64[f.name] && (
                              <Textarea
                                rows={2}
                                value={values[f.name] || ""}
                                onChange={(e) => {
                                  setValues({ ...values, [f.name]: e.target.value });
                                  if (errors[f.name]) setErrors({ ...errors, [f.name]: null });
                                }}
                                placeholder="Coller la chaîne base64..."
                                className="mt-1.5 font-mono text-xs"
                              />
                            )}
                          </div>
                        </div>
                      ) : isBool ? (
                        <div className="flex items-center justify-between rounded-lg border p-3">
                          <span className="text-xs text-muted-foreground">{f.description || f.name}</span>
                          <Switch
                            id={`f-${f.name}`}
                            checked={!!values[f.name]}
                            onCheckedChange={(checked) => {
                              setValues({ ...values, [f.name]: checked });
                              if (errors[f.name]) setErrors({ ...errors, [f.name]: null });
                            }}
                          />
                        </div>
                      ) : f.type === "array" ? (
                        <Textarea 
                          id={`f-${f.name}`} 
                          rows={2} 
                          value={values[f.name] || ""} 
                          onChange={(e) => { 
                            setValues({ ...values, [f.name]: e.target.value });
                            if (errors[f.name]) setErrors({ ...errors, [f.name]: null });
                          }} 
                          placeholder={f.description || "Un élément par ligne"}
                          className={errors[f.name] ? "border-destructive focus-visible:ring-destructive" : ""}
                        />
                      ) : (
                        <Input 
                          id={`f-${f.name}`} 
                          value={values[f.name] || ""} 
                          onChange={(e) => { 
                            setValues({ ...values, [f.name]: e.target.value });
                            if (errors[f.name]) setErrors({ ...errors, [f.name]: null });
                          }} 
                          placeholder={f.description || ""} 
                          className={errors[f.name] ? "border-destructive focus-visible:ring-destructive" : ""}
                        />
                      )}
                      {errors[f.name] && <p className="text-[0.8rem] font-medium text-destructive">{errors[f.name]}</p>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between">
              <StatusBadge status={result.status} />
              <span className="text-xs text-muted-foreground font-mono">{result.execution_id?.slice(0, 8)} · {result.execution_time}ms</span>
            </div>
            {result.prompt && <div className="text-xs text-muted-foreground">Prompt utilisé : <span className="font-mono">{result.prompt.name} v{result.prompt.version}</span> · {result.provider}</div>}
            {((result.output?.simulation_mode || result.output?.warning) || (typeof result.output === 'object' && result.output?.warning)) && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300 space-y-1">
                <div className="font-semibold flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  Mode Simulation Actif (Mock)
                </div>
                <p className="text-[11px] leading-relaxed opacity-90">
                  {result.output?.warning || "Le moteur a utilisé une simulation de test car aucune clé API de transcription (Groq Whisper ou OpenAI Whisper) n'est configurée. Renseignez votre clé dans l'administration des Providers pour transcrire vos vrais audios."}
                </p>
              </div>
            )}
            <ResultViewer output={result.output} useCase={useCase} />
            <div className="flex items-center gap-2 text-xs text-muted-foreground">{result.context_summary && <span>Contexte : {Object.entries(result.context_summary).filter(([, v]) => v).map(([k]) => k).join(", ") || "aucun"}</span>}</div>
          </div>
        )}

        <DialogFooter className="sm:justify-between flex-wrap gap-2">
          {!result ? (
            <>
              <Button variant="outline" onClick={close}>Annuler</Button>
              <Button onClick={run} disabled={running}>{running ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Exécution…</> : <><Cpu className="h-3.5 w-3.5 mr-1.5" /> Exécuter le Use Case</>}</Button>
            </>
          ) : result.status === "success" && !result.validated ? (
            <div className="w-full">
              <Textarea placeholder="Commentaire (optionnel)" value={comment} onChange={(e) => setComment(e.target.value)} rows={2} className="mb-2" />
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <Button asChild variant="ghost" size="sm"><Link to={`/executions/${result.execution_id}`}>Voir l'exécution <ArrowRight className="h-3.5 w-3.5 ml-1" /></Link></Button>
                <div className="flex gap-2">
                  <Button variant="outline" className="text-rose-600 border-rose-200 hover:bg-rose-50" disabled={deciding} onClick={() => decide("rejected")}><X className="h-4 w-4 mr-1.5" /> Rejeter</Button>
                  <Button className="bg-emerald-600 hover:bg-emerald-700" disabled={deciding} onClick={() => decide("approved")}><Check className="h-4 w-4 mr-1.5" /> Valider</Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between w-full flex-wrap gap-2">
              <div className="flex items-center gap-2 text-sm">
                {result.decision && <StatusBadge status={result.decision === "approved" ? "approved" : "rejected"} label={result.decision === "approved" ? "Validé par l'humain" : "Rejeté par l'humain"} />}
              </div>
              <div className="flex gap-2">
                <Button asChild variant="ghost" size="sm"><Link to={`/executions/${result.execution_id}`}>Voir l'exécution <ArrowRight className="h-3.5 w-3.5 ml-1" /></Link></Button>
                <Button variant="outline" onClick={close}>Fermer</Button>
              </div>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
