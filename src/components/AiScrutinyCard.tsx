'use client';
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, ArrowRight, Loader2 } from 'lucide-react';

export default function AiScrutinyCard({ isLoading, insight, onAnalyze }: any) {
  return (
    <div className="glass rounded-4xl p-6 border border-[#673ab7]/20 relative overflow-hidden group cursor-pointer" onClick={onAnalyze}>
      
      {/* Content */}
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-[#673ab7]/10 flex items-center justify-center">
              {isLoading ? <Loader2 size={20} className="text-[#673ab7] animate-spin" /> : <Star size={20} className="text-[#673ab7]" />}
            </div>
            <div>
              <h4 className="font-black text-base text-[#673ab7]">PrognosAI Scrutiny</h4>
              <p className="text-[10px] font-bold text-gray-500 uppercase">Deep Analysis</p>
            </div>
          </div>
          <div className="bg-[#673ab7]/10 px-3 py-1 rounded-full">
            <span className="text-[9px] font-black text-[#673ab7]">STRATEGY</span>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {insight ? (
            <motion.p 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} 
              className="text-sm font-medium text-gray-300 leading-relaxed"
            >
              {insight}
            </motion.p>
          ) : (
            <p className="text-sm font-bold text-gray-500">
              Tap to generate a deep scan of your portfolio composition, sector risks, and rebalancing opportunities.
            </p>
          )}
        </AnimatePresence>

        <div className="mt-4 flex items-center gap-2 text-[#673ab7] text-xs font-black uppercase tracking-widest">
          <span>Full Report</span>
          <ArrowRight size={12} />
        </div>
      </div>

      {/* Aesthetic Glow */}
      <div className="absolute -right-10 -top-10 w-40 h-40 bg-[#673ab7] opacity-10 blur-[50px] group-hover:opacity-20 transition-opacity" />
    </div>
  );
}