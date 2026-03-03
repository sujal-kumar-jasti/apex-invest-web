'use client';

import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { apexApi, portfolioRepo } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Plus, TrendingUp, TrendingDown, 
  RefreshCw, History, Trash2, 
  CheckCircle2, Circle, X, 
  Layers
} from 'lucide-react';
import TradeEntrySheet from '@/components/TradeEntrySheet';
import PremiumLineChart from '@/components/PremiumLineChart';
import { StockEntity, TransactionItem } from '@/types';

export default function PortfolioScreen() {
  const router = useRouter();
  
  const token = useStore((state) => state.token);
  const portfolio = useStore((state) => state.portfolio);
  const setPortfolio = useStore((state) => state.setPortfolio);
  const marketData = useStore((state) => state.marketData);
  const updateMarketData = useStore((state) => state.updateMarketData);
  const isUsd = useStore((state) => state.isUsd);
  const toggleCurrency = useStore((state) => state.toggleCurrency);
  const liveRate = useStore((state) => state.liveRate || 91.0);
  const setLiveRate = useStore((state) => state.setLiveRate);

  const [showSheet, setShowSheet] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  const pressTimer = useRef<NodeJS.Timeout | null>(null);

  const getConvertedPrice = useCallback((rawPrice: number, symbol: string) => {
    const isIndian = symbol.toUpperCase().endsWith(".NS") || symbol.toUpperCase().endsWith(".BO");
    if (isUsd) return isIndian ? rawPrice / liveRate : rawPrice;
    return !isIndian ? rawPrice * liveRate : rawPrice;
  }, [isUsd, liveRate]);

  const syncPortfolio = useCallback(async () => {
    if (!token) return;
    setIsSyncing(true);
    try {
      const freshRate = await portfolioRepo.getConversionRate(true);
      setLiveRate(freshRate);
      const { data } = await apexApi.sync();
      if (data?.portfolio) {
        const mapped: StockEntity[] = data.portfolio.map((item: any) => ({
          symbol: item.symbol,
          name: item.symbol,
          quantity: item.quantity,
          buyPrice: item.averageBuyPrice || 0,
          currentPrice: 0,
          dailyChange: 0,
          changePercent: 0,
          lastUpdated: item.lastUpdated || new Date().toISOString(),
        }));
        setPortfolio(mapped);
      }
    } catch (e) { console.error("Vault Offline"); } finally { setIsSyncing(false); }
  }, [token, setPortfolio, setLiveRate]);

  useEffect(() => { if (!token) router.push('/auth'); else syncPortfolio(); }, [token, router, syncPortfolio]);

  /**
   * --- 🌟 THE FIX: EXACT REPLICATION OF TRADE SHEET LOGIC ---
   */
  const handleDeleteAsset = async (stock: StockEntity) => {
    if (!confirm(`Liquidate all units of ${stock.symbol}?`)) return;
    setIsProcessing(stock.symbol);
    
    try {
      const rawPrice = marketData[stock.symbol]?.price || stock.buyPrice || 0;

      // 1. Build the transaction object exactly like TradeEntrySheet
      const tradeData: TransactionItem = {
        symbol: stock.symbol,
        type: "SELL",
        quantity: Number(stock.quantity),
        price: Number(rawPrice),
        timestamp: Date.now(),
        fees: 0, // 🌟 Ensure fees is present
        notes: `Portfolio Auto-Liquidation (${isUsd ? 'USD' : 'INR'})`
      };

      // 2. Execute the trade record
      await apexApi.recordTrade(tradeData);

      // 3. Remove the item from the vault
      await apexApi.deleteCloudPortfolioItem(stock.symbol);
      
      // 4. Update local state
      setPortfolio(portfolio.filter(s => s.symbol !== stock.symbol));
    } catch (e) {
      console.error("Liquidation Process Error:", e);
      alert("Liquidation Failed: Check Network or Ledger Balance");
    } finally {
      setIsProcessing(null);
    }
  };

  /**
   * --- BULK LIQUIDATION ---
   */
  const handleBulkLiquidate = async () => {
    if (selectedSymbols.length === 0) return;
    if (!confirm(`Liquidate ${selectedSymbols.length} assets?`)) return;
    setIsSyncing(true);
    try {
      for (const sym of selectedSymbols) {
        setIsProcessing(sym);
        const stock = portfolio.find(p => p.symbol === sym);
        if (!stock) continue;

        const rawPrice = marketData[sym]?.price || stock.buyPrice || 0;

        await apexApi.recordTrade({ 
          symbol: sym, 
          type: "SELL", 
          quantity: Number(stock.quantity), 
          price: Number(rawPrice), 
          timestamp: Date.now(),
          fees: 0,
          notes: "Bulk Portfolio Liquidation"
        });

        await apexApi.deleteCloudPortfolioItem(sym);
      }
      setPortfolio(portfolio.filter(s => !selectedSymbols.includes(s.symbol)));
      setSelectedSymbols([]);
      setIsBulkMode(false);
    } catch (e) { 
      alert("Bulk Liquidation Failed");
      syncPortfolio(); 
    } finally { 
      setIsProcessing(null); 
      setIsSyncing(false); 
    }
  };

  // UI Handlers
  const startPress = (symbol: string) => { pressTimer.current = setTimeout(() => { setIsBulkMode(true); setSelectedSymbols([symbol]); }, 600); };
  const endPress = () => { if (pressTimer.current) clearTimeout(pressTimer.current); };
  const toggleSelect = (symbol: string) => { if (!isBulkMode) return; setSelectedSymbols(prev => prev.includes(symbol) ? prev.filter(s => s !== symbol) : [...prev, symbol]); };

  const stats = useMemo(() => {
    let totalValPreferred = 0, totalInvPreferred = 0;
    portfolio.forEach((s) => {
      const currentRaw = marketData[s.symbol]?.price || s.buyPrice || 0;
      const buyRaw = s.buyPrice || 0;
      const currentConv = getConvertedPrice(currentRaw, s.symbol);
      const buyConv = getConvertedPrice(buyRaw, s.symbol);
      totalValPreferred += (currentConv * s.quantity);
      totalInvPreferred += (buyConv * s.quantity);
    });
    const gain = totalValPreferred - totalInvPreferred;
    return { total: totalValPreferred, gain, isPos: gain >= 0, percent: totalInvPreferred > 0 ? (gain / totalInvPreferred) * 100 : 0 };
  }, [portfolio, marketData, getConvertedPrice]);

  return (
    <div className="min-h-screen bg-[#08080a] text-white pb-40">
      <header className="p-6 flex items-center justify-between sticky top-0 z-40 bg-[#08080a]/90 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center gap-4">
          <button onClick={() => isBulkMode ? (setIsBulkMode(false), setSelectedSymbols([])) : router.push('/')} className="p-3 bg-white/5 rounded-2xl border border-white/10 active:scale-90 transition-all">
            {isBulkMode ? <X size={20}/> : <ArrowLeft size={20}/>}
          </button>
          <div>
            <h1 className="font-black text-lg tracking-widest uppercase">{isBulkMode ? 'Mark' : 'Vault'}</h1>
            <p className="text-[9px] font-black text-[#673ab7] tracking-[2px] uppercase">{isBulkMode ? `${selectedSymbols.length} Targeted` : 'Asset Access'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <button onClick={() => router.push('/portfolio/history')} className="p-3 bg-white/5 rounded-2xl active:scale-90 transition-all"><History size={20} className="text-gray-400" /></button>
           <button onClick={toggleCurrency} className="px-4 py-2 bg-white/5 rounded-2xl border border-white/10 font-black text-[10px]">{isUsd ? 'USD' : 'INR'}</button>
           <button onClick={() => setShowSheet(true)} className="p-3 bg-[#673ab7] rounded-2xl active:scale-95 transition-all"><Plus size={20}/></button>
        </div>
      </header>

      <section className="px-6 mt-6">
        <div className="bg-[#121216] rounded-[40px] p-8 border border-white/5 shadow-2xl overflow-hidden relative">
          <Layers size={120} className="absolute -right-10 -bottom-10 text-white/[0.02] -rotate-12" />
          <span className="text-[10px] font-black text-gray-500 tracking-[3px] uppercase block mb-2">Net Worth</span>
          <div className="flex items-baseline gap-1 mb-6">
            <span className="text-2xl font-black text-gray-500">{isUsd ? '$' : '₹'}</span>
            <TickerText value={stats.total} />
          </div>
          <div className={`px-4 py-1.5 rounded-full inline-flex items-center gap-2 text-[10px] font-black ${stats.isPos ? 'bg-[#00e676]/10 text-[#00e676]' : 'bg-[#ff5252]/10 text-[#ff5252]'}`}>
            {stats.isPos ? <TrendingUp size={12}/> : <TrendingDown size={12}/>}
            {Math.abs(stats.percent).toFixed(2)}%
          </div>
        </div>
      </section>

      <section className="px-6 mt-10 space-y-3">
        <h3 className="text-[10px] font-black text-gray-600 tracking-[4px] uppercase px-2 mb-4">Holdings</h3>
        <AnimatePresence mode="popLayout">
          {portfolio.map((stock) => {
            const mkt = marketData[stock.symbol];
            const currentRaw = mkt?.price || stock.buyPrice;
            const totalValueConverted = getConvertedPrice(currentRaw, stock.symbol) * stock.quantity;
            const isSelected = selectedSymbols.includes(stock.symbol);
            const isProfit = currentRaw >= stock.buyPrice;

            return (
              <motion.div 
                key={stock.symbol} layout
                onPointerDown={() => startPress(stock.symbol)}
                onPointerUp={endPress}
                onClick={() => isBulkMode ? toggleSelect(stock.symbol) : router.push(`/stock/${stock.symbol}`)}
                className={`p-5 rounded-[32px] border transition-all flex items-center justify-between cursor-pointer ${
                  isSelected ? 'bg-[#673ab7]/10 border-[#673ab7]' : 'bg-white/2 border-white/5 group'
                }`}
              >
                <div className="flex items-center gap-4 w-1/4">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center font-black text-[#673ab7] text-xs">{stock.symbol.slice(0, 2)}</div>
                    {isBulkMode && <div className="absolute -top-2 -left-2">{isSelected ? <CheckCircle2 size={18} className="text-[#673ab7] fill-[#08080a]" /> : <Circle size={18} className="text-white/20" />}</div>}
                  </div>
                  <div className="hidden sm:block">
                    <h4 className="font-black text-white text-[13px]">{stock.symbol}</h4>
                    <p className="text-[9px] font-bold text-gray-500 uppercase">{stock.quantity} Units</p>
                  </div>
                </div>

                <div className="flex-1 h-10 px-6">
                  <PremiumLineChart dataPoints={mkt?.sparkline || [0, 0]} isPositive={isProfit} strokeWidth={2} showGradient={false} />
                </div>

                <div className="flex items-center gap-4 w-1/3 justify-end">
                  <div className="text-right">
                    <p className="font-black text-sm text-white">{isUsd ? '$' : '₹'}{totalValueConverted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    <p className={`text-[9px] font-black ${isProfit ? 'text-[#00e676]' : 'text-[#ff5252]'}`}>{isProfit ? 'PROFIT' : 'LOSS'}</p>
                  </div>
                  {!isBulkMode && (
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteAsset(stock); }} className="p-3 bg-red-500/10 text-red-500 rounded-2xl opacity-0 group-hover:opacity-100 transition-all">
                      {isProcessing === stock.symbol ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </section>

      {isBulkMode && selectedSymbols.length > 0 && (
          <motion.div initial={{ y: 100 }} animate={{ y: 0 }} className="fixed bottom-10 left-6 right-6 z-50 bg-[#673ab7] rounded-3xl p-6 shadow-2xl flex items-center justify-between">
            <h4 className="text-lg font-black text-white">{selectedSymbols.length} Marked</h4>
            <button onClick={handleBulkLiquidate} className="bg-black text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] flex items-center gap-3 active:scale-95 transition-all">
              <Trash2 size={16} /> Execute
            </button>
          </motion.div>
      )}

      <AnimatePresence>
        {showSheet && <TradeEntrySheet onClose={() => setShowSheet(false)} onSuccess={syncPortfolio} />}
      </AnimatePresence>
    </div>
  );
}

function TickerText({ value }: { value: number }) {
  const formatted = value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (
    <div className="overflow-hidden h-10 flex items-center">
      <AnimatePresence mode="popLayout">
        <motion.span key={formatted} initial={{ y: 15, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -15, opacity: 0 }} className="text-4xl font-black text-white tracking-tighter">
          {formatted}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}