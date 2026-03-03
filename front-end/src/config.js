export const API_BASE = process.env.REACT_APP_API_BASE || "https://connecttr.onrender.com";

if (!process.env.REACT_APP_API_BASE) {
  console.warn("REACT_APP_API_BASE is not defined in env. Defaulting to production: https://connecttr.onrender.com");
}

export const API_BASE_URL = API_BASE;
export const API = API_BASE;

