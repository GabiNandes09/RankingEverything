"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Button } from "./Button";

interface ConfirmOptions {
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface PendingConfirm extends ConfirmOptions {
  message: string;
}

type ConfirmFn = (message: string, options?: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const resolveRef = useRef<(value: boolean) => void>(() => {});

  const confirm = useCallback<ConfirmFn>((message, options) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setPending({ message, ...options });
    });
  }, []);

  function settle(result: boolean) {
    resolveRef.current(result);
    setPending(null);
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}

      {pending && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6"
          role="alertdialog"
          aria-modal="true"
          aria-label={pending.title ?? "Confirmação"}
        >
          <div className="w-full max-w-sm rounded-2xl border border-border bg-background-elevated p-5 shadow-[0_12px_40px_rgba(0,0,0,0.5)]">
            {pending.title && (
              <h2 className="font-marquee text-xl text-foreground">{pending.title}</h2>
            )}
            <p className="mt-2 text-sm text-muted">{pending.message}</p>

            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => settle(false)}>
                {pending.cancelLabel ?? "Cancelar"}
              </Button>
              <Button
                variant={pending.danger ? "danger" : "primary"}
                size="sm"
                onClick={() => settle(true)}
              >
                {pending.confirmLabel ?? "Confirmar"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const confirm = useContext(ConfirmContext);
  if (!confirm) {
    throw new Error("useConfirm must be used within a ConfirmProvider");
  }
  return confirm;
}
