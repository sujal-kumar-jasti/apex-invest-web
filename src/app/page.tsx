'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { motion } from 'framer-motion';
import { TrendingUp, ArrowRight, ShieldCheck, Zap, Globe } from 'lucide-react';

/**
 * FEATURE ICON COMPONENT
 */
const FeatureIcon = ({ icon, label }: { icon: React.ReactNode, label: string }) => (
  <div className="flex flex-col items-center gap-2">
    <div className="text-[#673AB7] opacity-60 hover:opacity-100 transition-opacity">
      {icon}
    </div>
    <span className="text-[8px] font-black uppercase tracking-[2px] text-gray-600">{label}</span>
  </div>
);

/**
 * MAIN LANDING PAGE COMPONENT
 */
export default function LandingPage() {
  const router = useRouter();
  const token = useStore((state) => state.token);
  const [isMounted, setIsMounted] = useState(false);

  // --- HYDRATION & REDIRECTION LOGIC ---
  useEffect(() => {
    setIsMounted(true);
    // If user is already authenticated, move to dashboard automatically
    if (token) {
      router.replace('/dashboard');
    }
  }, [token, router]);

  // Prevent flash of content during server-side rendering
  if (!isMounted || token) return null;

  return (
    <div className="min-h-screen bg-[#08080a] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
      
      {/* Visual Ambiance */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#673AB7] opacity-10 blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#9E86FF] opacity-10 blur-[120px]" />

      <div className="z-10 max-w-2xl w-full text-center">
        
        {/* Brand Identity */}
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex flex-col items-center mb-12"
        >
          <div className="w-24 h-24 rounded-[40px] bg-linear-to-br from-[#673AB7] to-[#9E86FF] flex items-center justify-center shadow-2xl shadow-[#673AB7]/40 mb-6">
            <TrendingUp size={48} className="text-white" />
          </div>
          <h1 className="text-4xl font-black tracking-[10px] text-white uppercase">
            Apex Invest
          </h1>
          <p className="text-[10px] text-[#673AB7] font-black uppercase tracking-[5px] mt-4">
            Financial Intelligence Terminal
          </p>
        </motion.div>

        {/* Hero Section */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="space-y-6"
        >
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-300">
            Professional Grade Portfolio Tracking. <br/>
            <span className="text-white font-black">Powered by Apex AI.</span>
          </h2>
          
          <p className="text-gray-500 text-sm max-w-md mx-auto leading-relaxed uppercase tracking-tighter font-medium px-4">
            Monitor global markets, analyze risk factors, and manage your assets through an encrypted, institutional-grade interface.
          </p>
        </motion.div>

        {/* Capabilities Row */}
        <motion.div 
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           transition={{ delay: 0.6 }}
           className="flex justify-center gap-10 my-14"
        >
          <FeatureIcon icon={<ShieldCheck size={20}/>} label="Secure" />
          <FeatureIcon icon={<Zap size={20}/>} label="Live" />
          <FeatureIcon icon={<Globe size={20}/>} label="Global" />
        </motion.div>

        {/* Primary Action */}
        <motion.button
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8 }}
          onClick={() => router.push('/auth')}
          className="group relative inline-flex items-center gap-4 bg-white text-black px-12 py-5 rounded-[24px] font-black uppercase tracking-widest text-sm hover:bg-[#9E86FF] hover:text-white transition-all active:scale-95 shadow-2xl shadow-white/5"
        >
          Enter Terminal
          <ArrowRight size={20} className="group-hover:translate-x-2 transition-transform" />
        </motion.button>

        {/* Version Control */}
        <p className="mt-20 text-[9px] font-black text-gray-700 uppercase tracking-[4px]">
          ApexInvest Terminal v1.6.8 • RSA Encrypted
        </p>
      </div>
    </div>
  );
}