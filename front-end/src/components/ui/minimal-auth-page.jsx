import React, { useEffect, useState } from 'react';
import { API_BASE_URL } from '../../config';
import { BRAND } from '../../brand';

export function MinimalAuthPage() {
  const [error, setError] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get('error');
    if (err === 'invite_only') setError("Access is invite-only. Ask an admin to invite you.");
    else if (err === 'oauth_failed') setError("Login failed. Please try again.");
  }, []);

  const handleGoogleLogin = () => {
    window.location.href = `${API_BASE_URL}/auth/login/google`;
  };

  return (
    <div className="min-h-screen bg-ink flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-[-15%] left-[-10%] w-[50%] h-[50%] bg-royal-amethyst rounded-full blur-[140px] opacity-[0.15] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-midnight-plum rounded-full blur-[120px] opacity-20 pointer-events-none" />

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-royal-amethyst/20 border border-royal-amethyst/30 mb-4 shadow-glow-sm">
            <img src="/clogo.png" alt={BRAND} className="w-10 h-10 object-contain" onError={e => { e.target.style.display='none'; }} />
          </div>
          <h1 className="text-3xl font-bold text-mist tracking-tight">{BRAND}</h1>
          <p className="mt-2 text-soft-violet text-sm">From Intent to Inbox.</p>
        </div>

        {/* Card */}
        <div className="bg-slate/80 backdrop-blur-xl border border-overlay/10 rounded-2xl p-8 shadow-2xl">
          <div className="mb-6 text-center">
            <h2 className="text-lg font-semibold text-mist">Welcome back</h2>
            <p className="text-soft-violet text-sm mt-1">Sign in to your workspace</p>
          </div>

          {error && (
            <div className="mb-5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl
              bg-overlay/5 border border-overlay/15 text-mist text-sm font-medium
              hover:bg-overlay/10 hover:border-royal-amethyst/40 hover:shadow-glow-sm
              transition-all duration-200 active:scale-[0.98] group"
          >
            <svg className="h-5 w-5 flex-shrink-0" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            <span className="group-hover:text-white transition-colors">Continue with Google</span>
          </button>

          <p className="mt-6 text-center text-xs text-soft-violet/60">
            By continuing you agree to our{" "}
            <span className="text-royal-amethyst hover:underline cursor-pointer">Terms of Service</span>
            {" "}and{" "}
            <span className="text-royal-amethyst hover:underline cursor-pointer">Privacy Policy</span>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-soft-violet/40">
          Access is invite-only. Contact your admin to get started.
        </p>
      </div>
    </div>
  );
}
