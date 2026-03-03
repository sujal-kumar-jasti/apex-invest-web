'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { apexApi, portfolioRepo } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, RefreshCw, Trash2, Wallet, 
  TrendingUp, TrendingDown, X, CheckSquare, Square,
  Loader2, Clock, CheckCircle2
} from 'lucide-react';
import { TransactionItem } from '@/types';

const COLORS = {
  proGreen: '#00E676',
  proRed: '#FF5252',
  proPurple: '#673AB7',
};

export default function TransactionHistoryPage() {
  const router = useRouter();
  
  const transactions = useStore((state) => state.transactions);
  const setTransactions = useStore((state) => state.setTransactions);
  const isUsd = useStore((state) => state.isUsd);
  const liveRate = useStore((state) => state.liveRate || 91.0); 
  const setLiveRate = useStore((state) => state.setLiveRate);
  const token = useStore((state) => state.token);

  const [isSyncing, setIsSyncing] = useState(false);
  
  /**
   * 🌟 SELECTION ENGINE: 
   * Stores unique composite keys to allow precise individual selection.
   */
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const isSelectionMode = selectedKeys.length > 0;
  const currencySymbol = isUsd ? "$" : "₹";

  const getConvertedPrice = useCallback((rawPrice: number, symbol: string) => {
    const isIndian = symbol.toUpperCase().endsWith(".NS") || symbol.toUpperCase().endsWith(".BO");
    if (isUsd) return isIndian ? rawPrice / liveRate : rawPrice;
    return !isIndian ? rawPrice * liveRate : rawPrice;
  }, [isUsd, liveRate]);

  const syncFromCloud = useCallback(async (silent = false) => {
    if (!token) return;
    if (!silent) setIsSyncing(true);
    try {
      const freshRate = await portfolioRepo.getConversionRate(true);
      setLiveRate(freshRate);
      const { data } = await apexApi.sync();
      if (data?.transactions) {
        const sorted = data.transactions.sort((a, b) => b.timestamp - a.timestamp);
        setTransactions(sorted);
      }
    } catch (e) {
      console.error("Sync Failed", e);
    } finally {
      setIsSyncing(false);
      setIsInitialLoading(false);
    }
  }, [token, setTransactions, setLiveRate]);

  useEffect(() => { syncFromCloud(); }, [syncFromCloud]);

  // Analytics helper
  const analytics = useMemo(() => {
    let buyAcc = 0, sellAcc = 0;
    transactions.forEach(tx => {
      const price = getConvertedPrice(tx.price, tx.symbol);
      const totalValue = price * tx.quantity;
      if (tx.type === "BUY") buyAcc += totalValue;
      else sellAcc += totalValue;
    });
    return { totalBuy: buyAcc, totalSell: sellAcc, net: buyAcc - sellAcc };
  }, [transactions, getConvertedPrice]);

  /**
   * 🌟 BATCH DELETE: Iterates through keys and cleans cloud storage
   */
  const handleBatchDelete = async () => {
    if (selectedKeys.length === 0) return;
    setIsSyncing(true);
    try {
      // Deleting by timestamp (Backend ID)
      await Promise.all(selectedKeys.map(key => {
        const timestamp = key.split('|')[1]; // Extracts timestamp from composite key
        return apexApi.deleteCloudTransaction(timestamp);
      }));
      
      const remaining = transactions.filter(tx => {
        const key = `${tx.symbol}|${tx.timestamp}|${tx.type}`;
        return !selectedKeys.some(sk => sk.startsWith(key));
      });
      
      setTransactions(remaining);
      setSelectedKeys([]);
      setShowConfirm(false);
    } catch (e) {
      alert("Removal Failed. Re-syncing...");
      syncFromCloud();
    } finally {
      setIsSyncing(false);
    }
  };

  const toggleSelect = (key: string) => {
    setSelectedKeys(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const selectAll = () => {
    const allKeys = transactions.map((tx, i) => `${tx.symbol}|${tx.timestamp}|${tx.type}|${i}`);
    setSelectedKeys(allKeys.length === selectedKeys.length ? [] : allKeys);
  };

  if (isInitialLoading && transactions.length === 0) {
    return (
      <div className="min-h-screen bg-[#08080a] flex items-center justify-center">
        <Loader2 className="animate-spin text-[#673ab7]" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#08080a] text-white font-sans selection:bg-[#673ab7]/30">
      
      <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        isSelectionMode ? 'bg-[#673ab7] py-4 shadow-2xl' : 'bg-[#08080a]/80 backdrop-blur-xl py-6 border-b border-white/5'
      }`}>
        <div className="px-6 flex items-center justify-between max-w-3xl mx-auto">
          <div className="flex items-center gap-4">
            {isSelectionMode ? (
              <>
                <button onClick={() => setSelectedKeys([])} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={24} /></button>
                <div className="flex flex-col">
                  <span className="text-sm font-black uppercase tracking-tighter">{selectedKeys.length} Selected</span>
                  <button onClick={selectAll} className="text-[10px] font-bold uppercase text-white/60 text-left">
                    {selectedKeys.length === transactions.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <button onClick={() => router.back()} className="p-2.5 bg-white/5 border border-white/10 rounded-2xl active:scale-90 transition-all"><ArrowLeft size={20} /></button>
                <div>
                  <h1 className="text-lg font-black tracking-tight uppercase">Order History</h1>
                  <p className="text-[9px] font-black tracking-[2px] text-[#673ab7] uppercase">Institution Stream</p>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isSelectionMode ? (
              <button onClick={() => setShowConfirm(true)} className="p-3 bg-white/20 rounded-2xl transition-all active:scale-90"><Trash2 size={20} /></button>
            ) : (
              <button onClick={() => syncFromCloud()} className={`p-3 bg-white/5 border border-white/10 rounded-2xl active:scale-90 transition-all ${isSyncing ? 'animate-spin' : ''}`}>
                <RefreshCw size={18} className="text-[#673ab7]" />
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="pt-28 pb-32 max-w-3xl mx-auto">
        {!isSelectionMode && (
          <section className="px-6 mb-10">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <SummaryCard title="Invested" value={analytics.totalBuy} color={COLORS.proGreen} symbol={currencySymbol} />
              <SummaryCard title="Liquidated" value={analytics.totalSell} color={COLORS.proRed} symbol={currencySymbol} />
            </div>
            <div className="bg-[#121216] border border-white/5 rounded-4xl p-6 mb-8 shadow-2xl text-center">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Net Flow Balance</p>
                <p className={`text-2xl font-black ${analytics.net >= 0 ? 'text-[#00e676]' : 'text-white'}`}>
                  {analytics.net >= 0 ? '+' : '-'}{currencySymbol}{Math.abs(analytics.net).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
            </div>
          </section>
        )}

        <section className="px-6 space-y-4">
          <h2 className="text-[10px] font-black uppercase tracking-[4px] text-gray-600 px-2 flex items-center gap-2">
            <Clock size={12} /> Transaction Stream
          </h2>
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
             {transactions.map((tx, index) => {
                const uniqueId = `${tx.symbol}|${tx.timestamp}|${tx.type}|${index}`;
                return (
                  <TransactionRow 
                    key={uniqueId} 
                    tx={tx} 
                    symbol={currencySymbol} 
                    convertedPrice={getConvertedPrice(tx.price, tx.symbol)}
                    isSelected={selectedKeys.includes(uniqueId)}
                    isSelectionMode={isSelectionMode}
                    onToggle={() => toggleSelect(uniqueId)}
                  />
                );
              })}
            </AnimatePresence>
          </div>
        </section>
      </main>

      <AnimatePresence>
        {showConfirm && (
          <div className="fixed inset-0 z-100 flex items-center justify-center p-6 bg-black/90 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#121216] border border-white/10 rounded-[40px] p-8 max-w-sm w-full text-center shadow-3xl">
              <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                 <Trash2 size={32} className="text-[#ff5252]" />
              </div>
              <h3 className="text-xl font-black mb-2">Wipe {selectedKeys.length} Records?</h3>
              <p className="text-sm text-gray-500 mb-8 font-medium">This will permanently remove selected orders from your vault. This cannot be undone.</p>
              <div className="flex flex-col gap-3">
                <button onClick={handleBatchDelete} className="w-full py-4 bg-[#ff5252] rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all">Confirm Delete</button>
                <button onClick={() => setShowConfirm(false)} className="w-full py-4 bg-white/5 rounded-2xl font-black text-xs uppercase tracking-widest text-gray-400 active:scale-95 transition-all">Cancel</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SummaryCard({ title, value, color, symbol }: any) {
  return (
    <div className="bg-[#121216] border border-white/5 rounded-4xl p-5 shadow-xl">
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-1.5 h-1.5 rounded-full`} style={{ backgroundColor: color }} />
        <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest">{title}</span>
      </div>
      <p className="text-lg font-black truncate tracking-tighter">
        {symbol}{value.toLocaleString(undefined, { minimumFractionDigits: 0 })}
      </p>
    </div>
  );
}

function TransactionRow({ tx, symbol, convertedPrice, isSelected, isSelectionMode, onToggle }: any) {
  const isBuy = tx.type === "BUY";
  const trendColor = isBuy ? COLORS.proGreen : COLORS.proRed;
  const totalValue = convertedPrice * tx.quantity;

  return (
    <motion.div 
      layout
      onClick={onToggle}
      className={`group flex items-center p-5 rounded-4xl border transition-all cursor-pointer ${
        isSelected ? 'bg-[#673ab7]/10 border-[#673ab7]' : 'bg-white/2 border-white/5 hover:bg-white/4'
      }`}
    >
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className="relative">
          <div className={`p-3 rounded-2xl bg-white/5 border border-white/10 transition-colors`}>
             {isSelectionMode ? (
               isSelected ? <CheckCircle2 size={18} className="text-[#673ab7]" /> : <Square size={18} className="text-gray-600" />
             ) : (
               isBuy ? <TrendingUp size={18} className="text-[#00e676]" /> : <TrendingDown size={18} className="text-[#ff5252]" />
             )}
          </div>
        </div>
        <div className="min-w-0">
          <h4 className="font-black text-sm tracking-tight truncate uppercase">{tx.symbol}</h4>
          <div className="flex flex-col">
            <p className="text-[9px] font-black text-gray-500 uppercase">
              {new Date(tx.timestamp).toLocaleDateString('en-US', { month: 'short', day: '2-digit' })} • {new Date(tx.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
            </p>
            <p className="text-[9px] font-black text-[#673ab7] uppercase tracking-widest">{tx.quantity} Units</p>
          </div>
        </div>
      </div>

      <div className="text-right">
        <p className="font-black text-[16px] tracking-tight" style={{ color: trendColor }}>
          {isBuy ? '+' : '-'}{symbol}{totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
        <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest mt-1">
            {isBuy ? 'Purchase' : 'Liquidation'}
        </p>
      </div>
    </motion.div>
  );
}