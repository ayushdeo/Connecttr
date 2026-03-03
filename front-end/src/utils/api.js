import { API_BASE_URL } from '../config';

// Simple fetch wrapper that mimics basic axios behavior
const api = {
    get: async (endpoint) => {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            credentials: 'include',
        });

        if (!response.ok) {
            const error = new Error('HTTP error');
            error.response = { status: response.status, data: await response.json().catch(() => ({})) };
            throw error;
        }
        return { data: await response.json() };
    },

    post: async (endpoint, payload) => {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: payload ? JSON.stringify(payload) : undefined,
        });

        if (!response.ok) {
            const error = new Error('HTTP error');
            error.response = { status: response.status, data: await response.json().catch(() => ({})) };
            throw error;
        }
        return { data: await response.json() };
    },

    delete: async (endpoint) => {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'DELETE',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            credentials: 'include',
        });

        if (!response.ok) {
            const error = new Error('HTTP error');
            error.response = { status: response.status, data: await response.json().catch(() => ({})) };
            throw error;
        }
        return { data: await response.json() };
    },

    patch: async (endpoint, payload) => {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'PATCH',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: payload ? JSON.stringify(payload) : undefined,
        });

        if (!response.ok) {
            const error = new Error('HTTP error');
            error.response = { status: response.status, data: await response.json().catch(() => ({})) };
            throw error;
        }
        return { data: await response.json() };
    }
};

export default api;
