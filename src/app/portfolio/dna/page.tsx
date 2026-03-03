'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { apexApi } from '@/lib/api';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, PieChart, TrendingUp, TrendingDown, 
  Shield, Zap, CheckCircle, AlertTriangle, Activity
} from 'lucide-react';
import PremiumLineChart from '@/components/PremiumLineChart';
import SectorRingChart from '@/components/SectorRingChart';
import HoldingsMap from '@/components/HoldingsMap';
import AiScrutinyCard from '@/components/AiScrutinyCard';

export default function AnalyticsScreen() {
  const router = useRouter();
  const { portfolio, marketData, isUsd, liveRate } = useStore();
  const [aiLoading, setAiLoading] = useState(false);
  const [aiInsight, setAiInsight] = useState<string | null>(null);

  // --- 1. SMART CONVERTER HELPER ---
  const getConvertedPrice = (val: number, symbol: string) => {
    const isIndianStock = symbol.endsWith(".NS") || symbol.endsWith(".BO");
    if (isUsd) {
      return isIndianStock ? val / liveRate : val;
    } else {
      return isIndianStock ? val : val * liveRate;
    }
  };

  // --- 2. INSTITUTIONAL CALCULATION ENGINE ---
  const analytics = useMemo(() => {
    let totalValConverted = 0;
    const sectorMap: Record<string, number> = {};
    const assetAllocations: any[] = [];
    
    let gainers: any[] = [];
    let losers: any[] = [];

    portfolio.forEach(stock => {
      const live = marketData[stock.symbol];
      const rawPrice = live?.price || stock.buyPrice || 0;
      const convertedPrice = getConvertedPrice(rawPrice, stock.symbol);
      const value = convertedPrice * stock.quantity;
      const change = live?.changePercent || 0;

      totalValConverted += value;

      // Sector Grouping (Always in converted value)
      const sec = stock.sector || "Equity";
      sectorMap[sec] = (sectorMap[sec] || 0) + value;

      const item = { 
        symbol: stock.symbol, 
        value, 
        displayPrice: convertedPrice, 
        change,
        percent: 0 
      };
      
      assetAllocations.push(item);

      if (change >= 0) gainers.push(item);
      else losers.push(item);
    });

    // Sort Gainers/Losers
    gainers.sort((a, b) => b.change - a.change);
    losers.sort((a, b) => a.change - b.change);

    assetAllocations.forEach(a => a.percent = totalValConverted > 0 ? (a.value / totalValConverted) * 100 : 0);
    
    // Master Trend Normalization
    const allSparks = Object.values(marketData).map(m => m.sparkline).filter(s => s && s.length > 0);
    const maxLen = allSparks.reduce((max, curr) => Math.max(max, curr.length), 0);
    let masterTrend: number[] = [];
    
    if (maxLen > 0) {
      masterTrend = Array(maxLen).fill(0).map((_, idx) => {
        return portfolio.reduce((acc, stock) => {
          const spark = marketData[stock.symbol]?.sparkline || [];
          const offset = spark.length - maxLen + idx;
          const priceAtIdx = spark[offset] || stock.buyPrice || 0;
          return acc + (getConvertedPrice(priceAtIdx, stock.symbol) * stock.quantity);
        }, 0);
      });
    }

    return {
      total: totalValConverted,
      sectors: sectorMap,
      allocations: assetAllocations.sort((a, b) => b.value - a.value),
      best: gainers.length > 0 ? gainers[0] : (losers.length > 0 ? losers[losers.length - 1] : null),
      worst: losers.length > 0 ? losers[0] : (gainers.length > 0 ? gainers[gainers.length - 1] : null),
      hasGainers: gainers.length > 0,
      hasLosers: losers.length > 0,
      trend: masterTrend.length > 1 ? masterTrend : [0, 0]
    };
  }, [portfolio, marketData, isUsd, liveRate]);

  // --- 3. AI GENERATION ---
  const handleAiScan = async () => {
    setAiLoading(true);
    try {
      const summary = `Portfolio of ${portfolio.length} assets. Primary Exposure: ${Object.keys(analytics.sectors)[0]}. Value: ${analytics.total.toFixed(0)}.`;
      const { data } = await apexApi.getPortfolioAnalysis(summary);
      setAiInsight(data.responseText || data.response_text || "No insights available.");
    } catch (e) {
      setAiInsight("Strategic engine link timeout.");
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="min-h-screen pb-32 bg-[#08080a] text-white selection:bg-[#673AB7]/30">
      
      {/* HEADER */}
      <header className="flex items-center gap-4 p-6 sticky top-0 z-30 bg-[#08080a]/90 backdrop-blur-xl border-b border-white/5">
        <button onClick={() => router.back()} className="p-3 bg-white/5 rounded-2xl border border-white/10 active:scale-90 transition-all">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-black tracking-tight">Portfolio DNA</h1>
          <div className="flex items-center gap-1.5">
            <Activity size={10} className="text-[#673ab7]" />
            <p className="text-[9px] font-black text-gray-500 uppercase tracking-[2px]">Institutional Intelligence</p>
          </div>
        </div>
      </header>

      <main className="px-6 space-y-8 mt-4">
        
        {/* 1. EQUITY CURVE */}
        <section>
          <div className="flex justify-between items-end mb-4 px-2">
            <div>
              <p className="text-[10px] font-black text-gray-500 tracking-[3px] uppercase">Net Equity Value</p>
              <h2 className="text-3xl font-black tracking-tighter">
                {isUsd ? '$' : '₹'}{analytics.total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </h2>
            </div>
            <div className="bg-white/5 px-3 py-1 rounded-full border border-white/10 text-[9px] font-black uppercase">
               {isUsd ? 'USD' : 'INR'} Base
            </div>
          </div>
          <div className="h-48 w-full bg-[#121216] rounded-[40px] p-0 overflow-hidden border border-white/5 relative">
             <div className="absolute inset-0 opacity-40">
               <PremiumLineChart dataPoints={analytics.trend} isPositive={analytics.trend[analytics.trend.length-1] >= analytics.trend[0]} showGradient={true} strokeWidth={3} />
             </div>
          </div>
        </section>

        {/* 2. DYNAMIC MOVERS */}
        <section>
          <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4 px-2">Performance Extremes</h3>
          <div className="flex gap-4">
            <MoverCard 
              title={analytics.hasGainers ? "Top Alpha" : "Most Resilient"} 
              data={analytics.best} 
              isUsd={isUsd}
            />
            <MoverCard 
              title={analytics.hasLosers ? "Main Laggard" : "Least Growth"} 
              data={analytics.worst} 
              isUsd={isUsd}
            />
          </div>
        </section>

        {/* 3. AI SCRUTINY */}
        <section>
          <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4 px-2">Neural Audit</h3>
          <AiScrutinyCard 
            isLoading={aiLoading} 
            insight={aiInsight} 
            onAnalyze={handleAiScan} 
          />
        </section>

        {/* 4. SECTOR WEIGHTS */}
        <section>
          <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4 px-2">Sector DNA</h3>
          <div className="bg-[#121216] rounded-[40px] p-8 border border-white/5 shadow-2xl">
         <SectorRingChart 
  sectors={analytics.sectors} 
  total={analytics.total} 
  isUsd={isUsd} 
  rate={liveRate} 
/>
          </div>
        </section>

        {/* 5. ALLOCATION MAP */}
        <section>
          <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4 px-2">Allocation Heatmap</h3>
          <HoldingsMap 
  allocations={analytics.allocations} 
  isUsd={isUsd} 
  rate={liveRate} 
  onClick={(sym: string) => router.push(`/stock/${sym}`)} 
/>
        </section>

      </main>
    </div>
  );
}

const MoverCard = ({ title, data, isUsd }: any) => {
  if (!data) return <div className="flex-1 h-32 bg-white/5 rounded-[32px] animate-pulse" />;
  
  const isPositive = data.change >= 0;
  const color = isPositive ? '#00e676' : '#ff5252';
  const Icon = isPositive ? TrendingUp : TrendingDown;

  return (
    <div className="flex-1 bg-white/[0.02] p-6 rounded-[36px] border border-white/5 relative overflow-hidden group hover:bg-white/[0.05] transition-all">
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-3">
          <Icon size={12} style={{ color }} />
          <span className="text-[9px] font-black uppercase tracking-widest" style={{ color }}>{title}</span>
        </div>
        <h4 className="text-lg font-black text-white">{data.symbol}</h4>
        <p className="text-2xl font-black mt-1" style={{ color }}>
          {isPositive ? '+' : ''}{data.change.toFixed(2)}%
        </p>
        <p className="text-[10px] font-bold text-gray-500 mt-2">
          {isUsd ? '$' : '₹'}{data.displayPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </p>
      </div>
      <div className="absolute -right-4 -bottom-4 w-20 h-20 opacity-5 blur-[40px]" style={{ backgroundColor: color }} />
    </div>
  );
};