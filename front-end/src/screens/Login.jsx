import React, { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { BRAND } from '../brand';
import { API_BASE_URL } from '../config';

const Login = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [error, setError] = React.useState('');

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        if (params.get('error')) {
            setError("Login failed. Please try again.");
        }
    }, [location]);

    useEffect(() => {
        if (user) {
            navigate('/');
        }
    }, [user, navigate]);

    const handleLogin = () => {
        // Redirect to backend auth endpoint
        window.location.href = `${API_BASE_URL}/auth/login/google`;
    };

    return (
        <div className="min-h-screen bg-midnight-plum flex items-center justify-center font-sans relative overflow-hidden">
            {/* Background Blobs */}
            <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-royal-amethyst rounded-full blur-[120px] opacity-20 pointer-events-none"></div>
            <div className="fixed bottom-[10%] right-[-5%] w-[30%] h-[40%] bg-midnight-plum rounded-full blur-[100px] opacity-30 pointer-events-none"></div>

            <div className="z-10 bg-glass-panel backdrop-blur-xl border border-glass-border p-8 rounded-2xl shadow-2xl w-full max-w-md text-center">
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-lilac-mist to-white mb-2">
                    {BRAND}
                </h1>
                <p className="text-mist mb-8">Sign in to continue</p>

                {error && <p className="text-red-400 mb-4">{error}</p>}

                <div className="flex justify-center">
                    <button
                        onClick={handleLogin}
                        className="flex items-center gap-3 bg-white text-ink font-semibold px-6 py-3 rounded-full hover:bg-gray-100 transition-colors shadow-lg"
                    >
                        <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
                        Sign in with Google
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Login;
