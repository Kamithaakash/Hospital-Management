import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { Lock, Mail, AlertCircle, ArrowRight } from 'lucide-react';
import { RoleBadge } from '../components/RoleBadge.js';

export const Login: React.FC = () => {
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('Hemas@123');
  const [error, setError] = useState<string | null>(null);

  const staffProfiles = [
    {
      role: 'HOUSEKEEPING_SUPERVISOR',
      name: 'Priyani Fernando',
      email: 'supervisor@hemas.lk',
      dept: 'Housekeeping Services',
    },
    {
      role: 'MANAGER',
      name: 'Dr. Anura Perera',
      email: 'manager@hemas.lk',
      dept: 'Operations & Administration',
    },
    {
      role: 'STORES_STAFF',
      name: 'Kamal Jayawardena',
      email: 'stores@hemas.lk',
      dept: 'Central Stores',
    },
    {
      role: 'PROCUREMENT_STAFF',
      name: 'Dilshan Silva',
      email: 'procurement@hemas.lk',
      dept: 'Procurement & Supplies',
    },
    {
      role: 'ADMIN',
      name: 'System Admin',
      email: 'admin@hemas.lk',
      dept: 'Hospital Information Systems',
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your email and password.');
    }
  };

  const handleSelectStaff = (accEmail: string) => {
    setEmail(accEmail);
    setPassword('Hemas@123');
    setError(null);
  };

  return (
    <div className="min-h-screen relative flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8">
      {/* Background with Responsive Positioning */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <img
          src="/images/hemas-bg.png"
          alt="Hemas Background"
          className="w-full h-full object-cover object-right sm:object-center select-none"
        />
        {/* Balanced backdrop layer so the artwork is visible while card glass pops */}
        <div className="absolute inset-0 bg-slate-950/30 backdrop-blur-[1px]" />
      </div>

      {/* Header Logo */}
      <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-md text-center mb-4">
        <div className="flex justify-center mb-2">
          <img
            src="/images/hemas-logo.png"
            alt="Hemas Hospitals"
            className="h-20 sm:h-24 w-auto object-contain select-none drop-shadow-lg"
          />
        </div>
        <p className="text-xs sm:text-sm font-medium text-white/90 drop-shadow-sm">
          Smart Housekeeping Supply Management • Thalawathugoda
        </p>
      </div>

      {/* Glassmorphism Card */}
      <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="relative rounded-3xl p-6 sm:p-8 bg-white/20 sm:bg-white/25 backdrop-blur-2xl border border-white/40 shadow-[0_16px_48px_0_rgba(0,0,0,0.3)] ring-1 ring-white/30 overflow-hidden">
          {/* Glass specular top highlight */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent pointer-events-none" />

          <h2 className="text-xl font-bold text-slate-900 tracking-tight drop-shadow-2xs">
            Staff Sign In
          </h2>
          <p className="text-xs text-slate-700/90 font-medium mt-0.5 mb-5 drop-shadow-2xs">
            Enter your hospital email address and password to continue.
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/20 backdrop-blur-md border border-rose-300/40 flex items-start gap-2.5 text-rose-950 text-xs font-medium">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-700" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-900 tracking-wide mb-1.5 drop-shadow-2xs">
                Hospital Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@hemas.lk"
                  className="block w-full pl-10 pr-3.5 py-2.5 text-sm bg-white/70 hover:bg-white/80 focus:bg-white/95 backdrop-blur-md border border-white/60 focus:border-sky-500 rounded-xl focus:ring-2 focus:ring-sky-500/30 text-slate-900 placeholder:text-slate-500 shadow-inner transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-900 tracking-wide mb-1.5 drop-shadow-2xs">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-3.5 py-2.5 text-sm bg-white/70 hover:bg-white/80 focus:bg-white/95 backdrop-blur-md border border-white/60 focus:border-sky-500 rounded-xl focus:ring-2 focus:ring-sky-500/30 text-slate-900 placeholder:text-slate-500 shadow-inner transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-sky-700 via-sky-600 to-teal-600 hover:from-sky-600 hover:to-teal-500 text-white font-semibold text-sm shadow-lg shadow-sky-900/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.99]"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Frosted Glass Staff Selector */}
          <div className="mt-6 pt-5 border-t border-white/40">
            <span className="text-xs font-bold text-slate-900 block mb-2.5 drop-shadow-2xs">
              Select Staff Account:
            </span>
            <div className="space-y-1.5">
              {staffProfiles.map((p) => {
                const isSelected = email === p.email;
                return (
                  <button
                    key={p.email}
                    type="button"
                    onClick={() => handleSelectStaff(p.email)}
                    className={`w-full text-left px-3 py-2 rounded-xl border text-xs flex items-center justify-between transition-all backdrop-blur-sm ${
                      isSelected
                        ? 'bg-white/90 border-sky-500 shadow-sm text-slate-900 ring-2 ring-sky-500/30'
                        : 'bg-white/40 hover:bg-white/60 border-white/40 hover:border-white/70 text-slate-800'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-slate-900">{p.name}</div>
                      <div className="text-[11px] text-slate-600">{p.email}</div>
                    </div>
                    <RoleBadge role={p.role} size="sm" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-white/90 drop-shadow-md">
          Hemas Hospital Thalawathugoda • Internal Operations System
        </p>
      </div>
    </div>
  );
};
