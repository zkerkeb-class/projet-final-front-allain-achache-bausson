const fromEnv = String(import.meta.env.VITE_API_URL || "").trim();
const isBrowser = typeof window !== "undefined";
const host = isBrowser ? window.location.host : "";
const isViteDevHost = host.startsWith("localhost:5173") || host.startsWith("127.0.0.1:5173");
const fallbackApiUrl = isViteDevHost ? "" : "http://localhost:5000";
const API_URL = (fromEnv || fallbackApiUrl).replace(/\/+$/, "");

export const buildApiUrl = (path) => (API_URL ? `${API_URL}${path}` : path);

export const buildAssetUrl = (path) => {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return API_URL ? `${API_URL}${path}` : path;
};

export const readApiError = async (response, fallbackMessage = "Erreur API") => {
  const raw = await response.text().catch(() => "");
  let data = {};

  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    data = {};
  }

  const message = data.details || data.error || data.message;
  if (message) return message;

  const lowerRaw = String(raw || "").toLowerCase();
  if (
    lowerRaw.includes("econnrefused") ||
    lowerRaw.includes("proxy error") ||
    lowerRaw.includes("target is not responding")
  ) {
    return "Serveur injoignable. Vérifie que le back tourne sur http://localhost:5000.";
  }

  if (response.status >= 500) {
    return "Erreur serveur. Vérifie que le back tourne sur http://localhost:5000.";
  }

  return fallbackMessage;
};

export const apiFetch = async (path, options = {}) => {
  const token = localStorage.getItem("token");
  const headers = new Headers(options.headers || {});

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(buildApiUrl(path), {
    ...options,
    headers,
  });

  if (response.status === 401) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    if (window.location.hash !== "#/login") {
      window.location.hash = "#/login";
    }
    throw new Error("Session invalide, reconnecte-toi.");
  }

  return response;

};

