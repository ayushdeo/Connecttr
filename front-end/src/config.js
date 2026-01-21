export const API_BASE = process.env.REACT_APP_API_BASE;

if (!API_BASE) {
  console.warn("REACT_APP_API_BASE is not defined. API calls may fail.");
}

export const API_BASE_URL = API_BASE;
export const API = API_BASE;

