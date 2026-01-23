import React, { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { MinimalAuthPage } from '../components/ui/minimal-auth-page';

const Login = () => {
    const { user, loading } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!loading && user) {
            navigate('/');
        }
    }, [user, loading, navigate]);

    if (loading) return null; // Or spinner

    return <MinimalAuthPage />;
};

export default Login;
