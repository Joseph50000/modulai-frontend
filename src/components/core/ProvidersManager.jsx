import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import StatusBadge from "@/components/StatusBadge";
import { Plus, Trash2, Pencil, Zap } from "lucide-react";
import { hashSecret, testProviderConnection } from "@/core/ai/coreConfig";

const TYPES = [
  { value: "mock", label: "Mock (local, sans coût)" },
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },
  { value: "gemini", label: "Google Gemini" },
  { value: "azure_openai", label: "Azure OpenAI" },
  { value: "local", label: "Modèle local" },
  { value: "custom", label: "Provider custom" },
];

export default function ProvidersManager() {
  const { toast } = useToast();
  const [items, setItems] = useState(null);
  const [editing, setEditing] = useState(null);

  const load = async () => setItems(await base44.entities.AiProvider.list("-created_date", 100));
  useEffect(() => { load(); }, []);

  const save = async (data) => {
    if (editing?.id) {
      const patch = { name: data.name, type: data.type, endpoint_url: data.endpoint_url, status: data.status };
      if (data.api_key) {
        patch.secret_hash = await hashSecret(data.api_key);
        patch.api_key_set = true;
      }
      await base44.entities.AiProvider.update(editing.id, patch);
      toast({ title: "Provider mis à jour" });
    } else {
      const rec = { name: data.name, type: data.type, endpoint_url: data.endpoint_url, status: data.status, secret_hash: data.api_key ? await hashSecret(data.api_key) : "", api_key_set: !!data.api_key, last_test_status: "unknown" };
      await base44.entities.AiProvider.create(rec);
      toast({ title: "Provider créé" });
    }
    setEditing(null);
    load();
  };

  const toggle = async (p) => { await base44.entities.AiProvider.update(p.id, { status: p.status === "active" ? "disabled" : "active" }); load(); };
  const remove = async (p) => { await base44.entities.AiProvider.delete(p.id); toast({ title: "Provider supprimé" }); load(); };
  const testConn = async (p) => {
    const res = await testProviderConnection(p);
    await base44.entities.AiProvider.update(p.id, { last_test_status: res.ok ? "ok" : "error", last_tested_at: new Date().toISOString() });
    toast({ title: res.ok ? "Connexion OK" : "Connexion échouée", description: res.message, variant: res.ok ? "default" : "destructive" });
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button onClick={() => setEditing({})}><Plus className="h-4 w-4 mr-1.5" /> Ajouter un provider</Button></div>
      {!items && <p className="text-sm text-muted-foreground">Chargement…</p>}
      {items && items.length === 0 && <p className="text-sm text-muted-foreground">Aucun provider. Créez-en un (le Mock est recommandé pour démarrer sans coût).</p>}
      <div className="grid gap-3">
        {items?.map((p) => (
          <Card key={p.id}><CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <div className="flex items-center gap-2"><span className="font-medium">{p.name}</span><Badge variant="outline" className="font-mono">{p.type}</Badge><StatusBadge status={p.status} /></div>
              <div className="text-xs text-muted-foreground mt-1">
                {p.endpoint_url || "Aucun endpoint"} · Clé : {p.api_key_set ? "configurée (masquée)" : "—"} · Test : {p.last_test_status || "—"}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <Button size="sm" variant="outline" onClick={() => testConn(p)}><Zap className="h-3.5 w-3.5 mr-1" /> Tester</Button>
              <Button size="sm" variant="outline" onClick={() => toggle(p)}>{p.status === "active" ? "Désactiver" : "Activer"}</Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(p)}><Pencil className="h-3.5 w-3.5" /></Button>
              <Button size="sm" variant="ghost" onClick={() => remove(p)}><Trash2 className="h-3.5 w-3.5" /></Button>
            </div>
          </CardContent></Card>
        ))}
      </div>
      {editing && <ProviderDialog initial={editing} onClose={() => setEditing(null)} onSave={save} />}
    </div>
  );
}

function ProviderDialog({ initial, onClose, onSave }) {
  const [name, setName] = useState(initial.name || "");
  const [type, setType] = useState(initial.type || "mock");
  const [endpoint, setEndpoint] = useState(initial.endpoint_url || "");
  const [apiKey, setApiKey] = useState("");
  const [status, setStatus] = useState(initial.status || "active");

  return (
    <Dialog open onOpenChange={onClose}><DialogContent>
      <DialogHeader><DialogTitle>{initial.id ? "Modifier le provider" : "Nouveau provider"}</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div><Label>Nom</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="OpenAI Production" /></div>
        <div><Label>Type</Label>
          <Select value={type} onValueChange={setType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent></Select>
        </div>
        <div><Label>Endpoint URL (optionnel)</Label><Input value={endpoint} onChange={(e) => setEndpoint(e.target.value)} placeholder="https://api.openai.com/v1" /></div>
        <div><Label>Clé d'API {initial.id ? "(laisser vide pour ne pas changer)" : ""}</Label>
          <Input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-…" />
          <p className="text-xs text-muted-foreground mt-1">La clé est hachée (SHA-256) et jamais réaffichée.</p>
        </div>
        <div><Label>Statut</Label>
          <Select value={status} onValueChange={setStatus}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Actif</SelectItem><SelectItem value="disabled">Désactivé</SelectItem></SelectContent></Select>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Annuler</Button>
        <Button onClick={() => onSave({ name, type, endpoint_url: endpoint, api_key: apiKey, status })} disabled={!name}>Enregistrer</Button>
      </DialogFooter>
    </DialogContent></Dialog>
  );
}