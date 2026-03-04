const API_URL = import.meta.env.VITE_API_URL || "";

export const buildApiUrl = (path) => `${API_URL}${path}`;

export const buildAssetUrl = (path) => {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${API_URL}${path}`;
};
