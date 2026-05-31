import React, { createContext, useContext, useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const checkUser = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/auth/me`, {
                headers: { 'Accept': 'application/json' },
                credentials: 'include',
            });
            if (res.ok) {
                const userData = await res.json();
                const flattenedUser = userData.user ? userData.user : userData;
                setUser(flattenedUser);
            } else {
                setUser(null);
            }
        } catch (e) {
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { checkUser(); }, []);

    const login = async (backendResponse) => {
        if (backendResponse?.user) {
            setUser(backendResponse.user);
        } else {
            await checkUser();
        }
    };

    const logout = async () => {
        try {
            await fetch(`${API_BASE_URL}/auth/logout`, { method: "POST", credentials: 'include' });
        } catch (_) {}
        setUser(null);
    };

    // Render children immediately — public pages (landing, login) must not block on auth.
    // ProtectedRoute handles its own loading state for app routes.
    return (
        <AuthContext.Provider value={{ user, login, logout, checkUser, loading }}>
            {children}
        </AuthContext.Provider>
    );
};
