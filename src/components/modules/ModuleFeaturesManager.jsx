import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { featureKeyOf } from "@/lib/modules";

export default function ModuleFeaturesManager({ module, updateModule }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });
  const features = module.features || [];

  const add = async () => {
    if (!form.name.trim()) return;
    await updateModule({ features: [...features, { key: featureKeyOf(form.name), name: form.name.trim(), description: form.description.trim() }] });
    setForm({ name: "", description: "" });
    setOpen(false);
  };
  const remove = async (key) => updateModule({ features: features.filter((f) => f.key !== key) });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Les fonctionnalités ne sont pas codées en dur : créez les vôtres.</p>
        <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1.5" /> Ajouter une fonctionnalité</Button>
      </div>
      {features.length === 0 ? (
        <div className="text-center py-10 text-sm text-muted-foreground border border-dashed border-border rounded-xl">Aucune fonctionnalité. Ajoutez-en pour structurer les cas d'usage du module.</div>
      ) : (
        <div className="space-y-2.5">
          {features.map((f) => (
            <div key={f.key} className="flex items-start justify-between gap-3 rounded-lg border border-border p-4">
              <div className="min-w-0">
                <div className="font-medium">{f.name}</div>
                <div className="text-xs font-mono text-muted-foreground mt-0.5">{f.key}</div>
                {f.description && <p className="text-sm text-muted-foreground mt-1">{f.description}</p>}
              </div>
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive shrink-0" onClick={() => remove(f.key)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Nouvelle fonctionnalité</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Label htmlFor="fname">Nom *</Label><Input id="fname" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Analyse des risques" /></div>
            <div className="space-y-1.5"><Label htmlFor="fdesc">Description</Label><Textarea id="fdesc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button><Button onClick={add} disabled={!form.name.trim()}>Ajouter</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}