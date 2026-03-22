const API_URL = import.meta.env.VITE_API_URL || "";

export const buildApiUrl = (path) => `${API_URL}${path}`;

export const buildAssetUrl = (path) => {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${API_URL}${path}`;
};

export const readApiError = async (response, fallbackMessage = "Erreur API") => {
  const data = await response.json().catch(() => ({}));
  return data.details || data.error || data.message || fallbackMessage;
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
