import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Trash2, Plus, Route, GripVertical } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];

export default function ModuleEndpointsManager({ moduleData, onChange }) {
  const { toast } = useToast();
  const [draft, setDraft] = useState({ name: "", description: "", method: "POST", path: "", use_case_key: "", required_scopes: [], scopesInput: "" });

  const endpoints = moduleData.endpoints || [];
  const useCases = moduleData.use_cases || [];

  const save = async (next) => {
    await onChange({ ...moduleData, endpoints: next });
  };

  const add = async () => {
    if (!draft.name.trim() || !draft.path.trim()) { toast({ variant: "destructive", title: "Nom et path requis" }); return; }
    const scopes = draft.scopesInput.split(",").map((s) => s.trim()).filter(Boolean);
    const ep = {
      key: (draft.path.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_|_$/g, "") || draft.name.toLowerCase().replace(/\s+/g, "-")),
      name: draft.name.trim(), description: draft.description.trim(), method: draft.method, path: draft.path.trim(),
      use_case_key: draft.use_case_key || null, required_scopes: scopes, auth_required: true,
    };
    await save([...endpoints, ep]);
    setDraft({ name: "", description: "", method: "POST", path: "", use_case_key: "", required_scopes: [], scopesInput: "" });
    toast({ title: "Endpoint ajouté" });
  };

  const remove = async (key) => { await save(endpoints.filter((e) => e.key !== key)); };

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-border p-4 bg-muted/30">
        <h4 className="text-sm font-medium mb-3">Nouvel endpoint</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label className="text-xs">Nom</Label><Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Risk Analysis API" /></div>
          <div className="space-y-1.5"><Label className="text-xs">Use Case exposé</Label>
            <Select value={draft.use_case_key} onValueChange={(v) => setDraft({ ...draft, use_case_key: v })}><SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>{useCases.map((uc) => <SelectItem key={uc.key} value={uc.key}>{uc.name} ({uc.key})</SelectItem>)}</SelectContent></Select>
          </div>
          <div className="space-y-1.5"><Label className="text-xs">Méthode HTTP</Label>
            <Select value={draft.method} onValueChange={(v) => setDraft({ ...draft, method: v })}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select>
          </div>
          <div className="space-y-1.5"><Label className="text-xs">Path</Label><Input value={draft.path} onChange={(e) => setDraft({ ...draft, path: e.target.value })} placeholder="/risk/analyze" className="font-mono" /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label className="text-xs">Description</Label><Input value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Analyse un risque à partir des informations fournies." /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label className="text-xs">Scopes requis (séparés par des virgules)</Label><Input value={draft.scopesInput} onChange={(e) => setDraft({ ...draft, scopesInput: e.target.value })} placeholder="risk:analyze" className="font-mono" /></div>
        </div>
        <Button size="sm" className="mt-3" onClick={add}><Plus className="h-3.5 w-3.5 mr-1" /> Ajouter l'endpoint</Button>
      </div>

      {endpoints.length === 0 ? (
        <div className="text-center py-8 rounded-lg border border-dashed border-border">
          <Route className="h-7 w-7 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Aucun endpoint. Les Use Cases du module peuvent être exposés ici en endpoints d'API.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {endpoints.map((ep) => (
            <div key={ep.key} className="flex items-start gap-3 rounded-lg border border-border p-3 bg-card">
              <GripVertical className="h-4 w-4 text-muted-foreground mt-1 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="font-mono text-xs">{ep.method}</Badge>
                  <code className="text-sm font-mono">{ep.path}</code>
                </div>
                <div className="text-sm font-medium mt-1">{ep.name}</div>
                {ep.use_case_key && <div className="text-xs text-muted-foreground">Use Case: <code className="font-mono">{ep.use_case_key}</code></div>}
                <div className="flex flex-wrap gap-1 mt-1.5">{(ep.required_scopes || []).map((s) => <Badge key={s} className="text-xs font-mono font-normal">{s}</Badge>)}{(!ep.required_scopes || ep.required_scopes.length === 0) && <span className="text-xs text-muted-foreground">Aucun scope</span>}</div>
              </div>
              <Button size="icon" variant="ghost" className="text-muted-foreground hover:text-destructive shrink-0" onClick={() => remove(ep.key)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}