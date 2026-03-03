'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { apexApi, portfolioRepo } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, ChevronRight, DollarSign, 
  Moon, Sun, Lock, Download, Trash2, 
  LogOut, RefreshCw, Globe
} from 'lucide-react';

export default function ProfileScreen() {
  const router = useRouter();
  const { 
    userEmail, isUsd, toggleCurrency, 
    themeMode, setThemeMode, logout, portfolio,
    liveRate, setLiveRate 
  } = useStore();

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isSyncingRate, setIsSyncingRate] = useState(false);

  /**
   * --- 🌟 LIVE CURRENCY SYNC ---
   */
  const syncLiveCurrency = async () => {
    setIsSyncingRate(true);
    try {
      const rate = await portfolioRepo.getConversionRate(true);
      setLiveRate(rate); 
    } catch (e) {
      console.error("Currency Sync Failed");
    } finally {
      setIsSyncingRate(false);
    }
  };

  useEffect(() => {
    syncLiveCurrency();
  }, []);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const csvRows = [
        ["Symbol", "Quantity", "Buy Price", "Current Price", "PNL %"],
        ...portfolio.map(s => [
          s.symbol, 
          s.quantity, 
          s.buyPrice, 
          s.currentPrice, 
          ((s.currentPrice - s.buyPrice) / s.buyPrice * 100).toFixed(2)
        ])
      ];
      const csvContent = "data:text/csv;charset=utf-8," + csvRows.map(e => e.join(",")).join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `ApexInvest_Portfolio_${new Date().toLocaleDateString()}.csv`);
      document.body.appendChild(link);
      link.click();
    } catch (e) {
      alert("Export failed");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await apexApi.deleteUserAccount();
      logout();
      router.push('/auth');
    } catch (e) {
      alert("Delete failed.");
    }
  };

  // 🌟 Logic helper for UI labels
  const isDarkMode = themeMode === 2;

  return (
    <div className="min-h-screen bg-(--background) text-(--foreground) pb-20 font-sans transition-colors duration-300">
      {/* Header */}
      <div className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-3 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-all">
            <ArrowLeft size={20} className="text-(--foreground)" />
          </button>
          <h1 className="text-xl font-black tracking-tight">Terminal Settings</h1>
        </div>
        
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-2xl">
          <RefreshCw size={14} className={`text-[#673ab7] ${isSyncingRate ? 'animate-spin' : ''}`} />
          <span className="text-[10px] font-black text-gray-400 tracking-widest uppercase">
             1 USD = {liveRate.toFixed(2)} INR
          </span>
        </div>
      </div>

      <div className="px-6 space-y-8">
        {/* USER PROFILE CARD */}
        <div className="w-full bg-[#673ab7] rounded-[40px] p-8 flex items-center gap-5 shadow-xl shadow-[#673ab7]/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Globe size={120} />
          </div>
          <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center text-3xl font-black z-10 text-white">
            {userEmail?.[0].toUpperCase()}
          </div>
          <div className="z-10 text-white">
            <h2 className="text-2xl font-black leading-tight truncate max-w-50">{userEmail?.split('@')[0]}</h2>
            <p className="text-sm text-white/60 mb-2 truncate max-w-50">{userEmail}</p>
            <div className="inline-flex px-3 py-1 bg-white/10 rounded-full text-[10px] font-black tracking-widest uppercase">
              Vault Verified
            </div>
          </div>
        </div>

        {/* GENERAL SECTION */}
        <div>
          <SectionTitle>Global Configuration</SectionTitle>
          <div className="bg-white/2 border border-white/5 rounded-[40px] overflow-hidden">
            <SettingsTile 
              icon={<DollarSign size={20}/>} 
              title="Local Currency" 
              subtitle={isUsd ? "Displaying Terminal in USD ($)" : "Displaying Terminal in INR (₹)"}
              onClick={toggleCurrency}
              trailing={<Switch active={isUsd} />}
            />
            <SettingsTile 
              icon={<RefreshCw size={20}/>} 
              title="Force FX Sync" 
              subtitle={`Reconcile Price Data @ ₹${liveRate.toFixed(2)}`}
              onClick={syncLiveCurrency}
              trailing={isSyncingRate && <Loader size={18} />}
            />
          </div>
        </div>

        {/* APPEARANCE SECTION */}
        <div>
          <SectionTitle>Appearance</SectionTitle>
          <div className="bg-white/2 border border-white/5 rounded-[40px] overflow-hidden">
            <SettingsTile 
              icon={isDarkMode ? <Moon size={20}/> : <Sun size={20}/>} 
              title="Terminal Theme" 
              subtitle={isDarkMode ? "Deep Space Mode" : "Bright Market Mode"}
              // 🌟 1 = Light, 2 = Dark
              onClick={() => setThemeMode(isDarkMode ? 1 : 2)}
              trailing={
                <div className="px-4 py-1.5 rounded-full bg-[#673ab7]/10 text-[#673ab7] text-[10px] font-black uppercase tracking-widest">
                  {isDarkMode ? "Dark" : "Light"}
                </div>
              }
            />
          </div>
        </div>

        {/* SECURITY & DATA SECTION */}
        <div>
          <SectionTitle>Data & Privacy</SectionTitle>
          <div className="bg-white/2 border border-white/5 rounded-[40px] overflow-hidden">
            <SettingsTile 
              icon={<Lock size={20}/>} 
              title="Security Key" 
              subtitle="Update password vault"
              onClick={() => alert("Forwarding to secure vault...")}
            />
            <SettingsTile 
              icon={<Download size={20}/>} 
              title="Cloud Data Export" 
              subtitle={isExporting ? "Encrypting CSV..." : "Generate .csv statement"}
              onClick={handleExport}
            />
            <SettingsTile 
              icon={<Trash2 size={20}/>} 
              title="Wipe Terminal" 
              subtitle="Delete cloud portfolio & ledger"
              textColor="text-red-500"
              iconColor="text-red-500"
              onClick={() => setShowDeleteModal(true)}
            />
            <SettingsTile 
              icon={<LogOut size={20}/>} 
              title="Secure Exit" 
              subtitle="End Terminal Session"
              onClick={() => { logout(); router.push('/auth'); }}
            />
          </div>
        </div>

        <p className="text-center text-[10px] font-black text-gray-500 tracking-[4px] uppercase">ApexInvest Terminal v1.6.0</p>
      </div>

      {/* DELETE MODAL */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#121216] border border-white/10 p-8 rounded-[48px] max-w-sm w-full text-center shadow-3xl">
              <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-black mb-2 text-white">Wipe All Data?</h3>
              <p className="text-sm text-gray-500 mb-8 leading-relaxed uppercase tracking-tighter font-bold">This action is irreversible. Your cloud ledger and portfolio will be permanently deleted.</p>
              <div className="flex gap-4">
                <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-4 bg-white/5 border border-white/10 rounded-2xl font-black text-xs uppercase tracking-widest text-white">Cancel</button>
                <button onClick={handleDeleteAccount} className="flex-1 py-4 bg-red-500 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-red-500/30 text-white">Delete</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// UI Components
const SectionTitle = ({ children }: { children: string }) => (
  <h3 className="text-[#673ab7] text-[10px] font-black uppercase tracking-[3px] mb-4 ml-6">{children}</h3>
);

const SettingsTile = ({ icon, title, subtitle, onClick, textColor = "text-[var(--foreground)]", iconColor = "text-[#673ab7]", trailing }: any) => (
  <button onClick={onClick} className="w-full flex items-center justify-between p-6 hover:bg-white/3 transition-all border-b border-white/5 last:border-0 active:bg-white/5">
    <div className="flex items-center gap-4">
      <div className={`w-11 h-11 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center ${iconColor}`}>
        {icon}
      </div>
      <div className="text-left">
        <h4 className={`font-black text-sm tracking-tight ${textColor}`}>{title}</h4>
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">{subtitle}</p>
      </div>
    </div>
    {trailing || <ChevronRight size={18} className="text-gray-700" />}
  </button>
);

const Switch = ({ active }: { active: boolean }) => (
  <div className={`w-12 h-7 rounded-full p-1 transition-all duration-300 ${active ? 'bg-[#673ab7]' : 'bg-white/10'}`}>
    <div className={`w-5 h-5 bg-white rounded-full transition-all duration-300 shadow-sm ${active ? 'translate-x-5' : 'translate-x-0'}`} />
  </div>
);

function Loader({ size }: { size: number }) {
  return <RefreshCw size={size} className="animate-spin text-[#673ab7]" />;
}