import axios from "axios";

const RENDER_API_URL = "https://elevanceskill-project.onrender.com/api";

const isVercelHost =
    typeof window !== "undefined" &&
    window.location?.hostname?.endsWith(".vercel.app");

const API_BASE_URL =
    import.meta.env.VITE_API_URL || (isVercelHost ? "/api" : RENDER_API_URL);

const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
    headers: {
        "Content-Type": "application/json",
    },
});

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("zingbite_token");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalConfig = error.config;
        if (
            originalConfig &&
            !originalConfig._retriedWithRender &&
            (!error.response || error.response.status === 404) &&
            originalConfig.baseURL === "/api"
        ) {
            originalConfig._retriedWithRender = true;
            originalConfig.baseURL = RENDER_API_URL;
            return api.request(originalConfig);
        }
        return Promise.reject(error);
    }
);

export default api;

