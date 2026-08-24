import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";

// Read-only viewer of the input/output schemas across the module's use cases.
export default function ModuleSchemasViewer({ module, kind }) {
  const useCases = module.use_cases || [];
  const title = kind === "input" ? "Schémas d'entrée" : "Schémas de sortie";
  const empty = kind === "input" ? "ce dont l'IA a besoin pour réaliser son analyse" : "ce que l'IA doit retourner (validé par le Core)";

  if (useCases.length === 0) return <div className="text-center py-10 text-sm text-muted-foreground border border-dashed border-border rounded-xl">Aucun Use Case défini.</div>;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{kind === "input" ? "Définit les données nécessaires à chaque Use Case." : "Définit la réponse attendue de l'IA, utilisée par le Core pour valider la sortie."}</p>
      {useCases.map((uc) => {
        const fields = kind === "input" ? uc.input_schema || [] : uc.output_schema || [];
        return (
          <div key={uc.key} className="rounded-lg border border-border overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-muted/40 border-b border-border flex-wrap">
              <span className="font-medium">{uc.name}</span>
              <Badge variant="outline" className="font-mono text-xs">{uc.key}</Badge>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
              <Badge variant="secondary" className="font-mono text-xs font-normal">{kind}_schema</Badge>
            </div>
            <div className="p-4">
              {fields.length === 0 ? <p className="text-sm text-muted-foreground italic">Aucun champ — {empty}.</p> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="text-left text-xs text-muted-foreground uppercase tracking-wide">
                      <th className="py-2 pr-4">Champ</th><th className="py-2 pr-4">Type</th><th className="py-2 pr-4">Requis</th><th className="py-2">Description</th>
                    </tr></thead>
                    <tbody>
                      {fields.map((f, i) => (
                        <tr key={i} className="border-t border-border">
                          <td className="py-2 pr-4 font-mono">{f.name}</td>
                          <td className="py-2 pr-4"><Badge variant="outline" className="text-xs font-normal">{f.type}</Badge></td>
                          <td className="py-2 pr-4">{f.required ? <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">oui</Badge> : <span className="text-xs text-muted-foreground">non</span>}</td>
                          <td className="py-2 text-muted-foreground">{f.description || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}