import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import EmptyState from "@/components/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FolderKanban, Plus, ArrowRight, Cpu, Blocks } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { CORE_VERSION } from "@/lib/platform";
import { recordAudit } from "@/core/ai/auditTrail";
import { useAuth } from "@/lib/AuthContext";
import { groupByVersion, latestPublishedOf } from "@/lib/modules";

export default function Projects() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [projects, setProjects] = useState(null);
  const [registry, setRegistry] = useState(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });
  const [selected, setSelected] = useState({}); // module_key -> version id
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [ps, mods] = await Promise.all([
      base44.entities.Project.list("-created_date", 100),
      base44.entities.Module.list("-created_date", 200),
    ]);
    setProjects(ps);
    setRegistry(mods);
  };

  useEffect(() => { load(); }, []);

  const pickable = groupByVersion(registry || [])
    .map((g) => ({ ...g, pick: latestPublishedOf(g.versions) || g.latest }))
    .filter((g) => g.pick && g.pick.lifecycle !== "archived");

  const create = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const modules = Object.entries(selected).map(([key, versionId]) => {
        const g = pickable.find((x) => x.key === key);
        const v = g?.versions.find((x) => x.id === versionId) || g?.pick;
        return { module_id: v.id, module_key: v.module_key, name: v.name, version: v.version };
      }).filter(Boolean);
      const project = await base44.entities.Project.create({
        name: form.name.trim(),
        description: form.description.trim(),
        core_version: CORE_VERSION,
        modules,
        configuration: {},
      });
      await recordAudit({
        project_id: project.id, project_name: project.name,
        user_id: user?.id, user_name: user?.full_name || user?.email,
        action: "project_created", entity_type: "Project", entity_id: project.id,
        new_value: { name: project.name, core_version: CORE_VERSION },
      });
      toast({ title: "Projet créé", description: project.name });
      setForm({ name: "", description: "" });
      setSelected({});
      setOpen(false);
      await load();
      navigate(`/projects/${project.id}`);
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur", description: e.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full p-0">
      <PageHeader title="Projects" subtitle="Un projet est une application assemblée à partir du AI Core et de modules métier versionnés.">
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" /> Nouveau projet</Button>
      </PageHeader>

      {!projects ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => <div key={i} className="h-40 bg-muted rounded-xl animate-pulse" />)}
        </div>
      ) : projects.length === 0 ? (
        <EmptyState icon={FolderKanban} title="Aucun projet" description="Créez votre premier projet pour commencer à assembler Core et modules.">
          <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" /> Nouveau projet</Button>
        </EmptyState>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => (
            <Link key={p.id} to={`/projects/${p.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold font-heading">{p.name}</h3>
                    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                  </div>
                  <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2 min-h-[2.5rem]">{p.description || "Aucune description"}</p>
                  <div className="flex items-center gap-2 mt-4 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 text-xs bg-muted px-2 py-1 rounded-md">
                      <Cpu className="h-3 w-3" /> Core v{p.core_version}
                    </span>
                    <span className="text-xs bg-muted px-2 py-1 rounded-md">{(p.modules || []).length} module(s)</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouveau projet</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">Nom du projet</Label>
              <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Projet Gestion des Risques" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="desc">Description</Label>
              <Textarea id="desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Décrivez l'objectif de ce projet…" rows={3} />
            </div>
            <div className="text-xs text-muted-foreground bg-muted/50 rounded-md p-3">
              Ce projet utilisera le AI Core v{CORE_VERSION}. Chaque module est installé dans une version précise.
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5"><Blocks className="h-3.5 w-3.5" /> Modules à installer</Label>
              {pickable.length === 0 ? (
                <p className="text-xs text-muted-foreground">Aucun module publié dans le Registry. Vous pourrez en ajouter plus tard.</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto rounded-md border border-border p-2">
                  {pickable.map((g) => {
                    const v = g.pick;
                    const checked = !!selected[g.key];
                    return (
                      <div key={g.key} className="flex items-center gap-3 py-1">
                        <Checkbox id={`p-${g.key}`} checked={checked} onCheckedChange={(c) => setSelected((s) => { const next = { ...s }; if (c) next[g.key] = v.id; else delete next[g.key]; return next; })} />
                        <label htmlFor={`p-${g.key}`} className="text-sm flex-1 cursor-pointer min-w-0">
                          <span className="font-medium">{v.name}</span>
                          <span className="text-xs text-muted-foreground font-mono ml-2">v{v.version}</span>
                        </label>
                        <span className="text-xs text-muted-foreground">{(v.use_cases || []).length} UC</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={create} disabled={!form.name.trim() || saving}>{saving ? "Création…" : "Créer le projet"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
