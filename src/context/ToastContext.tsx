import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

type Toast = { id: number; kind: 'success' | 'error'; text: string };
const Ctx = createContext<(kind: Toast['kind'], text: string) => void>(() => {});
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((kind: Toast['kind'], text: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, kind, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="fixed right-4 top-4 z-[100] flex w-80 max-w-[90vw] flex-col gap-2" role="status">
        {toasts.map((t) => (
          <div key={t.id} className={`rounded-lg px-4 py-3 text-sm text-white shadow-lg ${t.kind === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>{t.text}</div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
