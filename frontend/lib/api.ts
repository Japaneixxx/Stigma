import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8083",
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("stigma_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (typeof window !== "undefined" && error.response?.status === 401) {
      localStorage.removeItem("stigma_token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;