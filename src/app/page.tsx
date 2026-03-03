'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store'; 
import { apexApi, portfolioRepo } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, TrendingDown, PieChart, 
  Plus, Activity, RefreshCw, Eye, BrainCircuit, 
  AreaChart, Layers, Compass, Briefcase
} from 'lucide-react';
import PremiumLineChart from '@/components/PremiumLineChart';
import { StockEntity } from '@/types';

export default function Dashboard() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  // --- 1. STORE ---
  const token = useStore((state) => state.token);
  const userEmail = useStore((state) => state.userEmail);
  const portfolio = useStore((state) => state.portfolio);
  const setPortfolio = useStore((state) => state.setPortfolio);
  const marketData = useStore((state) => state.marketData);
  const updateMarketData = useStore((state) => state.updateMarketData);
  const isUsd = useStore((state) => state.isUsd);
  const liveRate = useStore((state) => state.liveRate || 91.0);
  const setLiveRate = useStore((state) => state.setLiveRate);
  const toggleCurrency = useStore((state) => state.toggleCurrency);

  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => { setIsMounted(true); }, []);

  const syncData = useCallback(async () => {
    if (!token) return;
    setIsSyncing(true);
    try {
      const fxRes = await apexApi.getExchangeRate("USD");
      if (fxRes.data?.rates?.INR) setLiveRate(fxRes.data.rates.INR);
      await portfolioRepo.fullCloudSync();
      const mapped: StockEntity[] = portfolioRepo.localPortfolio.map((item) => ({
        symbol: item.symbol, name: item.symbol, quantity: item.quantity,
        buyPrice: item.buyPrice || 0, currentPrice: item.currentPrice || 0,
        dailyChange: item.dailyChange || 0, changePercent: 0,
        lastUpdated: item.lastUpdated || new Date().toISOString()
      }));
      setPortfolio(mapped);
    } catch (err: any) {
      if (err.response?.status === 401) router.push('/auth');
    } finally { setIsSyncing(false); }
  }, [token, setPortfolio, setLiveRate, router]);

  useEffect(() => {
    if (!isMounted) return;
    if (!token) router.push('/auth');
    else syncData();
  }, [isMounted, token, router, syncData]);

  const getConvertedPrice = (val: number, symbol: string) => {
    const isInd = symbol.endsWith(".NS") || symbol.endsWith(".BO");
    return isUsd ? (isInd ? val / liveRate : val) : (isInd ? val : val * liveRate);
  };

  useEffect(() => {
    if (!isMounted || !token || !portfolio?.length) return;
    const pollMarket = async () => {
      portfolio.forEach(async (stock) => {
        try {
          const res = await apexApi.getStockLive(stock.symbol, "1d");
          if (res.data) {
            updateMarketData(stock.symbol, { 
              price: res.data.price, changePercent: res.data.changePercent,
              sparkline: res.data.candles?.map((c: any) => c.close) || [res.data.price, res.data.price] 
            });
          }
        } catch (e) {}
      });
    };
    pollMarket();
    const interval = setInterval(pollMarket, 25000); 
    return () => clearInterval(interval);
  }, [isMounted, portfolio, token, updateMarketData]);

  const stats = useMemo(() => {
    let totalVal = 0, initialCap = 0;
    portfolio?.forEach((s) => {
      const live = marketData[s.symbol]?.price || s.buyPrice || 0;
      totalVal += getConvertedPrice(live, s.symbol) * s.quantity;
      initialCap += getConvertedPrice(s.buyPrice, s.symbol) * s.quantity;
    });
    const gain = totalVal - initialCap;
    const roi = initialCap > 0 ? (gain / initialCap) * 100 : 0;
    const allSparks = Object.values(marketData).map(m => m.sparkline).filter(s => s && s.length > 0);
    const maxLen = allSparks.reduce((max, curr) => Math.max(max, (curr?.length || 0)), 0);
    let aggSparkline = [0, 0];
    if (maxLen > 0) {
      aggSparkline = Array(maxLen).fill(0).map((_, idx) => {
        return portfolio.reduce((acc, stock) => {
          const spark = marketData[stock.symbol]?.sparkline || [];
          const offset = spark.length - maxLen + idx;
          const pAtIdx = spark[offset] || stock.buyPrice || 0;
          return acc + (getConvertedPrice(pAtIdx, stock.symbol) * stock.quantity);
        }, 0);
      });
    }
    return { total: totalVal, gain, roi, isPos: gain >= 0, aggSparkline };
  }, [portfolio, marketData, isUsd, liveRate]);

  if (!isMounted || !token) return null;

  return (
    <div className="min-h-screen pb-24 bg-[#08080a] text-white">
      {/* HEADER */}
      <header className="flex items-center justify-between p-5 bg-[#08080a]/80 backdrop-blur-xl sticky top-0 z-30 border-b border-white/5">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push('/profile')}>
          <div className="h-10 w-10 rounded-xl bg-[#673ab7] flex items-center justify-center font-black text-white shadow-lg border border-white/10">{userEmail?.[0]?.toUpperCase()}</div>
          <div>
            <div className="flex items-center gap-1"><Activity size={8} className="text-[#00e676]" /><p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Active</p></div>
            <h2 className="text-xs font-black tracking-tight">{userEmail?.split('@')[0]}</h2>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={toggleCurrency} className="h-9 w-9 bg-white/5 rounded-lg flex items-center justify-center font-black text-[#673ab7] border border-white/5 text-[10px]">{isUsd ? '$' : '₹'}</button>
          <button onClick={() => router.push('/portfolio/add')} className="h-9 w-9 bg-[#673ab7] rounded-lg flex items-center justify-center text-white active:scale-95 transition-all"><Plus size={18} /></button>
        </div>
      </header>

      {/* EQUITY CARD */}
      <section className="px-5 mt-2">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-[#121216] w-full h-56 rounded-[40px] p-6 flex flex-col justify-between overflow-hidden relative border border-white/10 shadow-2xl">
          <div className="z-10">
            <div className="flex justify-between items-center mb-1"><span className="text-[9px] font-black text-gray-500 tracking-[3px] uppercase">Net Worth</span><Layers size={12} className="text-gray-600" /></div>
            <div className="flex items-baseline gap-1"><span className="text-xl font-black text-gray-500">{isUsd ? '$' : '₹'}</span><TickerText value={stats.total} /></div>
            <div className={`mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[9px] font-black ${stats.isPos ? 'bg-[#00e676]/10 text-[#00e676]' : 'bg-[#ff5252]/10 text-[#ff5252]'}`}>
              {stats.isPos ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
              <span>{Math.abs(stats.roi).toFixed(2)}% ROI</span>
              <span className="opacity-20">|</span>
              <span>{isUsd ? '$' : '₹'}{Math.abs(stats.gain).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            </div>
          </div>
          <div className="absolute inset-0 z-0 opacity-30 translate-y-10"><PremiumLineChart dataPoints={stats.aggSparkline} isPositive={stats.isPos} /></div>
        </motion.div>
      </section>

      {/* 🌟 ACTION HUB - COMPACT SINGLE ROW */}
      <div className="px-5 py-6">
        <div className="flex items-center justify-between overflow-x-auto no-scrollbar gap-2">
          <ActionPill icon={<Eye size={18} />} label="Watch" color="#1976D2" onClick={() => router.push('/watchlist')} />
          <ActionPill icon={<PieChart size={18} />} label="DNA" color="#7B1FA2" onClick={() => router.push('/portfolio/dna')} />
          <ActionPill icon={<Briefcase size={18} />} label="Port" color="#FB8C00" onClick={() => router.push('/portfolio')} />
          <ActionPill icon={<Compass size={18} />} label="Expl" color="#F44336" onClick={() => router.push('/explore')} />
          <ActionPill icon={<BrainCircuit size={18} />} label="AI" color="#673AB7" onClick={() => router.push('/ai-ideas')} />
          <ActionPill icon={<AreaChart size={18} />} label="Cast" color="#00e676" onClick={() => router.push('/predictions')} />
        </div>
      </div>

      {/* MARKET WATCH */}
      <section className="px-5 space-y-3">
        <div className="flex justify-between items-center px-1"><h3 className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Active Pool</h3>{isSyncing && <RefreshCw size={10} className="animate-spin text-[#673ab7]" />}</div>
        <div className="space-y-2">
          {portfolio?.map((stock) => {
            const mkt = marketData[stock.symbol];
            const p = getConvertedPrice(mkt?.price || stock.buyPrice || 0, stock.symbol);
            const isUp = (mkt?.changePercent || 0) >= 0;
            return (
              <motion.div key={stock.symbol} layout onClick={() => router.push(`/stock/${stock.symbol}`)}
                className="bg-white/2 h-20 rounded-4xl px-5 flex items-center justify-between border border-white/5 active:bg-white/5 transition-all cursor-pointer">
                <div className="flex items-center gap-3 w-1/3">
                  <div className="h-9 w-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center font-black text-[#673ab7] text-xs uppercase">{stock.symbol.slice(0, 2)}</div>
                  <div className="truncate"><h4 className="font-black text-xs truncate">{stock.symbol}</h4><p className="text-[8px] text-gray-500 font-bold uppercase">{stock.quantity} Units</p></div>
                </div>
                <div className="flex-1 h-8 px-4 opacity-20"><PremiumLineChart dataPoints={mkt?.sparkline || [0, 0]} isPositive={isUp} strokeWidth={2} showGradient={false} animate={false} /></div>
                <div className="text-right w-1/3">
                   <p className="font-black text-white text-sm">{isUsd ? '$' : '₹'}{p.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                   <p className={`text-[9px] font-black ${isUp ? 'text-[#00e676]' : 'text-[#ff5252]'}`}>{isUp ? '+' : ''}{mkt?.changePercent?.toFixed(2)}%</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function TickerText({ value }: { value: number }) {
  const formatted = value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (
    <div className="overflow-hidden h-10 flex items-center">
      <AnimatePresence mode="popLayout">
        <motion.span key={formatted} initial={{ y: 15, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -15, opacity: 0 }} className="text-3xl font-black text-white">{formatted}</motion.span>
      </AnimatePresence>
    </div>
  );
}

const ActionPill = ({ icon, label, color, onClick }: any) => (
  <div onClick={onClick} className="flex flex-col items-center gap-1.5 cursor-pointer flex-1 min-w-14">
    <div className="h-14 w-14 rounded-2xl flex items-center justify-center bg-[#121216] border border-white/5 active:bg-white/10 transition-all shadow-md" style={{ color }}>{icon}</div>
    <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest">{label}</span>
  </div>
);