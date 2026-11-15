import { jsx as _jsx } from "react/jsx-runtime";
import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";
import "./styles.css";
const queryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: 20000, retry: 1, refetchOnWindowFocus: false } }
});
ReactDOM.createRoot(document.getElementById("root")).render(_jsx(React.StrictMode, { children: _jsx(QueryClientProvider, { client: queryClient, children: _jsx(BrowserRouter, { children: _jsx(ErrorBoundary, { children: _jsx(AuthProvider, { children: _jsx(App, {}) }) }) }) }) }));
