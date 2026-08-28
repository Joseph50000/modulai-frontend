import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import StatusBadge from "@/components/StatusBadge";
import { Check, Cpu, Pencil } from "lucide-react";

export default function ModuleOverview({ module, updateModule }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: module.name || "", module_key: module.module_key || "", description: module.description || "", category: module.category || "" });

  const handleSave = async () => {
    if (!form.name.trim() || !form.module_key.trim()) return;
    await updateModule(form);
    setOpen(false);
  };

  const features = module.features || [];
  const useCases = module.use_cases || [];
  const deps = module.dependencies || [];
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card><CardContent className="p-5 relative">
          <div className="text-xs text-muted-foreground uppercase tracking-wide flex justify-between items-center">
            Informations générales
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => { setForm({ name: module.name || "", module_key: module.module_key || "", description: module.description || "", category: module.category || "" }); setOpen(true); }}><Pencil className="h-3 w-3 mr-1" /> Modifier</Button>
          </div>
          <dl className="mt-3 space-y-2 text-sm">
            <Row label="Nom" value={module.name} />
            <Row label="Identifiant" value={<span className="font-mono">{module.module_key}</span>} />
            <Row label="Version" value={<span className="font-mono">v{module.version}</span>} />
            <Row label="Catégorie" value={module.category || "—"} />
            <Row label="Statut" value={<StatusBadge status={module.status} />} />
            <Row label="Cycle de vie" value={<StatusBadge status={module.lifecycle} />} />
            <Row label="Compatible AI Core" value={`v${module.core_version || "1.0.0"}`} />
          </dl>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Description</div>
          <p className="text-sm mt-3 min-h-[3rem]">{module.description || "Aucune description."}</p>
          <div className="flex flex-col gap-3 mt-5">
            <Stat label="Fonctionnalités" value={features.length} />
            <Stat label="AI Use Cases" value={useCases.length} />
            <Stat label="Sources de données" value={(module.data_sources || []).filter((d) => d.enabled).length + " / " + (module.data_sources || []).length} />
          </div>
          <div className="mt-5">
            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Dépendances</div>
            <div className="flex flex-wrap gap-1.5">
              {deps.length === 0 && <span className="text-xs text-muted-foreground">Aucune</span>}
              {deps.map((d, i) => <Badge key={i} variant="secondary" className="font-normal gap-1"><Cpu className="h-3 w-3" />{d.name} {d.version}</Badge>)}
            </div>
          </div>
          <div className="mt-4 text-xs text-muted-foreground flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-600" /> Le module est exploitable par le AI Core dès publication.</div>
        </CardContent></Card>
      </div>
      
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Modifier les informations</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Label>Nom du module *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Identifiant (clé) *</Label><Input className="font-mono text-sm" value={form.module_key} onChange={(e) => setForm({ ...form, module_key: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Catégorie</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Description</Label><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={!form.name.trim() || !form.module_key.trim()}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, value }) {
  return <div className="flex items-center justify-between gap-3"><dt className="text-muted-foreground">{label}</dt><dd className="font-medium text-right">{value}</dd></div>;
}
function Stat({ label, value }) {
  return <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">{label}</span><span className="font-semibold">{value}</span></div>;
}