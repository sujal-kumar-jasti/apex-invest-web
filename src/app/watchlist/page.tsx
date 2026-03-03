'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Plus, RefreshCw, Trash2, TrendingUp, TrendingDown, Info, Search, Loader2 
} from 'lucide-react';
import { useStore } from '@/store';
import { apexApi, portfolioRepo } from '@/lib/api';
import PremiumLineChart from '@/components/PremiumLineChart';
import { WatchlistEntity, StockSearchResult } from '@/types';

// --- PREMIUM COLORS ---
const COLORS = {
  GeminiPurple: '#673AB7',
  SurfaceDark: '#16161A',
  SurfaceLight: '#F7F7F9',
  ProGreen: '#00E676',
  ProRed: '#FF5252',
  TextGray: '#9E9E9E',
  BorderDark: '#2C2C35',
};

export default function WatchlistPage() {
  const router = useRouter();
  const store = useStore();
  
  // UI State
  const [isSyncing, setIsSyncing] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<StockSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  const watchlist = store.watchlist;
  const marketData = store.marketData;
  const isUsd = store.isUsd;
  const liveRate = store.liveRate || 84.0;
  const isDark = store.themeMode !== 1;

  // --- 1. INITIAL SYNC ---
  useEffect(() => {
    const init = async () => {
      setIsSyncing(true);
      await portfolioRepo.fullCloudSync();
      store.setWatchlist(portfolioRepo.localWatchlist);
      setIsSyncing(false);
    };
    init();
  }, []);

  // --- 2. SILENT BACKGROUND POLLING ---
  useEffect(() => {
    if (watchlist.length === 0) return;

    const poll = async () => {
      await Promise.allSettled(
        watchlist.map(item => portfolioRepo.fetchAndUpdatePrice(item.symbol))
      );
      
      watchlist.forEach(item => {
        const cached = portfolioRepo.getCachedLive(item.symbol);
        if (cached) {
          store.updateMarketData(item.symbol, {
            price: cached.price,
            changePercent: cached.changePercent,
            sparkline: cached.candles ? cached.candles.map((c: any) => c.close) : []
          });
        }
      });
      setRefreshTick(prev => prev + 1);
    };

    const interval = setInterval(poll, 8000);
    return () => clearInterval(interval);
  }, [watchlist, store]);

  // --- 3. SEARCH LOGIC ---
  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      if (searchQuery.length >= 2) {
        setIsSearching(true);
        try {
          const res = await apexApi.search(searchQuery);
          setSearchResults(res.data || []);
        } catch (e) {
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  // --- 4. ACTIONS ---
  const handleDelete = async (e: React.MouseEvent, symbol: string) => {
    e.stopPropagation();
    try {
      await apexApi.deleteFromCloudWatchlist({ symbol });
      store.setWatchlist(watchlist.filter(w => w.symbol !== symbol));
    } catch (err) {
      console.error("Failed to delete", err);
    }
  };

  const handleAddStock = async (symbol: string) => {
    try {
      await apexApi.updateCloudWatchlist({ symbol });
      store.setWatchlist([...watchlist, { symbol, lastPrice: 0 }]);
      setShowAddDialog(false);
      setSearchQuery("");
      portfolioRepo.fetchAndUpdatePrice(symbol);
    } catch (err) {
      console.error("Failed to add", err);
    }
  };

  const getConvertedPrice = (val: number, symbol: string) => {
    const isInd = symbol.endsWith(".NS") || symbol.endsWith(".BO");
    if (isUsd) return isInd ? val / liveRate : val;
    return isInd ? val : val * liveRate;
  };

  return (
    <div className={`min-h-screen pb-32 bg-[#08080a] text-white font-sans`}>
      {/* Header */}
      <header className="flex items-center justify-between p-6 sticky top-0 z-50 bg-[#08080a]/80 backdrop-blur-xl border-b border-white/5">
        <button onClick={() => router.back()} className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 active:scale-90 transition-all">
          <ArrowLeft size={20} />
        </button>
        <div className="text-center">
          <h1 className="text-lg font-black tracking-tight">Watchlist</h1>
          <p className="text-[10px] text-[#673ab7] font-black uppercase tracking-[2px]">Real-time Tracking</p>
        </div>
        <button onClick={() => setShowAddDialog(true)} className="h-10 w-10 rounded-xl bg-[#673ab7] flex items-center justify-center shadow-lg active:scale-90 transition-all">
          <Plus size={22} />
        </button>
      </header>

      {/* Action Bar */}
      <div className="px-6 py-4 flex justify-between items-center">
        <button 
          onClick={store.toggleCurrency}
          className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-[#673ab7]"
        >
          {isUsd ? "USD $" : "INR ₹"}
        </button>
        <button 
          onClick={() => portfolioRepo.fullCloudSync()}
          className={`h-10 w-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 ${isSyncing ? 'animate-spin' : ''}`}
        >
          <RefreshCw size={18} />
        </button>
      </div>

      {/* List */}
      <main className="px-6 space-y-4">
        {watchlist.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-20 opacity-30">
            <Info size={48} />
            <p className="mt-4 font-black text-xs uppercase tracking-widest">Watchlist is empty</p>
          </div>
        ) : (
          watchlist.map((stock) => (
            <GlassWatchlistItem 
              key={`${stock.symbol}_${refreshTick}`}
              stock={stock}
              isUsd={isUsd}
              livePrice={marketData[stock.symbol]?.price || stock.lastPrice}
              sparkline={marketData[stock.symbol]?.sparkline || []}
              onDelete={(e) => handleDelete(e, stock.symbol)}
              onClick={() => router.push(`/stock/${stock.symbol}`)}
              currencySym={isUsd ? '$' : '₹'}
              getConvertedPrice={getConvertedPrice}
            />
          ))
        )}
      </main>

      {/* Add Dialog with Live Search Dropdown */}
      <AnimatePresence>
        {showAddDialog && (
          <div className="fixed inset-0 z-100 flex items-end sm:items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowAddDialog(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              className="relative w-full max-w-md bg-[#121216] border border-white/10 rounded-t-[40px] sm:rounded-[40px] p-6 max-h-[90vh] flex flex-col"
            >
              <h3 className="text-xl font-black mb-1">Track New Asset</h3>
              <p className="text-[11px] font-bold text-gray-500 mb-6 uppercase tracking-wider">Search and sync your vault</p>
              
              <div className="relative mb-4">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input 
                  autoFocus
                  placeholder="Ticker or Company Name..."
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-[#673ab7] transition-all font-bold"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {isSearching && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <Loader2 className="animate-spin text-[#673ab7]" size={18} />
                  </div>
                )}
              </div>

              {/* Search Results Dropdown */}
              <div className="flex-1 overflow-y-auto mb-6 custom-scrollbar">
                {searchResults.length > 0 ? (
                  <div className="space-y-2">
                    {searchResults.map((result) => (
                      <div 
                        key={result.symbol}
                        onClick={() => handleAddStock(result.symbol)}
                        className="p-4 rounded-2xl bg-white/2 border border-white/5 flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer"
                      >
                        <div>
                          <p className="font-black text-sm">{result.symbol}</p>
                          <p className="text-[10px] text-gray-500 font-bold truncate max-w-50">{result.name}</p>
                        </div>
                        <span className="text-[9px] px-2 py-1 rounded bg-[#673ab7]/20 text-[#673ab7] font-black uppercase">{result.exch}</span>
                      </div>
                    ))}
                  </div>
                ) : searchQuery.length >= 2 && !isSearching ? (
                  <p className="text-center py-10 text-gray-500 text-xs font-bold uppercase">No matching symbols found</p>
                ) : null}
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setShowAddDialog(false)}
                  className="flex-1 py-4 rounded-2xl bg-white/5 font-black uppercase text-[11px] tracking-widest"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- SUB-COMPONENT: GlassWatchlistItem ---

interface ItemProps {
  stock: WatchlistEntity;
  livePrice: number;
  sparkline: number[];
  isUsd: boolean;
  onDelete: (e: React.MouseEvent) => void;
  onClick: () => void;
  currencySym: string;
  getConvertedPrice: (v: number, s: string) => number;
}

function GlassWatchlistItem({ stock, livePrice, sparkline, onClick, onDelete, currencySym, getConvertedPrice }: ItemProps) {
  const isUp = sparkline.length >= 2 ? sparkline[sparkline.length - 1] >= sparkline[0] : true;
  const trendColor = isUp ? COLORS.ProGreen : COLORS.ProRed;
  const convertedPrice = getConvertedPrice(livePrice, stock.symbol);

  return (
    <motion.div 
      layout
      onClick={onClick}
      className="bg-white/3 border border-white/5 rounded-4xl p-5 flex items-center justify-between active:scale-[0.98] transition-all cursor-pointer group"
    >
      <div className="w-24">
        <h4 className="text-base font-black tracking-tighter">{stock.symbol}</h4>
        <p className="text-[9px] text-gray-500 font-black uppercase tracking-wider">Monitoring</p>
      </div>

      <div className="flex-1 h-10 px-4 opacity-50">
        {sparkline.length > 0 && (
          <PremiumLineChart 
            dataPoints={sparkline} 
            isPositive={isUp} 
            strokeWidth={2.5}
            showGradient={false}
          />
        )}
      </div>

      <div className="text-right flex flex-col items-end min-w-25">
        <span className="text-base font-black tabular-nums tracking-tight">
          {currencySym}{convertedPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
        <div 
          className="mt-1 flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase"
          style={{ backgroundColor: `${trendColor}15`, color: trendColor }}
        >
          {isUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
          Live
        </div>
      </div>

      <button 
        onClick={onDelete}
        className="ml-4 p-2.5 rounded-2xl bg-red-500/10 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity active:bg-red-500/20"
      >
        <Trash2 size={18} />
      </button>
    </motion.div>
  );
}