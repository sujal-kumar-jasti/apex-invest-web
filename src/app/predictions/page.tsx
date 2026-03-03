'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, BrainCircuit } from 'lucide-react';
import { DeepAnalysisResponse } from '@/types';

// Sub-components
import PortfolioHealthTab from './PortfolioHealthTab';
import MarketScoutTab from './MarketScoutTab';
import DeepAnalysisView from './DeepAnalysisView';

export default function PredictionScreen() {
  const router = useRouter();
  const { token } = useStore();
  
  const [activeTab, setActiveTab] = useState(0); // 0 = Health, 1 = Scout
  const [deepAnalysisData, setDeepAnalysisData] = useState<DeepAnalysisResponse | null>(null);

  useEffect(() => {
    if (!token) router.push('/auth');
  }, [token, router]);

  const handleBack = () => {
    if (deepAnalysisData) {
      setDeepAnalysisData(null);
    } else {
      router.back();
    }
  };

  return (
    <div className="min-h-screen bg-[#08080a] text-white font-sans selection:bg-[#673AB7]/30 pb-24">
      
      {/* HEADER (Hidden when viewing deep analysis) */}
      <AnimatePresence>
        {!deepAnalysisData && (
          <motion.header 
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="sticky top-0 z-30 bg-[#08080a]/90 backdrop-blur-xl border-b border-white/5"
          >
            <div className="flex items-center justify-between p-6">
              <button onClick={handleBack} className="p-3 glass rounded-2xl border border-white/10 active:scale-95 transition-transform hover:bg-white/5">
                <ArrowLeft size={20} className="text-gray-300" />
              </button>
              
              <div className="text-center">
                <h1 className="text-xl font-black tracking-tight">PrognosAI Platinum</h1>
                <div className="flex items-center justify-center gap-1.5 mt-1">
                  <BrainCircuit size={12} className="text-[#673AB7]" />
                  <p className="text-[10px] font-bold text-[#673AB7] uppercase tracking-[2px]">God-Mode Engine</p>
                </div>
              </div>
              
              <div className="w-10" />
            </div>

            {/* TABS */}
            <div className="flex px-6 border-b border-white/5 relative">
              <button 
                onClick={() => setActiveTab(0)}
                className={`flex-1 pb-4 text-sm font-black uppercase tracking-widest transition-colors ${activeTab === 0 ? 'text-[#673AB7]' : 'text-gray-600'}`}
              >
                Portfolio DNA
              </button>
              <button 
                onClick={() => setActiveTab(1)}
                className={`flex-1 pb-4 text-sm font-black uppercase tracking-widest transition-colors ${activeTab === 1 ? 'text-[#673AB7]' : 'text-gray-600'}`}
              >
                Market Scout
              </button>
              
              <motion.div 
                layoutId="tab-indicator"
                className="absolute bottom-0 h-[3px] bg-[#673AB7] rounded-t-full shadow-[0_0_15px_#673AB7]"
                initial={false}
                animate={{ 
                  left: activeTab === 0 ? '0%' : '50%', 
                  width: '50%' 
                }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            </div>
          </motion.header>
        )}
      </AnimatePresence>

      {/* CONTENT AREA */}
      <main className="relative min-h-[80vh]">
        <AnimatePresence mode="wait">
          {deepAnalysisData ? (
            <DeepAnalysisView 
              key="deep-view" 
              data={deepAnalysisData} 
              onClose={() => setDeepAnalysisData(null)} 
            />
          ) : (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: activeTab === 0 ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: activeTab === 0 ? 20 : -20 }}
              transition={{ duration: 0.3 }}
              className="p-6"
            >
              {activeTab === 0 ? (
                <PortfolioHealthTab onViewDetails={setDeepAnalysisData} />
              ) : (
                <MarketScoutTab onAnalyzeComplete={setDeepAnalysisData} />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}