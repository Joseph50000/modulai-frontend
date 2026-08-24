import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function StatCard({ label, value, icon: Icon, accent }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wide font-medium">{label}</div>
          <div className="text-3xl font-heading font-semibold mt-2">{value}</div>
        </div>
        {Icon && (
          <div className={cn("h-11 w-11 rounded-xl grid place-items-center", accent || "bg-muted")}>
            <Icon className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
      </div>
    </Card>
  );
}