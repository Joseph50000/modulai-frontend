import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Save, ShieldCheck } from "lucide-react";

function getCorsConfig(project) {
  return project?.configuration?.cors || {};
}

function parseOrigins(value) {
  return value.split("\n").map((origin) => origin.trim()).filter(Boolean);
}

function validateOrigin(origin) {
  if (origin === "*") return "L’origine générique * est interdite pour une API authentifiée.";
  try {
    const url = new URL(origin);
    if (!["http:", "https:"].includes(url.protocol)) return "Utilisez une origine http:// ou https://.";
    if (url.pathname !== "/" || url.search || url.hash) return "Saisissez uniquement l’origine, sans chemin ni paramètres.";
  } catch (_) {
    return "Cette origine n’est pas une URL valide.";
  }
  return null;
}

export default function ProjectCorsSettings({ project, onSaved }) {
  const { toast } = useToast();
  const [enabled, setEnabled] = useState(true);
  const [origins, setOrigins] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const cors = getCorsConfig(project);
    setEnabled(cors.enabled !== false);
    setOrigins(Array.isArray(cors.allowed_origins) ? cors.allowed_origins.join("\n") : "");
  }, [project?.id]);

  const save = async () => {
    const allowedOrigins = parseOrigins(origins);
    const invalid = allowedOrigins.map(validateOrigin).find(Boolean);
    if (invalid) {
      toast({ title: "Origine invalide", description: invalid, variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await base44.entities.Project.update(project.id, {
        configuration: {
          ...(project.configuration || {}),
          cors: { enabled, allowed_origins: allowedOrigins },
        },
      });
      toast({ title: "Configuration CORS enregistrée", description: "Elle sera appliquée aux prochains appels du gateway." });
      onSaved?.();
    } catch (e) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> CORS du gateway</CardTitle>
        <Badge variant="outline" className="text-xs">par projet</Badge>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-sm text-muted-foreground">
          Autorisez les applications web qui peuvent appeler les endpoints de ce projet depuis un navigateur. Une origine correspond uniquement à un schéma, un domaine et éventuellement un port.
        </p>
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={enabled} onCheckedChange={setEnabled} />
          Activer la policy CORS pour ce projet
        </label>
        <div className="space-y-2">
          <Label>Origines autorisées</Label>
          <textarea
            value={origins}
            onChange={(e) => setOrigins(e.target.value)}
            placeholder={'https://mon-application.example\nhttp://localhost:5173'}
            className="w-full min-h-32 rounded-md border border-input bg-transparent px-3 py-2 text-sm font-mono"
            spellCheck="false"
          />
          <p className="text-xs text-muted-foreground">Une origine par ligne. N’utilisez pas `*` avec une API protégée par Bearer token.</p>
        </div>
        <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
          Le gateway répondra aux pré-vérifications <code className="font-mono">OPTIONS</code> et autorisera <code className="font-mono">Authorization</code>, <code className="font-mono">Content-Type</code> et <code className="font-mono">x-project-id</code> pour les origines enregistrées.
        </div>
        <Button onClick={save} disabled={saving}><Save className="h-4 w-4 mr-1.5" /> {saving ? "Enregistrement…" : "Enregistrer"}</Button>
      </CardContent>
    </Card>
  );
}
