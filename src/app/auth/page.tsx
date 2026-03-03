'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { apexApi } from '@/lib/api';
import { useStore } from '@/store/useStore';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Lock, Mail, ArrowRight, UserPlus, LogIn, 
  ShieldCheck, AlertCircle, KeyRound, Timer, 
  ChevronLeft, TrendingUp
} from 'lucide-react';
import { AuthRequest, VerifyOtpRequest, ResetPasswordRequest } from '@/types';

type Step = 'LOGIN' | 'SIGNUP' | 'FORGOT_PASSWORD' | 'VERIFY_REG' | 'VERIFY_RESET';

export default function AuthPage() {
  const router = useRouter();
  const { setToken, token } = useStore();

  // --- STATE ---
  const [currentStep, setCurrentStep] = useState<Step>('LOGIN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [timer, setTimer] = useState(60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // --- REDIRECT ---
  useEffect(() => {
    if (token) router.push('/');
  }, [token, router]);

  // --- TIMER ---
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning && timer > 0) {
      interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
    } else if (timer === 0) {
      setIsTimerRunning(false);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timer]);

  // --- PASSWORD STRENGTH ---
  const passwordStrength = useMemo(() => {
    const val = (currentStep === 'SIGNUP' || currentStep === 'VERIFY_REG') ? password : newPassword;
    if (!val) return 0;
    let score = 0;
    if (val.length > 6) score++;
    if (/[A-Z]/.test(val)) score++;
    if (/[0-9]/.test(val)) score++;
    if (/[^A-Za-z0-9]/.test(val)) score++;
    return score;
  }, [password, newPassword, currentStep]);

  // --- CORE AUTH LOGIC ---
  const handleAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      switch (currentStep) {
        case 'LOGIN':
          const logRes = await apexApi.login({ email, password });
          if (logRes.data.token) {
            setToken(logRes.data.token, email);
            router.push('/');
          }
          break;

        case 'SIGNUP':
          await apexApi.register({ email, password });
          startOtpFlow('VERIFY_REG');
          break;

        case 'FORGOT_PASSWORD':
          await apexApi.forgotPassword({ email });
          startOtpFlow('VERIFY_RESET');
          break;

        case 'VERIFY_REG':
          const regRes = await apexApi.verifyOtp({ email, otp, password });
          if (regRes.data.token) {
            setToken(regRes.data.token, email);
            router.push('/');
          }
          break;

        case 'VERIFY_RESET':
          const resetData: ResetPasswordRequest = { email, otp, newPassword };
          await apexApi.resetPassword(resetData);
          setCurrentStep('LOGIN');
          alert("Key recovered. Authorization required.");
          break;
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Terminal Connection Interrupted");
    } finally {
      setLoading(false);
    }
  };

  const startOtpFlow = (nextStep: Step) => {
    setTimer(60);
    setIsTimerRunning(true);
    setCurrentStep(nextStep);
  };

  const handleResend = async () => {
    try {
      if (currentStep === 'VERIFY_REG') await apexApi.register({ email, password });
      else await apexApi.forgotPassword({ email });
      setTimer(60);
      setIsTimerRunning(true);
    } catch (e) {
      setError("Resend Failed");
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#0f0f13] p-6 overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[45%] h-[45%] bg-[#673AB7] opacity-10 blur-[130px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] bg-[#9E86FF] opacity-10 blur-[130px]" />

      <div className="w-full max-w-[420px] z-10">
        <div className="flex flex-col items-center mb-8 text-center">
            <motion.div 
              initial={{ rotate: -10 }} 
              animate={{ rotate: 0 }}
              className="w-16 h-16 rounded-[24px] bg-gradient-to-br from-[#673AB7] to-[#9E86FF] flex items-center justify-center shadow-xl shadow-[#673AB7]/30 mb-4"
            >
                <TrendingUp size={32} className="text-white" />
            </motion.div>
            <h1 className="text-xl font-black tracking-[5px] text-[#673AB7] uppercase">Apex Invest</h1>
        </div>

        <AnimatePresence mode="wait">
          <motion.div 
            key={currentStep}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="glass-card rounded-[48px] p-10 border-white/5 relative"
          >
            {/* BACK BUTTON FOR SUB-FLOWS */}
            {currentStep !== 'LOGIN' && currentStep !== 'SIGNUP' && (
                <button 
                  onClick={() => setCurrentStep('LOGIN')}
                  className="absolute left-8 top-10 text-gray-500 hover:text-white transition-colors"
                >
                    <ChevronLeft size={24} />
                </button>
            )}

            <div className="mb-10 text-center">
              <h2 className="text-2xl font-black tracking-tight">
                {currentStep === 'LOGIN' && 'Authorize Access'}
                {currentStep === 'SIGNUP' && 'New Terminal'}
                {currentStep === 'FORGOT_PASSWORD' && 'Key Recovery'}
                {currentStep === 'VERIFY_REG' && 'Verify Signal'}
                {currentStep === 'VERIFY_RESET' && 'Reset Access'}
              </h2>
              <p className="text-[10px] text-gray-500 font-black uppercase tracking-[2px] mt-2">
                {currentStep === 'VERIFY_REG' ? `Signal sent to ${email}` : 'Institutional Grade Security'}
              </p>
            </div>

            <form onSubmit={handleAction} className="space-y-5">
              {(currentStep === 'LOGIN' || currentStep === 'SIGNUP' || currentStep === 'FORGOT_PASSWORD') && (
                <AuthInput icon={<Mail size={18}/>} placeholder="Email Address" type="email" value={email} onChange={setEmail} />
              )}

              {(currentStep === 'LOGIN' || currentStep === 'SIGNUP') && (
                <AuthInput icon={<Lock size={18}/>} placeholder="Access Key" type="password" value={password} onChange={setPassword} />
              )}

              {(currentStep === 'VERIFY_REG' || currentStep === 'VERIFY_RESET') && (
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 ml-2 uppercase tracking-widest">Verification Code</label>
                    <input 
                      type="text" 
                      placeholder="000000" 
                      maxLength={6}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-center text-2xl font-black tracking-[12px] outline-none focus:border-[#673AB7] transition-all" 
                      value={otp} 
                      onChange={(e) => setOtp(e.target.value)} 
                      required 
                    />
                </div>
              )}

              {currentStep === 'VERIFY_RESET' && (
                <AuthInput icon={<KeyRound size={18}/>} placeholder="New Access Key" type="password" value={newPassword} onChange={setNewPassword} />
              )}

              {(currentStep === 'SIGNUP' || currentStep === 'VERIFY_RESET') && (
                <StrengthMeter score={passwordStrength} />
              )}

              {currentStep === 'LOGIN' && (
                <div className="text-right">
                  <button type="button" onClick={() => setCurrentStep('FORGOT_PASSWORD')} className="text-[10px] font-black text-[#9E86FF] uppercase tracking-widest hover:underline">
                    Forgot Secret Key?
                  </button>
                </div>
              )}

              {(currentStep === 'VERIFY_REG' || currentStep === 'VERIFY_RESET') && (
                <div className="flex justify-center items-center gap-2 py-1">
                  <span className="text-[10px] text-gray-500 font-bold uppercase">No code?</span>
                  {isTimerRunning ? (
                    <span className="text-[10px] text-[#673AB7] font-black tracking-widest">{timer}s</span>
                  ) : (
                    <button type="button" onClick={handleResend} className="text-[10px] text-[#673AB7] font-black uppercase tracking-widest underline">Resend</button>
                  )}
                </div>
              )}

              {error && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 p-4 bg-red-500/10 text-red-500 rounded-2xl border border-red-500/20">
                  <AlertCircle size={16} />
                  <span className="text-[10px] font-black uppercase tracking-tight">{error}</span>
                </motion.div>
              )}

              <button
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 bg-[#673AB7] p-5 rounded-2xl font-black text-white hover:bg-[#7E57C2] transition-all shadow-lg shadow-[#673AB7]/20 disabled:opacity-50 active:scale-95"
              >
                {loading ? <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" /> : (
                  <>
                    <span className="uppercase tracking-[3px] text-sm">
                      {currentStep === 'LOGIN' ? 'Authorize' : 'Confirm'}
                    </span>
                    <ArrowRight size={20} />
                  </>
                )}
              </button>
            </form>

            {currentStep === 'LOGIN' && (
              <div className="mt-10 space-y-6">
                <div className="relative flex items-center justify-center">
                  <div className="w-full border-t border-white/5" />
                  <span className="absolute bg-[#14141a] px-3 text-[9px] font-black text-gray-600 tracking-[3px] uppercase">Nexus Sync</span>
                </div>
                <button className="w-full flex items-center justify-center gap-3 p-4 glass rounded-2xl text-sm font-bold hover:bg-white/5 transition-all group">
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5" />
                  <span className="group-hover:text-white transition-colors">Continue with Google</span>
                </button>
              </div>
            )}

            <div className="mt-10 text-center">
              <button 
                onClick={() => {
                  setError('');
                  setCurrentStep(currentStep === 'LOGIN' ? 'SIGNUP' : 'LOGIN');
                }}
                className="text-[10px] font-black text-gray-500 uppercase tracking-[2px] hover:text-[#9E86FF] transition-all"
              >
                {currentStep === 'LOGIN' ? "Create New Identity" : "Return to Vault"}
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// --- HELPERS ---

function AuthInput({ icon, placeholder, type, value, onChange }: any) {
  return (
    <div className="relative group">
      <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-[#9E86FF] transition-colors">
        {icon}
      </div>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 pl-14 outline-none focus:border-[#673AB7] focus:bg-white/10 transition-all font-medium text-white placeholder:text-gray-600"
        required
      />
    </div>
  );
}

function StrengthMeter({ score }: { score: number }) {
  const colors = ['bg-gray-800', 'bg-red-500', 'bg-orange-500', 'bg-blue-500', 'bg-[#00e676]'];
  const labels = ['Empty', 'Weak', 'Fair', 'Good', 'Strong'];

  return (
    <div className="px-2 space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Security Level</span>
        <span className={`text-[9px] font-black uppercase tracking-widest`} style={{ color: score > 0 ? '' : '#4b5563' }}>
          {labels[score]}
        </span>
      </div>
      <div className="flex gap-2 h-1">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={`flex-1 rounded-full transition-all duration-700 ${i <= score ? colors[score] : 'bg-white/5'}`} />
        ))}
      </div>
    </div>
  );
}