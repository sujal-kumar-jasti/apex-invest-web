'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useStore } from '@/store/useStore';
import { apexApi } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, TrendingDown, Activity, AlertTriangle, 
  ChevronRight, Search, Loader2, BarChart3 
} from 'lucide-react';
import { DeepAnalysisResponse, PortfolioSummary } from '@/types';

// --- THEME CONSTANTS (Mirroring Android) ---
const PRO_GREEN = "#00E676";
const PRO_RED = "#FF5252";
const GEMINI_PURPLE = "#673AB7";

export default function PortfolioHealthTab({ onViewDetails }: { onViewDetails: (d: DeepAnalysisResponse) => void }) {
  const { portfolio, portfolioHealthCache, setPortfolioHealthCache } = useStore();
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState("Initializing DNA Scan...");
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const startAnalysis = async () => {
    if (portfolio.length === 0) { setLoading(false); return; }

    // 1. STALE-WHILE-REVALIDATE: Load from cache immediately
    if (portfolioHealthCache && (Date.now() - portfolioHealthCache.timestamp < 10 * 60 * 1000)) {
      setSummary(portfolioHealthCache.data);
      // We still run the analysis in background if needed, but stop initial full-screen loader
      setLoading(false);
    }

    try {
      const symbols = portfolio.map(s => s.symbol);
      const { data: initData } = await apexApi.analyzePortfolio(symbols);
      const jobId = initData.job_id;

      pollRef.current = setInterval(async () => {
        try {
          const { data: jobStatus } = await apexApi.checkJobStatus(jobId);

          if (jobStatus.status === "COMPLETED") {
            clearInterval(pollRef.current!);
            const finalData = jobStatus.data as PortfolioSummary;
            setSummary(finalData);
            setPortfolioHealthCache(finalData);
            setLoading(false);
          } else if (jobStatus.status === "FAILED") {
            clearInterval(pollRef.current!);
            setStatusMessage("Analysis Engine Failed");
            setLoading(false);
          } else {
            // Captures backend status: "Analyzed AAPL (2/5)..."
            setStatusMessage(jobStatus.status);
          }
        } catch (e) { console.error(e); }
      }, 3000);
    } catch (err) {
      setLoading(false);
      setStatusMessage("Cloud Engine Offline");
    }
  };

  useEffect(() => {
    startAnalysis();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [portfolio]);

  if (loading && !summary) return <ProLoadingState message={statusMessage} />;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* 1. BACKGROUND REFRESH INDICATOR (Mirroring Android LinearProgress) */}
      {loading && summary && (
        <div className="w-full">
            <div className="h-1 w-full bg-white/5 overflow-hidden rounded-full">
                <motion.div 
                    initial={{ x: "-100%" }} 
                    animate={{ x: "100%" }} 
                    transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                    className="h-full w-1/2 bg-[#673AB7]" 
                />
            </div>
            <p className="text-[10px] text-center font-black text-[#673AB7] uppercase mt-2 tracking-widest">
                {statusMessage}
            </p>
        </div>
      )}

      {/* 2. SENTIMENT GAUGE CARD */}
      <SentimentGaugeCard score={summary?.total_sentiment_score || 0} mood={summary?.market_mood || "Neutral"} />

      {/* 3. PRO STAT CARDS */}
      <div className="grid grid-cols-2 gap-4">
        <ProStatCard 
            label="Alpha Leader" 
            value={summary?.top_pick || "--"} 
            icon={<TrendingUp size={20} />} 
            color={PRO_GREEN} 
        />
        <ProStatCard 
            label="Analyzed" 
            value={`${summary?.stock_breakdowns.length || 0} Assets`} 
            icon={<BarChart3 size={20} />} 
            color={GEMINI_PURPLE} 
        />
      </div>

      {/* 4. RISK BANNER */}
      <AnimatePresence>
        {summary?.risk_warning && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div className="bg-[#FF5252]/5 border border-[#FF5252]/20 p-4 rounded-[20px] flex items-center gap-3">
                    <AlertTriangle className="text-[#FF5252] shrink-0" size={20} />
                    <p className="text-[#FF5252] text-xs font-bold leading-tight">{summary.risk_warning}</p>
                </div>
            </motion.div>
        )}
      </AnimatePresence>

      {/* 5. PORTFOLIO BREAKDOWN LIST */}
      <div className="flex flex-col gap-3 pb-20">
        <h3 className="text-sm font-black text-white ml-2 tracking-tight">Portfolio Breakdown</h3>
        {summary?.stock_breakdowns.map((stock) => (
          <ProStockAiCard key={stock.symbol} stock={stock} onClick={() => onViewDetails(stock)} />
        ))}
      </div>
    </div>
  );
}

// --- REUSABLE COMPONENTS (Direct logic clones from Android) ---

function SentimentGaugeCard({ score, mood }: { score: number, mood: string }) {
    const progress = (score + 1) / 2;
    const color = progress < 0.4 ? PRO_RED : progress > 0.6 ? PRO_GREEN : "#FFB300";

    return (
        <div className="glass rounded-[30px] p-8 border border-white/5 flex flex-col items-center shadow-2xl transition-all" 
             style={{ boxShadow: `0 20px 40px -20px ${color}66` }}>
            <div className="relative w-48 h-48 flex items-center justify-center">
                {/* SVG Gauge */}
                <svg className="absolute inset-0 w-full h-full -rotate-90">
                    <circle cx="96" cy="96" r="80" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="12" />
                    <motion.circle 
                        cx="96" cy="96" r="80" fill="transparent" stroke={color} strokeWidth="12"
                        strokeDasharray={502}
                        initial={{ strokeDashoffset: 502 }}
                        animate={{ strokeDashoffset: 502 - (502 * progress) }}
                        transition={{ duration: 2, ease: "easeOut" }}
                        strokeLinecap="round"
                    />
                </svg>
                <div className="flex flex-col items-center">
                    <span className="text-5xl font-black transition-colors" style={{ color }}>{Math.round(score * 100)}</span>
                    <span className="text-[9px] font-black text-gray-500 tracking-[3px] uppercase mt-1">AI Score</span>
                </div>
            </div>
            <h3 className="text-2xl font-black mt-6 uppercase tracking-widest transition-colors" style={{ color }}>{mood}</h3>
        </div>
    );
}

function ProStatCard({ label, value, icon, color }: any) {
    return (
        <div className="rounded-3xl p-5 border flex flex-col gap-3 transition-all" 
             style={{ backgroundColor: `${color}0D`, borderColor: `${color}1A` }}>
            <div style={{ color }}>{icon}</div>
            <div>
                <h4 className="text-lg font-black text-white truncate">{value}</h4>
                <p className="text-[10px] font-bold text-gray-500 uppercase">{label}</p>
            </div>
        </div>
    );
}

function ProStockAiCard({ stock, onClick }: { stock: DeepAnalysisResponse, onClick: () => void }) {
    const isBull = stock.agent_synthesis.final_verdict.toLowerCase().includes("buy");
    const color = isBull ? PRO_GREEN : PRO_RED;

    return (
        <motion.div 
            whileTap={{ scale: 0.97 }}
            onClick={onClick}
            className="glass rounded-3xl p-4 flex items-center justify-between border border-white/5 hover:bg-white/5 transition-all cursor-pointer group"
        >
            <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl flex items-center justify-center font-black transition-all group-hover:scale-110"
                     style={{ backgroundColor: `${color}1A`, color }}>
                    {stock.symbol[0]}
                </div>
                <div>
                    <h4 className="font-black text-white text-base">{stock.symbol}</h4>
                    <p className="text-[10px] font-bold text-gray-500 uppercase">{stock.financial_health_score} Health</p>
                </div>
            </div>
            <div className="flex flex-col items-end gap-1">
                <div className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter"
                     style={{ backgroundColor: `${color}26`, color }}>
                    {isBull ? "BUY" : "HOLD"}
                </div>
                <ChevronRight size={16} className="text-gray-600" />
            </div>
        </motion.div>
    );
}

function ProLoadingState({ message }: { message: string }) {
    return (
        <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
            <Loader2 size={40} className="text-[#673AB7] animate-spin" />
            <p className="font-black text-[#673AB7] animate-pulse uppercase text-xs tracking-widest">{message}</p>
        </div>
    );
}