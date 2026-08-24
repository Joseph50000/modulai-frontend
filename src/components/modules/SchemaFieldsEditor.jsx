import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { FIELD_TYPES } from "@/core/ai/moduleExecution";

// Editor for an array of field definitions: { name, type, required, description }.
export default function SchemaFieldsEditor({ fields = [], onChange, title }) {
  const update = (next) => onChange(next);
  const add = () => update([...fields, { name: "", type: "string", required: false, description: "" }]);
  const set = (i, patch) => update(fields.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
  const remove = (i) => update(fields.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground uppercase tracking-wide">{title}</div>
        <Button size="sm" variant="outline" onClick={add}><Plus className="h-3.5 w-3.5 mr-1" /> Champ</Button>
      </div>
      {fields.length === 0 && <p className="text-xs text-muted-foreground py-3">Aucun champ défini.</p>}
      {fields.map((f, i) => (
        <div key={i} className="grid grid-cols-12 gap-2 items-center rounded-lg border border-border p-2.5 bg-card">
          <Input className="col-span-4 h-9" placeholder="nom_du_champ" value={f.name || ""} onChange={(e) => set(i, { name: e.target.value })} />
          <Select value={f.type || "string"} onValueChange={(v) => set(i, { type: v })}>
            <SelectTrigger className="col-span-3 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>{FIELD_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
          <div className="col-span-4 flex items-center gap-2">
            <Input className="h-9" placeholder="description" value={f.description || ""} onChange={(e) => set(i, { description: e.target.value })} />
          </div>
          <div className="col-span-1 flex items-center justify-center gap-1.5">
            <Checkbox id={`req-${i}`} checked={!!f.required} onCheckedChange={(v) => set(i, { required: !!v })} />
            <Label htmlFor={`req-${i}`} className="text-xs text-muted-foreground"></Label>
          </div>
          <Button variant="ghost" size="icon" className="col-span-0 h-9 w-9 text-muted-foreground hover:text-destructive" onClick={() => remove(i)}><Trash2 className="h-4 w-4" /></Button>
        </div>
      ))}
      <div className="text-[11px] text-muted-foreground grid grid-cols-12 gap-2 px-1">
        <span className="col-span-4">Nom</span><span className="col-span-3">Type</span><span className="col-span-4">Description</span><span className="col-span-1">Requis</span>
      </div>
    </div>
  );
}