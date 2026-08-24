import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import EmptyState from "@/components/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Check, Plus, Blocks, Search, ChevronDown, ChevronRight, Layers, ArrowRight } from "lucide-react";
import { CORE_VERSION } from "@/lib/platform";
import { recordAudit } from "@/core/ai/auditTrail";
import { groupByVersion, latestPublishedOf } from "@/lib/modules";
import ModuleCreateDialog from "@/components/modules/ModuleCreateDialog";

const CATEGORIES = ["Toutes", "Risque", "Finance", "RH", "Compliance", "Contrats", "Reporting", "Audit"];

export default function ModuleRegistry() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [modules, setModules] = useState(null);
  const [projects, setProjects] = useState([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Toutes");
  const [createOpen, setCreateOpen] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [addFor, setAddFor] = useState(null); // { versions, selectedId }
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedVersionId, setSelectedVersionId] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [mods, projs] = await Promise.all([
      base44.entities.Module.list("-created_date", 200),
      base44.entities.Project.list("-created_date", 100),
    ]);
    setModules(mods);
    setProjects(projs);
  }, []);
  useEffect(() => { load(); }, [load]);

  const groups = groupByVersion(modules || []);
  const filtered = groups.filter((g) => {
    const m = g.latest;
    if (category !== "Toutes" && (m.category || "Autre") !== category) return false;
    if (query) {
      const q = query.toLowerCase();
      if (!(m.name + " " + (m.description || "") + " " + g.key).toLowerCase().includes(q)) return false;
    }
    return true;
  });
  const existingKeys = groups.map((g) => g.key);

  const createModule = async (data) => {
    const created = await base44.entities.Module.create(data);
    await recordAudit({ module_id: created.id, module_name: created.name, user_id: user?.id, user_name: user?.full_name || user?.email, action: "modified", entity_type: "Module", entity_id: created.id, new_value: { name: created.name, version: created.version } });
    toast({ title: "Module créé", description: `${created.name} v${created.version}` });
    setCreateOpen(false);
    await load();
    navigate(`/modules/${created.id}`);
  };

  const openAdd = (g) => {
    const preferred = latestPublishedOf(g.versions) || g.latest;
    setAddFor({ versions: g.versions, selectedId: preferred.id });
    setSelectedVersionId(preferred.id);
  };

  const addToProject = async () => {
    if (!selectedProject || !selectedVersionId || !addFor) return;
    setSaving(true);
    try {
      const mod = addFor.versions.find((v) => v.id === selectedVersionId);
      const project = await base44.entities.Project.get(selectedProject);
      const exists = (project.modules || []).some((m) => m.module_id === mod.id);
      if (exists) { toast({ title: "Cette version est déjà installée dans le projet." }); }
      else {
        const updated = [...(project.modules || []), { module_id: mod.id, module_key: mod.module_key, name: mod.name, version: mod.version }];
        await base44.entities.Project.update(selectedProject, { modules: updated });
        await recordAudit({ project_id: project.id, project_name: project.name, module_id: mod.id, module_name: mod.name, user_id: user?.id, user_name: user?.full_name || user?.email, action: "module_added", entity_type: "Module", entity_id: mod.id, new_value: { name: mod.name, version: mod.version } });
        toast({ title: "Module ajouté", description: `${mod.name} v${mod.version} → ${project.name}` });
      }
      setAddFor(null); setSelectedProject(""); setSelectedVersionId("");
    } catch (e) { toast({ variant: "destructive", title: "Erreur", description: e.message }); }
    finally { setSaving(false); }
  };

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto">
      <PageHeader title="Module Registry" subtitle="Gérez vos modules métier versionnés, leurs fonctionnalités, Use Cases IA, prompts et schémas. Le Core les exécute sans modification du code.">
        <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-2" /> Créer un module</Button>
      </PageHeader>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher un module…" className="pl-9" />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="sm:w-48"><SelectValue /></SelectTrigger>
          <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {!modules ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{[0, 1].map((i) => <div key={i} className="h-48 bg-muted rounded-xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Blocks} title="Aucun module" description="Créez votre premier module métier — le Registry devient un véritable gestionnaire de modules.">
          <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-2" /> Créer un module</Button>
        </EmptyState>
      ) : (
        <div className="space-y-4">
          {filtered.map((g) => {
            const m = g.latest;
            const featCount = (m.features || []).length;
            const ucCount = (m.use_cases || []).length;
            const isOpen = expanded === g.key;
            return (
              <div key={g.key} className="rounded-xl border border-border bg-card overflow-hidden">
                <Card className="border-0 shadow-none">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-heading font-semibold text-lg">{m.name}</h3>
                          <Badge variant="outline" className="font-mono text-xs">v{m.version}</Badge>
                          <StatusBadge status={m.lifecycle} />
                          {m.category && <Badge variant="secondary" className="text-xs font-normal">{m.category}</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{m.description || "Aucune description"}</p>
                        <div className="flex flex-wrap gap-4 mt-3 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1.5"><Layers className="h-3.5 w-3.5" /> {featCount} fonctionnalité(s)</span>
                          <span className="inline-flex items-center gap-1.5"><Blocks className="h-3.5 w-3.5" /> {ucCount} AI Use Case(s)</span>
                          <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-600" /> Core v{m.core_version || CORE_VERSION}</span>
                          <button className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => setExpanded(isOpen ? null : g.key)}>
                            {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />} {g.versions.length} version(s)
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                        <Button size="sm" variant="outline" asChild><Link to={`/modules/${m.id}`}>Ouvrir</Link></Button>
                        <Button size="sm" onClick={() => openAdd(g)} disabled={projects.length === 0}><Plus className="h-3.5 w-3.5 mr-1" /> Ajouter au projet</Button>
                      </div>
                    </div>
                    {isOpen && (
                      <div className="mt-4 pt-4 border-t border-border space-y-1.5">
                        {g.versions.map((v) => (
                          <Link key={v.id} to={`/modules/${v.id}`} className="flex items-center justify-between gap-3 text-sm rounded-md px-3 py-2 hover:bg-muted">
                            <div className="flex items-center gap-2"><Badge variant="outline" className="font-mono text-xs">v{v.version}</Badge><StatusBadge status={v.lifecycle} /></div>
                            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                          </Link>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      )}

      <ModuleCreateDialog open={createOpen} onOpenChange={setCreateOpen} onCreate={createModule} existingKeys={existingKeys} />

      <Dialog open={!!addFor} onOpenChange={(o) => !o && setAddFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Ajouter {addFor?.versions?.[0]?.name} à un projet</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            {projects.length === 0 ? <p className="text-sm text-muted-foreground">Créez d'abord un projet.</p> : (
              <>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Projet</label>
                  <Select value={selectedProject} onValueChange={setSelectedProject}>
                    <SelectTrigger><SelectValue placeholder="Sélectionnez un projet…" /></SelectTrigger>
                    <SelectContent>{projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Version du module</label>
                  <Select value={selectedVersionId} onValueChange={setSelectedVersionId}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{addFor?.versions.map((v) => <SelectItem key={v.id} value={v.id}>v{v.version} · {v.lifecycle}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddFor(null)}>Annuler</Button>
            <Button onClick={addToProject} disabled={!selectedProject || !selectedVersionId || saving}>{saving ? "Ajout…" : "Ajouter au projet"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}