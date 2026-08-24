import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const MAP = {
  success: "bg-emerald-100 text-emerald-700 border-emerald-200",
  error: "bg-rose-100 text-rose-700 border-rose-200",
  running: "bg-amber-100 text-amber-700 border-amber-200",
  pending: "bg-slate-100 text-slate-600 border-slate-200",
  active: "bg-emerald-100 text-emerald-700 border-emerald-200",
  inactive: "bg-slate-100 text-slate-600 border-slate-200",
  beta: "bg-violet-100 text-violet-700 border-violet-200",
  draft: "bg-slate-100 text-slate-600 border-slate-200",
  published: "bg-blue-100 text-blue-700 border-blue-200",
  archived: "bg-slate-100 text-slate-500 border-slate-200",
  analyzed: "bg-blue-100 text-blue-700 border-blue-200",
  approved: "bg-emerald-100 text-emerald-700 border-emerald-200",
  rejected: "bg-rose-100 text-rose-700 border-rose-200",
  modified: "bg-amber-100 text-amber-700 border-amber-200",
};

const LABELS = {
  success: "Succès",
  error: "Erreur",
  running: "En cours",
  pending: "En attente",
  active: "Actif",
  inactive: "Inactif",
  beta: "Beta",
  draft: "Brouillon",
  published: "Publié",
  archived: "Archivé",
  analyzed: "Analysé",
  approved: "Validé",
  rejected: "Rejeté",
  modified: "Modifié",
};

export default function StatusBadge({ status, label }) {
  const cls = MAP[status] || "bg-slate-100 text-slate-600 border-slate-200";
  return (
    <Badge variant="outline" className={cn("border font-medium", cls)}>
      {label || LABELS[status] || status}
    </Badge>
  );
}