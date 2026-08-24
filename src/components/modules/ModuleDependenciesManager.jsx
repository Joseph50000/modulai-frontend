import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, ShieldCheck, AlertTriangle } from "lucide-react";
import { CORE_VERSION } from "@/lib/platform";

const TYPES = [
  { value: "core", label: "Service Core" },
  { value: "service", label: "Service plateforme" },
  { value: "module", label: "Autre module" },
];

export default function ModuleDependenciesManager({ module, updateModule }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "AI Core", type: "core", version: ">=" + CORE_VERSION });
  const deps = module.dependencies || [];

  const add = async () => {
    if (!form.name.trim() || !form.version.trim()) return;
    updateModule({ dependencies: [...deps, { name: form.name.trim(), type: form.type, version: form.version.trim() }] });
    setForm({ name: "", type: "service", version: "" });
    setOpen(false);
  };
  const remove = async (i) => updateModule({ dependencies: deps.filter((_, idx) => idx !== i) });

  const coreOk = deps.some((d) => d.type === "core");
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Le système vérifie ces dépendances avant d'ajouter le module à un projet.</p>
        <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1.5" /> Ajouter une dépendance</Button>
      </div>
      {coreOk ? (
        <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Dépendance AI Core satisfaite (v{CORE_VERSION}).</div>
      ) : (
        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Aucune dépendance AI Core déclarée — le module ne pourra pas s'exécuter via le Core.</div>
      )}
      <div className="space-y-2.5">
        {deps.length === 0 && <div className="text-sm text-muted-foreground text-center py-8 border border-dashed border-border rounded-xl">Aucune dépendance.</div>}
        {deps.map((d, i) => (
          <div key={i} className="flex items-center justify-between gap-3 rounded-lg border border-border p-4">
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="font-normal">{TYPES.find((t) => t.value === d.type)?.label || d.type}</Badge>
              <div>
                <div className="text-sm font-medium">{d.name}</div>
                <div className="text-xs text-muted-foreground font-mono">{d.version}</div>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive" onClick={() => remove(i)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Nouvelle dépendance</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Label htmlFor="dn">Nom</Label><Input id="dn" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="AI Core / Document Service / Audit Service" /></div>
            <div className="space-y-1.5"><Label htmlFor="dt">Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger id="dt"><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label htmlFor="dv">Contrainte de version</Label><Input id="dv" className="font-mono text-sm" value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} placeholder=">=1.0.0" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button><Button onClick={add} disabled={!form.name.trim() || !form.version.trim()}>Ajouter</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}