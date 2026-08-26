import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { KeyRound, Plus, Copy, Check, Ban, RotateCw, Power, PowerOff } from "lucide-react";
import { generateApiKey, ENV_LABEL, maskKey } from "@/core/gateway/apiKey";
import StatusBadge from "@/components/StatusBadge";
import { recordAudit } from "@/core/ai/auditTrail";

export default function ApiKeyManager({ project, availableScopes, onChange }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [keys, setKeys] = useState(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", environment: "development", expires_at: "", rate_limit_per_min: 0, rate_limit_per_day: 0, scopes: [] });
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState(null); // { fullKey }
  const [copied, setCopied] = useState(false);

  const load = async () => {
    const ks = await base44.entities.ApiKey.filter({ project_id: project.id }, "-created_date", 100);
    setKeys(ks);
  };
  useEffect(() => { load(); }, [project.id]);

  const create = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const { fullKey, prefix, hash } = await generateApiKey();
      const apiKeyData = {
        name: form.name.trim(),
        project_id: project.id,
        project_name: project.name,
        key_prefix: prefix,
        secret_hash: hash,
        status: "active",
        environment: form.environment,
        scopes: form.scopes,
        expires_at: form.expires_at || null,
        rate_limit_per_min: Number(form.rate_limit_per_min) || 0,
        rate_limit_per_day: Number(form.rate_limit_per_day) || 0,
        created_by_name: user?.full_name || user?.email || "",
      };
      const createdKey = await base44.entities.ApiKey.create(apiKeyData);
      
      await recordAudit({
        project_id: project.id, project_name: project.name,
        user_id: user?.id, user_name: user?.full_name || user?.email,
        action: "modified", entity_type: "ApiKey", entity_id: createdKey.id,
        new_value: { name: apiKeyData.name, environment: apiKeyData.environment },
        comment: `Clé API "${apiKeyData.name}" créée.`
      });

      setCreated({ fullKey });
      setForm({ name: "", environment: "development", expires_at: "", rate_limit_per_min: 0, rate_limit_per_day: 0, scopes: [] });
      await load(); onChange?.();
      toast({ title: "Clé API créée", description: "Copiez-la maintenant — elle ne sera plus affichée." });
    } catch (e) { toast({ variant: "destructive", title: "Erreur", description: e.message }); }
    finally { setSaving(false); }
  };

  const setStatus = async (k, status) => { 
    await base44.entities.ApiKey.update(k.id, { status }); 
    await recordAudit({
      project_id: project.id, project_name: project.name,
      user_id: user?.id, user_name: user?.full_name || user?.email,
      action: "modified", entity_type: "ApiKey", entity_id: k.id,
      new_value: { status },
      comment: `Statut de la clé API "${k.name}" changé en ${status}.`
    });
    await load(); 
    onChange?.(); 
  };

  const regenerate = async (k) => {
    const { fullKey, prefix, hash } = await generateApiKey();
    await base44.entities.ApiKey.update(k.id, { secret_hash: hash, key_prefix: prefix, status: "active", last_used_at: null });
    await recordAudit({
      project_id: project.id, project_name: project.name,
      user_id: user?.id, user_name: user?.full_name || user?.email,
      action: "modified", entity_type: "ApiKey", entity_id: k.id,
      new_value: { status: "active", regenerated: true },
      comment: `Clé API "${k.name}" régénérée.`
    });
    setCreated({ fullKey });
    setOpen(true);
    await load();
    onChange?.();
    toast({ title: "Clé régénérée", description: "Copiez le nouveau secret." });
  };

  const toggleScope = (s) => setForm((f) => ({ ...f, scopes: f.scopes.includes(s) ? f.scopes.filter((x) => x !== s) : [...f.scopes, s] }));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">Clés d'API au niveau du projet. Une clé détermine le projet (isolation entre projets) et limite l'accès via ses scopes.</p>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setCreated(null); }}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1.5" /> Créer une clé</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Créer une clé API</DialogTitle></DialogHeader>
            {created ? (
              <div className="space-y-3 py-2">
                <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                  Copiez cette clé maintenant. Pour des raisons de sécurité, elle ne sera plus jamais affichée.
                </div>
                <div className="flex items-center gap-2">
                  <Input readOnly value={created.fullKey} className="font-mono text-xs" />
                  <Button className="shrink-0" size="icon" variant="outline" onClick={() => { navigator.clipboard.writeText(created.fullKey); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
                    {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <DialogFooter><Button onClick={() => { setOpen(false); setCreated(null); }}>Terminé</Button></DialogFooter>
              </div>
            ) : (
              <>
                <div className="space-y-3 py-1">
                  <div className="space-y-1.5"><Label>Nom</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Production Risk API" /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5"><Label>Environnement</Label>
                      <Select value={form.environment} onValueChange={(v) => setForm({ ...form, environment: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
                        {Object.entries(ENV_LABEL).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                      </SelectContent></Select>
                    </div>
                    <div className="space-y-1.5"><Label>Expiration (optionnel)</Label><Input type="datetime-local" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5"><Label>Rate limit / min</Label><Input type="number" value={form.rate_limit_per_min} onChange={(e) => setForm({ ...form, rate_limit_per_min: e.target.value })} placeholder="0 = illimité" /></div>
                    <div className="space-y-1.5"><Label>Rate limit / jour</Label><Input type="number" value={form.rate_limit_per_day} onChange={(e) => setForm({ ...form, rate_limit_per_day: e.target.value })} placeholder="0 = illimité" /></div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="mb-2 block">Scopes</Label>
                    {availableScopes.length === 0 ? <p className="text-xs text-muted-foreground">Aucun endpoint exposé. Définissez des endpoints sur les modules pour obtenir des scopes.</p> : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-1">
                        {availableScopes.map((s) => (
                          <label key={s} className={`flex items-center gap-3 p-3 text-sm cursor-pointer rounded-md border transition-colors ${form.scopes.includes(s) ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-muted/50'}`}>
                            <Checkbox checked={form.scopes.includes(s)} onCheckedChange={() => toggleScope(s)} />
                            <code className="text-xs font-mono break-all">{s}</code>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button><Button onClick={create} disabled={saving || !form.name.trim()}>{saving ? "Création…" : "Créer la clé"}</Button></DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {!keys ? <div className="h-32 bg-muted rounded-lg animate-pulse" /> : keys.length === 0 ? (
        <div className="text-center py-10 rounded-lg border border-dashed border-border">
          <KeyRound className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Aucune clé API. Créez-en une pour exposer les fonctionnalités du projet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {keys.map((k) => (
            <div key={k.id} className="rounded-lg border border-border p-4 bg-card">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-medium text-sm flex items-center gap-2">{k.name} <StatusBadge status={k.status} /></div>
                  <code className="text-xs text-muted-foreground font-mono">{maskKey(k.key_prefix)}</code>
                  <div className="text-xs text-muted-foreground mt-1.5">{ENV_LABEL[k.environment] || k.environment}{k.expires_at ? ` · expire ${new Date(k.expires_at).toLocaleDateString()}` : " · n'expire jamais"}</div>
                  {k.last_used_at ? <div className="text-xs text-muted-foreground">Dernière utilisation : {new Date(k.last_used_at).toLocaleString()}</div> : <div className="text-xs text-muted-foreground">Jamais utilisée</div>}
                </div>
              </div>
              <div className="flex flex-wrap gap-1 mt-3">
                {(k.scopes || []).map((s) => <Badge key={s} variant="secondary" className="text-xs font-mono font-normal">{s}</Badge>)}
                {k.scopes?.length === 0 && <span className="text-xs text-muted-foreground">Aucun scope</span>}
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                {k.status === "active" && <Button size="sm" variant="outline" onClick={() => setStatus(k, "disabled")}><PowerOff className="h-3.5 w-3.5 mr-1" /> Désactiver</Button>}
                {k.status === "disabled" && <Button size="sm" variant="outline" onClick={() => setStatus(k, "active")}><Power className="h-3.5 w-3.5 mr-1" /> Activer</Button>}
                <Button size="sm" variant="outline" onClick={() => regenerate(k)}><RotateCw className="h-3.5 w-3.5 mr-1" /> Régénérer</Button>
                {k.status !== "revoked" && <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => setStatus(k, "revoked")}><Ban className="h-3.5 w-3.5 mr-1" /> Révoquer</Button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}