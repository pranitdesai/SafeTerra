'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  AlertCircle,
  Building2,
  Landmark,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  CheckCircle2,
  MapPin,
  Shield
} from 'lucide-react';
import { fetchApi, setAuthToken } from '../../lib/api';

type PortalRole = 'ADMIN' | 'DISTRICT';

export default function LoginPage() {
  const [role, setRole] = useState<PortalRole>('ADMIN');
  const [email, setEmail] = useState('admin@kavach.gov.in');
  const [password, setPassword] = useState('KavachAdmin@2026');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Switch role tabs and optionally set demo credentials for smooth evaluation
  const handleRoleChange = (newRole: PortalRole) => {
    setRole(newRole);
    setError('');
    if (newRole === 'ADMIN') {
      setEmail('admin@kavach.gov.in');
      setPassword('KavachAdmin@2026');
    } else {
      setEmail('ddmo.dehradun@kavach.gov.in');
      setPassword('KavachDDMO@2026');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await fetchApi<{ access_token: string; user?: any }>('/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      setAuthToken(data.access_token);
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f7fa] flex flex-col justify-between text-[#172b3a] font-sans selection:bg-blue-200">
      {/* Top Tricolor Strip */}
      <div
        className="w-full h-1.5"
        style={{
          background: 'linear-gradient(90deg, #FF9933 0%, #FF9933 33.33%, #FFFFFF 33.33%, #FFFFFF 66.66%, #138808 66.66%, #138808 100%)'
        }}
      />

      {/* Top Government Strip */}
      <div className="bg-white border-b border-gray-200 py-2 px-4 md:px-8 text-xs text-gray-600 flex justify-between items-center shadow-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-800">भारत सरकार</span>
          <span className="text-gray-300">|</span>
          <span>Government of India</span>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-gray-500 text-[11px]">
          <span>गृह मंत्रालय</span>
          <span>•</span>
          <span>Ministry of Home Affairs (MHA)</span>
          <span>•</span>
          <span className="font-medium text-blue-900">NDRF & DM Division</span>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 flex items-center justify-center px-4 py-8 md:py-12">
        <div className="w-full max-w-xl bg-white rounded-xl shadow-lg border border-gray-200/90 overflow-hidden">

          {/* Header Section with Official Government Emblem & Name */}
          <div className="p-6 md:p-8 bg-gradient-to-b from-[#f8fafc] to-white border-b border-gray-100 flex flex-col items-center text-center">
            <div className="relative mb-3 flex items-center justify-center">
              {/* Official NDMA Logo */}
              <img
                src="/logo/ndma-logo.png"
                alt="National Disaster Management Authority Logo"
                className="h-20 w-auto object-contain drop-shadow-sm transition-transform hover:scale-105"
                onError={(e) => {
                  // Fallback in case image is missing
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>

            {/* Official Government Hierarchy Names */}
            <div className="space-y-0.5">
              <h2 className="text-base md:text-lg font-bold text-gray-900 tracking-tight">
                राष्ट्रीय आपदा प्रबंधन प्राधिकरण
              </h2>
              <h1 className="text-sm md:text-base font-semibold text-gray-800">
                National Disaster Management Authority
              </h1>
              <p className="text-xs text-gray-500 font-medium">
                गृह मंत्रालय, भारत सरकार | Ministry of Home Affairs, Govt. of India
              </p>
            </div>

            {/* Platform Brand Pill */}
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-200 rounded-full">
              <ShieldCheck className="w-4 h-4 text-blue-800" />
              <span className="text-xs font-bold text-blue-900 tracking-wider">
                KAVACH — DECISION SUPPORT SYSTEM
              </span>
            </div>
          </div>

          <div className="p-6 md:p-8">
            {/* Separate Option for District and Admin */}
            <div className="mb-6">
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2.5 text-center">
                Select Login Level / Role
              </label>
              <div className="grid grid-cols-2 gap-3 p-1 bg-gray-100/90 rounded-lg border border-gray-200">
                {/* Admin Tab Option */}
                <button
                  type="button"
                  onClick={() => handleRoleChange('ADMIN')}
                  className={`flex flex-col items-center justify-center py-2.5 px-3 rounded-md text-xs font-semibold transition-all ${role === 'ADMIN'
                    ? 'bg-blue-800 text-white shadow-sm ring-1 ring-blue-900'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60'
                    }`}
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Landmark className="w-4 h-4" />
                    <span className="text-sm">National / Admin</span>
                  </div>
                  <span className={`text-[10px] font-normal ${role === 'ADMIN' ? 'text-blue-200' : 'text-gray-500'}`}>
                    NDMA HQ & Central Command
                  </span>
                </button>

                {/* District Tab Option */}
                <button
                  type="button"
                  onClick={() => handleRoleChange('DISTRICT')}
                  className={`flex flex-col items-center justify-center py-2.5 px-3 rounded-md text-xs font-semibold transition-all ${role === 'DISTRICT'
                    ? 'bg-blue-800 text-white shadow-sm ring-1 ring-blue-900'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60'
                    }`}
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Building2 className="w-4 h-4" />
                    <span className="text-sm">District Portal</span>
                  </div>
                  <span className={`text-[10px] font-normal ${role === 'DISTRICT' ? 'text-blue-200' : 'text-gray-500'}`}>
                    DDMO & District DEOC
                  </span>
                </button>
              </div>
            </div>

            {/* Context Badge for Selected Role */}
            <div className={`mb-5 p-3 rounded-lg border text-xs flex items-start gap-2.5 ${role === 'ADMIN'
              ? 'bg-amber-50/70 border-amber-200 text-amber-900'
              : 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
              }`}>
              {role === 'ADMIN' ? (
                <>
                  <Shield className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">National Administrative Console:</span> Full authority over national hazard modeling, inter-state NDRF battalion mobilization, and national warning dissemination.
                  </div>
                </>
              ) : (
                <>
                  <MapPin className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">District Emergency Operations Centre (DEOC):</span> Local jurisdiction monitoring for Dehradun District, block-level evacuation SOPs, and field rescue resources.
                  </div>
                </>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-5 p-3.5 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-800 animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Access Denied:</span> {error}
                </div>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  {role === 'ADMIN' ? 'National Administrator Email / Gov ID' : 'District Officer (DDMO) Email / Gov ID'}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Mail size={16} />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-gray-900 transition-all placeholder:text-gray-400"
                    placeholder={role === 'ADMIN' ? 'admin@kavach.gov.in' : 'ddmo.dehradun@kavach.gov.in'}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-gray-700">
                    Secure Password
                  </label>
                  <span className="text-[11px] text-gray-400">Case-sensitive</span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Lock size={16} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-gray-900 transition-all"
                    placeholder="••••••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Quick Fill Preset Helper */}
              <div className="pt-1 flex items-center justify-between text-xs">
                <span className="text-gray-500 text-[11px]">Demo Preset Credentials:</span>
                <button
                  type="button"
                  onClick={() => {
                    if (role === 'ADMIN') {
                      setEmail('admin@kavach.gov.in');
                      setPassword('KavachAdmin@2026');
                    } else {
                      setEmail('ddmo.dehradun@kavach.gov.in');
                      setPassword('KavachDDMO@2026');
                    }
                  }}
                  className="text-blue-700 hover:text-blue-900 font-medium hover:underline inline-flex items-center gap-1 text-[11px]"
                >
                  <CheckCircle2 size={12} className="text-blue-600" />
                  Reset to default {role === 'ADMIN' ? 'Admin' : 'District'} credentials
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-2.5 px-4 bg-[#1c5d8c] hover:bg-[#14476c] text-white font-semibold rounded-lg shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Verifying Official Credentials...</span>
                  </>
                ) : (
                  <>
                    <span>Login to {role === 'ADMIN' ? 'National Admin Portal' : 'District Portal'}</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            {/* Statutory Legal Disclaimer */}
            <div className="mt-6 pt-4 border-t border-gray-100 text-[11px] text-gray-500 leading-relaxed text-center">
              <p>
                <span className="font-semibold text-gray-600">Official Government System:</span> Access is strictly restricted to authorized personnel of NDMA, NDRF, SDMA, and District Administrations. All login attempts are recorded in real-time audit logs under Section 43/66 of the Information Technology Act.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Footer */}
      <footer className="bg-white border-t border-gray-200 py-4 px-4 text-center text-xs text-gray-500">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            राष्ट्रीय आपदा प्रबंधन प्राधिकरण (NDMA) • गृह मंत्रालय, भारत सरकार
          </div>
          <div className="text-[11px] text-gray-400">
            Kavach Integrated Disaster Decision Support System • Smart India Hackathon
          </div>
        </div>
      </footer>
    </div>
  );
}
