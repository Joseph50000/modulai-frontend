import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, History } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import { useToast } from "@/components/ui/use-toast";
import { nextVersion } from "@/lib/modules";

// Prompts are stored in the Prompt entity, linked to the module (module_id)
// and the use case (use_case), and are versioned. The Core resolves the active
// version at execution time — an execution always records which prompt was used.
export default function ModulePromptsManager({ module }) {
  const { toast } = useToast();
  const [prompts, setPrompts] = useState(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", version: "1.0.0", description: "", instructions: "", variables: "" });

  const load = async () => {
    const all = await base44.entities.Prompt.filter({ module_id: module.id }, "-version", 100);
    setPrompts(all);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [module.id]);

  const useCases = module.use_cases || [];
  const create = async () => {
    if (!form.name.trim() || !form.instructions.trim()) return;
    try {
      await base44.entities.Prompt.create({
        name: form.name.trim(),
        use_case: form.name.trim(),
        module_id: module.id,
        version: form.version.trim() || "1.0.0",
        description: form.description.trim(),
        instructions: form.instructions.trim(),
        variables: form.variables.split(",").map((v) => v.trim()).filter(Boolean),
        status: "active",
      });
      setForm({ name: "", version: "1.0.0", description: "", instructions: "", variables: "" });
      setOpen(false);
      await load();
      toast?.({ title: "Prompt créé" });
    } catch (e) { toast?.({ variant: "destructive", title: "Erreur", description: e.message }); }
  };

  const setPromptStatus = async (id, status) => { await base44.entities.Prompt.update(id, { status }); await load(); };

  const onPickUseCase = (v) => setForm((f) => ({ ...f, name: v, version: nextVersionFor(v) }));
  const nextVersionFor = (name) => {
    const existing = (prompts || []).filter((p) => p.name === name).map((p) => p.version);
    if (!existing.length) return "1.0.0";
    existing.sort((a, b) => b.localeCompare(a, "en", { numeric: true }));
    return nextVersion(existing[0], "patch");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Prompts versionnés, associés à un Use Case. Chaque exécution IA trace la version utilisée.</p>
        <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1.5" /> Nouveau prompt</Button>
      </div>
      {!prompts ? <div className="h-20 bg-muted rounded-lg animate-pulse" /> : prompts.length === 0 ? (
        <div className="text-center py-10 text-sm text-muted-foreground border border-dashed border-border rounded-xl">Aucun prompt. Créez-en un et liez-le à un Use Case du module.</div>
      ) : (
        <div className="space-y-2.5">
          {prompts.map((p) => (
            <div key={p.id} className="rounded-lg border border-border p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{p.name}</span>
                    <Badge variant="outline" className="font-mono text-xs"><History className="h-3 w-3 mr-1" />v{p.version}</Badge>
                    <StatusBadge status={p.status} />
                  </div>
                  {p.description && <p className="text-sm text-muted-foreground mt-1">{p.description}</p>}
                  {p.variables?.length > 0 && <div className="flex flex-wrap gap-1 mt-2">{p.variables.map((v) => <Badge key={v} variant="secondary" className="font-mono text-xs font-normal">{`{{${v}}}`}</Badge>)}</div>}
                </div>
                {p.status === "active" ? (
                  <Button variant="outline" size="sm" onClick={() => setPromptStatus(p.id, "deprecated")}>Déprécier</Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => setPromptStatus(p.id, "active")}>Activer</Button>
                )}
              </div>
              {p.instructions && <pre className="mt-3 text-xs bg-muted/60 rounded-md p-3 whitespace-pre-wrap font-mono leading-relaxed max-h-44 overflow-auto">{p.instructions}</pre>}
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nouveau prompt</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="pn">Associé au Use Case</Label>
                <Select onValueChange={onPickUseCase}>
                  <SelectTrigger id="pn"><SelectValue placeholder="Sélectionnez un Use Case…" /></SelectTrigger>
                  <SelectContent>
                    {(useCases.length === 0 ? [] : useCases).map((u) => <SelectItem key={u.key} value={u.prompt_name || u.key}>{u.name} ({u.prompt_name || u.key})</SelectItem>)}
                  </SelectContent>
                </Select>
                {useCases.length === 0 && <p className="text-xs text-amber-600">Créez d'abord un Use Case.</p>}
              </div>
              <div className="space-y-1.5"><Label htmlFor="pv">Version</Label><Input id="pv" className="font-mono text-sm" value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} /></div>
            </div>
            <div className="space-y-1.5"><Label htmlFor="pd">Description</Label><Input id="pd" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="pi">Instructions du prompt *</Label><Textarea id="pi" value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} rows={6} placeholder="Tu es un analyste de risques. Analyse le contexte fourni et renvoie une sortie structurée…" /></div>
            <div className="space-y-1.5"><Label htmlFor="pvars">Variables (séparées par des virgules)</Label><Input id="pvars" className="font-mono text-sm" value={form.variables} onChange={(e) => setForm({ ...form, variables: e.target.value })} placeholder="processus, activite, evenement" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button><Button onClick={create} disabled={!form.name.trim() || !form.instructions.trim()}>Créer & activer</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}