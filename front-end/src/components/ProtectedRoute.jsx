import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, roles }) => {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return <div className="min-h-screen bg-midnight-plum flex items-center justify-center text-mist">Loading...</div>;
    }

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Safety check for Org ID (Multi-tenant isolation)
    // Supports both nested {user: {...}} and flat {...} structures for robustness
    const actualUser = user.user || user;
    if (!actualUser.org_id) {
        return <Navigate to="/forbidden" replace />;
    }

    if (roles && !roles.includes(actualUser.role)) {
        return <Navigate to="/forbidden" replace />;
    }

    return children;
};

export default ProtectedRoute;
