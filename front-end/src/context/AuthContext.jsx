import React, { createContext, useContext, useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';

const AuthContext = createContext();

export const useAuth = () => {
    return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const checkUser = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/auth/me`, {
                headers: { 'Accept': 'application/json' },
                credentials: 'include', // Important for cookies
            });
            if (res.ok) {
                const userData = await res.json();
                setUser(userData);
            } else {
                setUser(null);
            }
        } catch (e) {
            console.error("Session check failed", e);
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    // Initial check
    useEffect(() => {
        checkUser();
    }, []);

    const login = async (backendResponse) => {
        // backendResponse might contain user info, or we just re-fetch
        if (backendResponse && backendResponse.user) {
            setUser(backendResponse.user);
        } else {
            await checkUser();
        }
    };

    const logout = async () => {
        try {
            await fetch(`${API_BASE_URL}/auth/logout`, {
                method: "POST",
                credentials: 'include'
            });
        } catch (e) {
            console.error("Logout failed", e);
        }
        setUser(null);
    };

    // Helper to get headers for API calls (Modified for Cookies: No headers needed typically)
    // But we might want to ensure 'credentials: include' is used.
    // Consumers should manually addcredentials: 'include'. 
    // We can provide a wrapper if we want, but for now let's just expose user.

    return (
        <AuthContext.Provider value={{ user, login, logout, checkUser, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
