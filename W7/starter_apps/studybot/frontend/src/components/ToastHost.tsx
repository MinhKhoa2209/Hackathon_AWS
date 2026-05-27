import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { Toast } from "../toast";

type Props = {
  toasts: Toast[];
};

const iconByType = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

const colorByType = {
  success: { accent: "#10b981", bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.25)" },
  error:   { accent: "#ef4444", bg: "rgba(239,68,68,0.1)",  border: "rgba(239,68,68,0.25)" },
  info:    { accent: "#7c3aed", bg: "rgba(124,58,237,0.1)", border: "rgba(124,58,237,0.25)" },
};

const TOAST_DURATION = 3200;

export function ToastHost({ toasts }: Props) {
  return (
    <div
      className="fixed bottom-5 right-4 z-50 flex flex-col gap-2"
      style={{ width: "min(360px, calc(100vw - 2rem))" }}
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}

function ToastItem({ toast }: { toast: Toast }) {
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(100);
  const Icon = iconByType[toast.type];
  const colors = colorByType[toast.type];

  useEffect(() => {
    // Trigger entry animation
    const frameId = requestAnimationFrame(() => setVisible(true));

    // Progress bar countdown
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 100 - (elapsed / TOAST_DURATION) * 100);
      setProgress(remaining);
      if (remaining === 0) clearInterval(interval);
    }, 50);

    return () => {
      cancelAnimationFrame(frameId);
      clearInterval(interval);
    };
  }, []);

  return (
    <div
      className="relative overflow-hidden rounded-xl border"
      style={{
        background: "var(--glass-bg)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderColor: colors.border,
        boxShadow: `0 8px 32px rgba(0,0,0,0.25), 0 0 0 1px ${colors.border}`,
        transform: visible ? "translateX(0)" : "translateX(110%)",
        opacity: visible ? 1 : 0,
        transition: "transform 0.35s cubic-bezier(0.16,1,0.3,1), opacity 0.35s ease",
      }}
    >
      {/* Content */}
      <div className="flex items-start gap-3 p-3.5">
        {/* Icon */}
        <span
          className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full"
          style={{ background: colors.bg, color: colors.accent }}
        >
          <Icon className="h-3.5 w-3.5" />
        </span>

        {/* Message */}
        <span className="flex-1 text-sm leading-6" style={{ color: "var(--text-primary)" }}>
          {toast.message}
        </span>
      </div>

      {/* Progress bar */}
      <div className="progress-track" style={{ height: "3px", borderRadius: "0", background: "transparent" }}>
        <div
          className="progress-fill"
          style={{
            width: `${progress}%`,
            height: "3px",
            borderRadius: "0",
            background: `linear-gradient(90deg, ${colors.accent}, ${colors.accent}88)`,
            transition: "width 50ms linear",
          }}
        />
      </div>
    </div>
  );
}
