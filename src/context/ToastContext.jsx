import { createContext, useContext, useMemo, useRef, useState } from "react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextIdRef = useRef(1);

  const dismissToast = (id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const pushToast = ({ type = "info", message, duration = 3200, actionLabel = "", onAction = null }) => {
    if (!message) return;

    const id = nextIdRef.current++;
    setToasts((prev) => [...prev, { id, type, message, actionLabel, onAction }]);

    window.setTimeout(() => {
      dismissToast(id);
    }, duration);
  };

  const value = useMemo(
    () => ({
      toast: pushToast,
      success: (message, options = {}) => pushToast({ ...options, type: "success", message }),
      error: (message, options = {}) => pushToast({ ...options, type: "error", message, duration: options.duration ?? 4200 }),
      info: (message, options = {}) => pushToast({ ...options, type: "info", message }),
    }),
    []
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast ${toast.type}`}>
            <div className="toast-message">{toast.message}</div>
            <div className="toast-actions">
              {toast.actionLabel && typeof toast.onAction === "function" ? (
                <button
                  className="toast-action"
                  type="button"
                  onClick={() => {
                    toast.onAction();
                    dismissToast(toast.id);
                  }}
                >
                  {toast.actionLabel}
                </button>
              ) : null}
              <button className="toast-close" type="button" onClick={() => dismissToast(toast.id)}>
                Fermer
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }

  return context;
};
