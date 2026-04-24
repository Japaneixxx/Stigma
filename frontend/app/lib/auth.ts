const KEY = "stigma_token";

export function setToken(token: string) {
  if (typeof window !== "undefined") localStorage.setItem(KEY, token);
}

export function getToken() {
  if (typeof window !== "undefined") return localStorage.getItem(KEY);
  return null;
}

export function removeToken() {
  if (typeof window !== "undefined") localStorage.removeItem(KEY);
}

export function isAuthenticated() {
  return !!getToken();
}
