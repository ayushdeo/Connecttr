import React from "react";
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Shell from "./layout/Shell";
import Login from "./screens/Login";
import ProtectedRoute from "./components/ProtectedRoute";
import NotFoundPage from "./components/ui/not-found-page-2";
import { ForbiddenPage } from "./components/ui/forbidden-page";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/forbidden" element={<ForbiddenPage />} />

          {/* Shell Routes - Map all valid app sections to Shell */}
          {["/", "/dashboard", "/campaigns", "/email-hub", "/emailhub", "/analytics", "/settings", "/demo"].map((path) => (
            <Route
              key={path}
              path={path}
              element={
                <ProtectedRoute>
                  <Shell />
                </ProtectedRoute>
              }
            />
          ))}

          {/* 404 Catch-All */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
