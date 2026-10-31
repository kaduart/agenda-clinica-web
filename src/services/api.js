
import axios from 'axios';
import { getToken, clearSession } from '../auth/session';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
    timeout: 30000, // Aumentado para 30s pois sync-update pode demorar
    headers: {
        'Content-Type': 'application/json',
    },
});

// Interceptor para adicionar o token de autenticação
api.interceptors.request.use(
    (config) => {
        // Token de quem entrou na agenda (conta do ERP). O token fixo saiu do código.
        const token = getToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        config.headers['X-Client'] = 'agenda-externa';
        console.log(`[API Request] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`, { params: config.params });
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Interceptor para logar respostas
api.interceptors.response.use(
    (response) => {
        console.log(`[API Response] ${response.config.method?.toUpperCase()} ${response.config.url} → ${response.status}`, {
            dataType: typeof response.data,
            isArray: Array.isArray(response.data),
            length: Array.isArray(response.data) ? response.data.length : (response.data ? 1 : 0),
            sample: Array.isArray(response.data) ? response.data.slice(0, 2).map(i => ({ id: i.id, date: i.date })) : null
        });
        return response;
    },
    (error) => {
        console.error('API Error:', error.response || error.message);
        return Promise.reject(error);
    }
);

// Sessão expirada ou inválida: volta para a tela de login.
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error?.response?.status === 401) clearSession('expired');
        return Promise.reject(error);
    }
);

export default api;
