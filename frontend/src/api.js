import axios from "axios";

// In development the Vite proxy handles "/api" -> localhost:4000, so we keep
// requests relative. In production there is no proxy, so we point at the
// deployed backend directly. Override with VITE_API_URL when needed.
const configured = import.meta.env.VITE_API_URL;
const productionFallback = import.meta.env.PROD
    ? "https://website-checker-for-teens.onrender.com"
    : "";

export const baseURL = (configured || productionFallback).replace(/\/+$/, "");

const api = axios.create({
    baseURL,
    timeout: 30000,
});

export default api;
