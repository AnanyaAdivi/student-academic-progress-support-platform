import axios from "axios";
import { mockAdapter } from "./mock";

const useMock = import.meta.env.VITE_USE_MOCK_API !== "false";

function getCsrfTokenFromCookie() {
    if (typeof document === "undefined") return null;
    for (const part of document.cookie.split(";")) {
        const eqIdx = part.indexOf("=");
        if (eqIdx === -1) continue;
        const name = part.slice(0, eqIdx).trim();
        const value = part.slice(eqIdx + 1).trim();
        if (/csrf|xsrf/i.test(name)) {
            return decodeURIComponent(value);
        }
    }
    return null;
}

export const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api",
    withCredentials: true,
    headers: { "Content-Type": "application/json" }
});

if (useMock) {
    api.defaults.adapter = mockAdapter;
}

api.interceptors.request.use((config) => {
    const method = (config.method || "get").toLowerCase();
    if (["post", "put", "patch", "delete"].includes(method)) {
        const csrfToken = getCsrfTokenFromCookie();
        if (csrfToken) {
            config.headers = config.headers || {};
            config.headers["x-csrf-token"] = csrfToken;
        }
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            window.dispatchEvent(new CustomEvent("sap:unauthenticated"));
        }
        return Promise.reject(error);
    }
);

export const isMockMode = useMock;
