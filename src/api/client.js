import axios from "axios";
import { mockAdapter } from "./mock";
const useMock = import.meta.env.VITE_USE_MOCK_API !== "false";
export const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api",
    withCredentials: true,
    headers: { "Content-Type": "application/json" }
});
if (useMock)
    api.defaults.adapter = mockAdapter;
api.interceptors.request.use((config) => {
    // Mutations supply an intent-scoped key explicitly. Do not auto-generate one here:
    // retries of the same intent must reuse the original key.
    return config;
});
api.interceptors.response.use(response => response, (error) => {
    if (error.response?.status === 401) {
        window.dispatchEvent(new CustomEvent("sap:unauthenticated"));
    }
    return Promise.reject(error);
});
export const isMockMode = useMock;
