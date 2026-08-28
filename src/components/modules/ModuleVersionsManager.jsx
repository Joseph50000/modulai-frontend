import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import StatusBadge from "@/components/StatusBadge";
import { useToast } from "@/components/ui/use-toast";
import { Plus, GitBranch, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { nextVersion } from "@/lib/modules";
import { useAuth } from "@/lib/AuthContext";
import { recordAudit } from "@/core/ai/auditTrail";

export default function ModuleVersionsManager({ module, onNewVersion }) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ version: nextVersion(module.version, "patch"), kind: "patch" });
  const [groups, setGroups] = useState(null);
  const [versionToDelete, setVersionToDelete] = useState(null);

  const load = async () => {
    const all = await base44.entities.Module.filter({ module_key: module.module_key }, "-version", 100);
    setGroups(all);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [module.module_key]);
  const versions = groups ? groups.map(g => g.id === module.id ? module : g) : [module];
  const sorted = [...versions].sort((a, b) => (b.version || "").localeCompare(a.version || "", "en", { numeric: true }));

  const createVersion = async () => {
    if (!form.version.trim()) return;
    const copy = {
      name: module.name, module_key: module.module_key, description: module.description,
      version: form.version.trim(), core_version: module.core_version,
      category: module.category, status: module.status, lifecycle: "draft",
      features: module.features, use_cases: module.use_cases, data_sources: module.data_sources,
      dependencies: module.dependencies, configuration: module.configuration, capabilities: module.capabilities,
      endpoints: module.endpoints,
    };
    const created = await base44.entities.Module.create(copy);
    await recordAudit({ module_id: created.id, module_name: created.name, user_id: user?.id, user_name: user?.full_name || user?.email, action: "modified", entity_type: "Module", entity_id: created.id, new_value: { version: created.version, from: module.version } });
    toast({ title: "Nouvelle version créée", description: `${created.name} v${created.version}` });
    setOpen(false);
    onNewVersion?.(created);
    navigate(`/modules/${created.id}`);
  };

  const deleteVersion = async (targetId) => {
    try {
      await base44.entities.Module.delete(targetId);
      toast({ title: "Version supprimée" });
      setVersionToDelete(null);
      if (targetId === module.id) navigate("/modules");
      else load();
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de supprimer la version." });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Les anciennes versions sont conservées. Un projet peut rester sur une version antérieure.</p>
        <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1.5" /> Créer une nouvelle version</Button>
      </div>
      <div className="space-y-2.5">
        {sorted.map((v) => (
          <div key={v.id} className={`flex items-center justify-between gap-3 rounded-lg border p-4 ${v.id === module.id ? "border-primary/40 bg-primary/5" : "border-border"}`}>
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-muted grid place-items-center"><GitBranch className="h-4 w-4 text-muted-foreground" /></div>
              <div>
                <div className="flex items-center gap-2"><span className="font-mono font-medium">v{v.version}</span><StatusBadge status={v.lifecycle} />{v.id === module.id && <Badge variant="outline" className="text-xs">version courante</Badge>}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{v.previous_version ? `depuis v${v.previous_version}` : "version initiale"}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {v.id !== module.id && (
                <>
                  <Button variant="outline" size="sm" onClick={() => navigate(`/modules/${v.id}`)}>Ouvrir</Button>
                  <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 px-2" onClick={() => setVersionToDelete(v.id)}><Trash2 className="h-4 w-4" /></Button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
      
      <Dialog open={!!versionToDelete} onOpenChange={(val) => { if(!val) setVersionToDelete(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Confirmer la suppression</DialogTitle></DialogHeader>
          <div className="py-2 text-sm text-muted-foreground">
            Voulez-vous vraiment supprimer cette version ? Cette action est irréversible et supprimera toutes les configurations associées à cette version.
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVersionToDelete(null)}>Annuler</Button>
            <Button variant="destructive" onClick={() => deleteVersion(versionToDelete)}>Oui, supprimer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Nouvelle version de {module.name}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="text-xs text-muted-foreground bg-muted/50 rounded-md p-3">La définition actuelle (v{module.version}) est copiée comme base de départ. Les projets existants conservent leur version.</div>
            <div className="space-y-1.5"><Label>Type de version</Label>
              <Select value={form.kind} onValueChange={(v) => setForm({ kind: v, version: nextVersion(module.version, v) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="patch">Patch (x.y.Z)</SelectItem>
                  <SelectItem value="minor">Minor (x.Y.0)</SelectItem>
                  <SelectItem value="major">Major (X.0.0)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label htmlFor="nv">Nouvelle version</Label><Input id="nv" className="font-mono text-sm" value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button><Button onClick={createVersion}>Créer</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}