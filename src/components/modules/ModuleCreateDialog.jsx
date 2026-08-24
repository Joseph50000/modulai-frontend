import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { slugify, defaultDataSources, defaultDependencies, defaultConfiguration } from "@/lib/modules";

export default function ModuleCreateDialog({ open, onOpenChange, onCreate, existingKeys = [] }) {
  const [form, setForm] = useState({ name: "", module_key: "", description: "", version: "1.0.0", category: "Risque", status: "active" });
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);

  const key = form.module_key || slugify(form.name);
  const keyTaken = existingKeys.includes(key);

  const reset = () => { setForm({ name: "", module_key: "", description: "", version: "1.0.0", category: "Risque", status: "active" }); setTouched(false); };

  const create = async () => {
    if (!form.name.trim() || !form.version.trim()) return;
    setSaving(true);
    try {
      await onCreate({
        name: form.name.trim(),
        module_key: key,
        description: form.description.trim(),
        version: form.version.trim(),
        core_version: "1.0.0",
        category: form.category || "Risque",
        status: form.status || "active",
        lifecycle: "draft",
        features: [],
        use_cases: [],
        data_sources: defaultDataSources(),
        dependencies: defaultDependencies(),
        configuration: defaultConfiguration(),
        capabilities: [],
      });
      reset();
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Créer un module métier</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="mname">Nom du module *</Label>
            <Input id="mname" value={form.name} onChange={(e) => { setForm({ ...form, name: e.target.value, module_key: form.module_key || "" }); }} placeholder="Risk Management" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="mkey">Identifiant</Label>
              <Input id="mkey" value={touched ? form.module_key : (form.module_key || slugify(form.name))} onChange={(e) => { setTouched(true); setForm({ ...form, module_key: e.target.value }); }} placeholder="risk-management" className="font-mono text-sm" />
              {keyTaken && <p className="text-xs text-amber-600">Un module avec cet identifiant existe déjà — une nouvelle version sera créée.</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mver">Version initiale</Label>
              <Input id="mver" value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} className="font-mono text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="mcat">Catégorie</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger id="mcat"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Risque", "Finance", "RH", "Compliance", "Contrats", "Reporting", "Audit"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mstat">Statut</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger id="mstat"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="beta">Beta</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mdesc">Description</Label>
            <Textarea id="mdesc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} placeholder="Module d'analyse et de gestion des risques." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={create} disabled={!form.name.trim() || !form.version.trim() || saving}>{saving ? "Création…" : "Créer le module"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}