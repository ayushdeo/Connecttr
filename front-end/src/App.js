import React from "react";
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Shell from "./layout/Shell";
import Login from "./screens/Login";
import LandingPage from "./screens/LandingPage";
import StaticPage from "./screens/StaticPage";
import ProtectedRoute from "./components/ProtectedRoute";
import NotFoundPage from "./components/ui/not-found-page-2";
import { ForbiddenPage } from "./components/ui/forbidden-page";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public marketing landing page */}
          <Route path="/" element={<LandingPage />} />

          {/* Public static pages */}
          <Route path="/features"  element={<StaticPage page="features" />} />
          <Route path="/pricing"   element={<StaticPage page="pricing" />} />
          <Route path="/changelog" element={<StaticPage page="changelog" />} />
          <Route path="/about"     element={<StaticPage page="about" />} />
          <Route path="/careers"   element={<StaticPage page="careers" />} />
          <Route path="/contact"   element={<StaticPage page="contact" />} />
          <Route path="/privacy"   element={<StaticPage page="privacy" />} />
          <Route path="/terms"     element={<StaticPage page="terms" />} />
          <Route path="/gdpr"      element={<StaticPage page="gdpr" />} />

          <Route path="/login" element={<Login />} />
          <Route path="/forbidden" element={<ForbiddenPage />} />

          {/* Shell Routes - Map all valid app sections to Shell */}
          {["/dashboard", "/campaigns", "/email-hub", "/emailhub", "/analytics", "/settings", "/demo"].map((path) => (
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

          {/* Explicitly Protected Org Settings Route */}
          <Route
            path="/settings/organization"
            element={
              <ProtectedRoute roles={["owner", "admin"]}>
                <Shell />
              </ProtectedRoute>
            }
          />

          {/* 404 Catch-All */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
