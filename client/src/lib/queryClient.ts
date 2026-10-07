import { QueryClient } from "@tanstack/react-query";
const PORT = "__PORT_5000__";
const API_BASE = PORT.startsWith("__") ? "" : PORT;
let token = "";
export const setAdminToken = (value: string) => { token = value; };
export const apiUrl = (url: string) => `${API_BASE}${url}`;
export async function apiRequest(method: string, url: string, data?: unknown) {
  const res = await fetch(apiUrl(url), {
    method,
    headers: { ...(data !== undefined ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: data !== undefined ? JSON.stringify(data) : undefined,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || "Die Verbindung hat nicht geklappt. Bitte versuche es erneut.");
  }
  return res;
}
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { queryFn: async ({ queryKey }) => (await apiRequest("GET", queryKey.join("/"))).json(), staleTime: 5000, retry: 1 },
    mutations: { retry: false },
  },
});
