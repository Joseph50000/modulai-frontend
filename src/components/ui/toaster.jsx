import { useToast } from "./use-toast";

export function Toaster() {
  const { toasts } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className={`p-4 rounded-lg shadow-xl text-sm pointer-events-auto transition-all animate-in slide-in-from-right-5 ${t.variant === 'destructive' ? 'bg-red-600 text-white' : 'bg-slate-900 text-white border border-slate-700'}`}>
          {t.title && <div className="font-semibold mb-1">{t.title}</div>}
          {t.description && <div className="opacity-90">{t.description}</div>}
        </div>
      ))}
    </div>
  );
}
