'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Calendar, RefreshCw, Briefcase } from 'lucide-react';
import { apexApi } from '@/lib/api';
import { useStore } from '@/store/useStore';
import { TransactionItem } from '@/types';

interface TradeEntrySheetProps {
  onClose: () => void;
  onSuccess: () => void;
  initialSymbol?: string;
}

export default function TradeEntrySheet({ onClose, onSuccess, initialSymbol = "" }: TradeEntrySheetProps) {
  const { portfolio, isUsd } = useStore();
  
  const [searchQuery, setSearchQuery] = useState(initialSymbol);
  const [selectedSymbol, setSelectedSymbol] = useState(initialSymbol);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isDropdownExpanded, setIsDropdownExpanded] = useState(false);

  const [isBuy, setIsBuy] = useState(true);
  const [quantity, setQuantity] = useState('1');
  const [price, setPrice] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [loading, setLoading] = useState(false);
  const [exchangeRate, setExchangeRate] = useState(91.0);

  // --- 1. LIVE RATE SYNC ---
  const fetchCurrentRate = useCallback(async () => {
    try {
      const res = await apexApi.getExchangeRate("USD");
      if (res.data?.rates?.INR) setExchangeRate(res.data.rates.INR);
    } catch (e) { console.error("Rate fetch failed", e); }
  }, []);

  useEffect(() => {
    fetchCurrentRate();
    if (initialSymbol) handleSearch(initialSymbol);
  }, [fetchCurrentRate, initialSymbol]);

  const activeColor = isBuy ? '#00E676' : '#FF5252';
  
  // --- 2. DYNAMIC CURRENCY LOGIC ---
  const isIndianTicker = selectedSymbol.toUpperCase().endsWith(".NS") || selectedSymbol.toUpperCase().endsWith(".BO");
  const activeCurrencySymbol = isIndianTicker ? "₹" : (isUsd ? "$" : "₹");

  const handleSearch = async (q: string) => {
    const query = q.toUpperCase();
    setSearchQuery(query);
    setSelectedSymbol('');
    setIsDropdownExpanded(true);
    if (query.length < 2) { setSearchResults([]); return; }
    try {
      const res = await apexApi.search(query);
      setSearchResults(Array.isArray(res.data) ? res.data : []);
    } catch (e) { setSearchResults([]); }
  };

  const onSelectStock = (stock: any) => {
    setSearchQuery(stock.symbol);
    setSelectedSymbol(stock.symbol);
    setIsDropdownExpanded(false);

    const rawPrice = stock.price ?? 0;
    const isIndian = stock.symbol.endsWith(".NS") || stock.symbol.endsWith(".BO");
    
    if (isIndian) {
        setPrice(rawPrice.toString()); 
    } else {
        setPrice(!isUsd ? (rawPrice * exchangeRate).toFixed(2) : rawPrice.toString());
    }
  };

  const validateAndExecute = async () => {
    if (!selectedSymbol || !quantity || !price) return;
    setLoading(true);
    try {
      const tradeData: TransactionItem = {
        symbol: selectedSymbol,
        type: isBuy ? "BUY" : "SELL",
        quantity: parseFloat(quantity),
        price: parseFloat(price),
        timestamp: new Date(selectedDate).getTime(),
        fees: 0,
        notes: `Terminal Execution (${activeCurrencySymbol})`
      };
      await apexApi.recordTrade(tradeData);
      onSuccess();
      onClose();
    } catch (e) { alert("Execution Failed"); } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="absolute inset-0" onClick={onClose} />

      <motion.div 
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        className="bg-[#0f0f11] border border-white/10 w-full max-w-md rounded-4xl p-6 relative z-10 flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER - Compact */}
        <div className="flex justify-between items-center mb-5">
          <div>
            <h2 className="text-xl font-black tracking-tighter uppercase text-white leading-none">Record Trade</h2>
            <p className="text-[8px] font-black text-[#673ab7] tracking-[2px] uppercase mt-1">Institutional Order Entry</p>
          </div>
          <button onClick={onClose} className="p-2 bg-white/5 rounded-xl hover:bg-white/10 transition-all active:scale-90">
            <X size={18} className="text-white"/>
          </button>
        </div>

        {/* TOGGLE - Slimmer */}
        <div className="flex w-full h-12 bg-white/5 rounded-2xl p-1 mb-5 border border-white/5">
          <button onClick={() => setIsBuy(true)} className={`flex-1 rounded-xl font-black text-[10px] tracking-widest transition-all ${isBuy ? 'bg-[#00E676] text-black' : 'text-gray-500'}`}>BUY</button>
          <button onClick={() => setIsBuy(false)} className={`flex-1 rounded-xl font-black text-[10px] tracking-widest transition-all ${!isBuy ? 'bg-[#FF5252] text-white' : 'text-gray-500'}`}>SELL</button>
        </div>

        {/* PORTFOLIO QUICK-SELECT - Condensed */}
        {!isBuy && portfolio.length > 0 && (
          <div className="mb-5">
            <label className="text-[8px] font-black text-gray-600 uppercase tracking-[2px] ml-1 mb-2 block">Quick Select</label>
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {portfolio.map((item) => (
                <button 
                  key={item.symbol}
                  onClick={() => onSelectStock({ symbol: item.symbol, price: item.currentPrice || item.buyPrice })}
                  className={`shrink-0 px-4 py-2 rounded-xl border transition-all ${selectedSymbol === item.symbol ? 'bg-[#673ab7] border-[#673ab7]' : 'bg-white/5 border-white/5'}`}
                >
                  <span className="text-[10px] font-black text-white">{item.symbol}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* SEARCH - Integrated Label */}
        <div className="relative mb-5 z-30">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={16}/>
            <input 
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 pl-12 outline-none focus:border-[#673ab7] transition-all font-bold text-white text-sm uppercase"
              placeholder="Search Asset..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>

          <AnimatePresence>
            {isDropdownExpanded && searchResults.length > 0 && !selectedSymbol && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute top-[105%] left-0 right-0 bg-[#16161a] border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-50 max-h-48 overflow-y-auto">
                {searchResults.slice(0, 5).map((s) => (
                  <button key={s.symbol} onClick={() => onSelectStock(s)} className="w-full flex items-center justify-between p-4 hover:bg-white/5 border-b border-white/5 last:border-0 transition-colors">
                    <span className="font-black text-xs text-white">{s.symbol}</span>
                    <span className="text-[8px] font-bold text-gray-600 uppercase">{s.exch}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* QTY & PRICE - Unified Grid */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-white/5 border border-white/5 rounded-2xl p-3">
            <label className="text-[7px] font-black text-gray-600 uppercase tracking-widest mb-1 block">Units</label>
            <input className="w-full bg-transparent font-black text-lg text-white outline-none" value={quantity} onChange={(e) => setQuantity(e.target.value)} type="number" />
          </div>
          <div className="bg-white/5 border border-white/5 rounded-2xl p-3 relative">
            <label className="text-[7px] font-black text-gray-600 uppercase tracking-widest mb-1 block">Price ({activeCurrencySymbol})</label>
            <input className="w-full bg-transparent font-black text-lg text-white outline-none" value={price} onChange={(e) => setPrice(e.target.value)} />
            <RefreshCw size={10} className={`absolute right-3 top-3 text-[#673ab7] ${loading ? 'animate-spin' : ''} opacity-30`} />
          </div>
        </div>

        {/* DATE - Condensed */}
        <div className="mb-6 bg-white/5 border border-white/5 rounded-2xl p-3 flex items-center justify-between">
          <div className="flex-1">
            <label className="text-[7px] font-black text-gray-600 uppercase tracking-widest mb-1 block">Execution Date</label>
            <input type="date" className="bg-transparent font-black text-xs text-white outline-none w-full" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
          </div>
          <Calendar size={16} className="text-gray-600" />
        </div>

        {/* EXECUTE - Bold & Minimal */}
        <button 
          onClick={validateAndExecute}
          disabled={!selectedSymbol || loading}
          className="w-full py-5 rounded-2xl font-black tracking-[4px] transition-all active:scale-95 disabled:opacity-20 uppercase text-[11px] shadow-xl"
          style={{ backgroundColor: activeColor, color: isBuy ? 'black' : 'white' }}
        >
          {loading ? "Syncing..." : `EXECUTE ${isBuy ? 'BUY' : 'SELL'}`}
        </button>
      </motion.div>
    </div>
  );
}