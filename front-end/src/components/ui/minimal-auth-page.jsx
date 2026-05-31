import React, { useEffect, useState } from 'react';
import { API_BASE_URL } from '../../config';
import { BRAND } from '../../brand';
import { CheckCircle, Zap, Target, Mail } from 'lucide-react';

const FEATURES = [
  { icon: <Target size={15} />, text: "AI-powered lead discovery from 50+ signals" },
  { icon: <Zap size={15} />,    text: "Automated contact enrichment & email finding" },
  { icon: <Mail size={15} />,   text: "Personalised outreach at scale, zero manual work" },
  { icon: <CheckCircle size={15} />, text: "Analytics that show what's actually working" },
];

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
    <div className="min-h-screen flex dark" style={{ background: '#0F0A19' }}>

      {/* ── Left panel — brand / value prop ─────────────────────────────── */}
      <div className="hidden lg:flex flex-col justify-between w-[52%] relative overflow-hidden px-16 py-14"
           style={{ background: 'linear-gradient(135deg, #1a0d2e 0%, #2e1a47 50%, #1a0d2e 100%)' }}>

        {/* Mesh blobs */}
        <div className="absolute top-[-20%] left-[-15%] w-[65%] h-[65%] rounded-full blur-[120px] pointer-events-none"
             style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.35) 0%, transparent 70%)' }} />
        <div className="absolute bottom-[-15%] right-[-10%] w-[55%] h-[55%] rounded-full blur-[100px] pointer-events-none"
             style={{ background: 'radial-gradient(circle, rgba(79,28,165,0.30) 0%, transparent 70%)' }} />
        <div className="absolute top-[40%] right-[5%] w-[35%] h-[35%] rounded-full blur-[80px] pointer-events-none"
             style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.18) 0%, transparent 70%)' }} />

        {/* Top — wordmark */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center border"
               style={{ background: 'rgba(124,58,237,0.2)', borderColor: 'rgba(124,58,237,0.35)' }}>
            <img src="/clogo.png" alt={BRAND} className="w-5 h-5 object-contain"
                 onError={e => { e.target.style.display = 'none'; }} />
          </div>
          <span className="text-white font-bold text-lg tracking-tight">{BRAND}</span>
        </div>

        {/* Middle — headline */}
        <div className="relative z-10">
          <p className="text-xs font-semibold tracking-widest uppercase mb-5"
             style={{ color: 'rgba(196,181,218,0.7)' }}>
            The B2B Growth Platform
          </p>
          <h1 className="text-4xl xl:text-5xl font-bold leading-[1.15] text-white mb-6">
            Turn intent into{' '}
            <span style={{
              background: 'linear-gradient(135deg, #a78bfa, #7c3aed)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              closed deals.
            </span>
          </h1>
          <p className="text-base leading-relaxed mb-10" style={{ color: 'rgba(196,181,218,0.75)' }}>
            Connecttr finds high-intent prospects, enriches their contact data, and sends
            personalised outreach — all before your competitors know they exist.
          </p>

          <ul className="space-y-3">
            {FEATURES.map((f, i) => (
              <li key={i} className="flex items-center gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ background: 'rgba(124,58,237,0.25)', color: '#a78bfa' }}>
                  {f.icon}
                </span>
                <span className="text-sm" style={{ color: 'rgba(220,210,235,0.85)' }}>{f.text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Bottom — social proof */}
        <div className="relative z-10">
          <div className="rounded-2xl p-5 border"
               style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}>
            <p className="text-sm italic leading-relaxed mb-4"
               style={{ color: 'rgba(220,210,235,0.80)' }}>
              "Companies that invest in intelligent lead nurturing generate 50% more sales-ready
              leads at 33% lower cost."
            </p>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#7c3aed' }} />
              <p className="text-xs font-medium" style={{ color: 'rgba(167,139,250,0.9)' }}>
                Forrester Research
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right panel — sign in ────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative">

        {/* Subtle right-side glow */}
        <div className="absolute top-0 right-0 w-[60%] h-[40%] pointer-events-none blur-[100px]"
             style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.10) 0%, transparent 70%)' }} />

        <div className="relative z-10 w-full max-w-[400px]">

          {/* Mobile wordmark */}
          <div className="lg:hidden flex items-center gap-3 mb-10 justify-center">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center border"
                 style={{ background: 'rgba(124,58,237,0.2)', borderColor: 'rgba(124,58,237,0.35)' }}>
              <img src="/clogo.png" alt={BRAND} className="w-5 h-5 object-contain"
                   onError={e => { e.target.style.display = 'none'; }} />
            </div>
            <span className="text-white font-bold text-lg tracking-tight">{BRAND}</span>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Sign in to your workspace</h2>
            <p className="text-sm" style={{ color: 'rgba(163,119,157,0.85)' }}>
              Access is invite-only. Contact your admin to get started.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 px-4 py-3 rounded-xl text-sm border"
                 style={{ background: 'rgba(239,68,68,0.10)', borderColor: 'rgba(239,68,68,0.25)', color: '#f87171' }}>
              {error}
            </div>
          )}

          {/* Google button */}
          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 px-4 py-3.5 rounded-xl
                       text-sm font-medium text-white transition-all duration-200
                       active:scale-[0.98] group"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(124,58,237,0.15)';
              e.currentTarget.style.borderColor = 'rgba(124,58,237,0.50)';
              e.currentTarget.style.boxShadow = '0 0 20px rgba(124,58,237,0.20)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <svg className="h-5 w-5 flex-shrink-0" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
            <span className="text-xs" style={{ color: 'rgba(163,119,157,0.6)' }}>
              Single sign-on only
            </span>
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
          </div>

          {/* Info card */}
          <div className="rounded-xl p-4 border"
               style={{ background: 'rgba(124,58,237,0.07)', borderColor: 'rgba(124,58,237,0.20)' }}>
            <p className="text-xs leading-relaxed" style={{ color: 'rgba(196,181,218,0.75)' }}>
              <span className="font-semibold" style={{ color: 'rgba(167,139,250,0.95)' }}>
                New here?
              </span>{' '}
              Connecttr is currently in closed beta. Visit{' '}
              <a href="/" className="underline underline-offset-2 hover:opacity-100 transition-opacity"
                 style={{ color: '#a78bfa', opacity: 0.85 }}>
                our website
              </a>{' '}
              to learn more or request access.
            </p>
          </div>

          {/* Footer */}
          <p className="mt-8 text-center text-xs" style={{ color: 'rgba(163,119,157,0.45)' }}>
            By continuing you agree to our{' '}
            <span className="underline cursor-pointer hover:opacity-80 transition-opacity"
                  style={{ color: 'rgba(167,139,250,0.75)' }}>
              Terms
            </span>{' '}
            and{' '}
            <span className="underline cursor-pointer hover:opacity-80 transition-opacity"
                  style={{ color: 'rgba(167,139,250,0.75)' }}>
              Privacy Policy
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
