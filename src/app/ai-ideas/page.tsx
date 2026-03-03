'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useStore } from '@/store/useStore';
import { apexApi } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, TrendingUp, AlertTriangle, 
  Search, Plus, BrainCircuit, ChevronLeft,
  X, Calendar
} from 'lucide-react';
import { StockSuggestion, AiInsight, TransactionItem } from '@/types';

// --- MAIN COMPONENT ---

export default function AiIdeasPage() {
  const { 
    portfolio, 
    portfolioAuditCache, 
    setPortfolioAuditCache, 
    thematicFinderCache = {}, 
    setThematicFinderCache 
  } = useStore();
  
  // UI Controls
  const [selectedFocus, setSelectedFocus] = useState<'Portfolio' | 'Thematic'>('Portfolio');
  const [themeInput, setThemeInput] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Data States
  const [currentInsights, setCurrentInsights] = useState<AiInsight[]>([]);
  const [currentSuggestions, setCurrentSuggestions] = useState<StockSuggestion[]>([]);
  const [introText, setIntroText] = useState("");

  // Trade Sheet States
  const [isTradeSheetOpen, setIsTradeSheetOpen] = useState(false);
  const [selectedTradeSymbol, setSelectedTradeSymbol] = useState("");

  /**
   * AI Response Parser
   */
  const parseAiResponse = (text: string) => {
    const lines = text.split('\n');
    const insights: AiInsight[] = [];
    const suggestions: StockSuggestion[] = [];

    lines.forEach(line => {
      const cleanLine = line.trim();
      if (!cleanLine) return;

      if (cleanLine.includes('[RISK]')) {
        insights.push({ 
          type: 'WARNING', title: 'Risk Alert', 
          description: cleanLine.replace('[RISK]', '').trim() 
        });
      } else if (cleanLine.includes('[OPPORTUNITY]')) {
        insights.push({ 
          type: 'OPPORTUNITY', title: 'Strategic Alpha', 
          description: cleanLine.replace('[OPPORTUNITY]', '').trim() 
        });
      } else if (cleanLine.includes('[SUGGESTION]')) {
        const content = cleanLine.replace('[SUGGESTION]', '').trim();
        const parts = content.split('|');
        if (parts.length >= 3) {
          suggestions.push({
            symbol: parts[0].trim(),
            sector: parts[1].trim(),
            reason: parts[2].trim()
          });
        }
      }
    });
    return { insights, suggestions };
  };

  /**
   * SWR Generation Logic
   */
  const executeGeneration = useCallback(async (theme: string | null) => {
    setLoading(true);
    const isThematic = theme !== null;
    const CACHE_DURATION = 3600000;

    if (!isThematic && portfolioAuditCache && (Date.now() - portfolioAuditCache.timestamp < CACHE_DURATION)) {
        setCurrentInsights(portfolioAuditCache.insights);
        setCurrentSuggestions(portfolioAuditCache.suggestions);
        setIntroText("Analyzed current holdings. Strategy is institutional-grade.");
        setLoading(false);
        return;
    }

    try {
      let rawText = "";
      if (isThematic && theme) {
        setIntroText(`Scouting assets for '${theme}'...`);
        const res = await apexApi.getThematicAnalysis(theme);
        rawText = res.data.response_text ?? "";
      } else {
        setIntroText("Auditing portfolio DNA for institutional weaknesses...");
        const summary = portfolio.map((s: any) => `${s.symbol}:${s.quantity}`).join(', ') || "Empty Portfolio";
        const res = await apexApi.getPortfolioAnalysis(summary);
        rawText = res.data.response_text ?? "";
      }

      const { insights, suggestions } = parseAiResponse(rawText);
      setCurrentInsights(insights);
      setCurrentSuggestions(suggestions);

      if (isThematic && theme) {
        setThematicFinderCache?.(theme, { insights, suggestions, timestamp: Date.now() });
      } else {
        setPortfolioAuditCache?.({ insights, suggestions, timestamp: Date.now() });
      }
    } catch (e) {
      setIntroText("Engine Offline. Using fallback analysis.");
    } finally {
      setLoading(false);
    }
  }, [portfolio, portfolioAuditCache, setPortfolioAuditCache, setThematicFinderCache]);

  useEffect(() => {
    if (selectedFocus === 'Portfolio') executeGeneration(null);
  }, [selectedFocus, executeGeneration]);

  const handleOpenTrade = (symbol: string) => {
    setSelectedTradeSymbol(symbol);
    setIsTradeSheetOpen(true);
  };

  return (
    <div className="flex flex-col gap-6 p-6 pb-32 animate-in fade-in duration-700 bg-[#08080a] min-h-screen relative">
      
      {/* 1. TOP NAVIGATION & HEADER */}
      <div className="flex items-center gap-4 sticky top-0 bg-[#08080a]/80 backdrop-blur-md py-2 z-40">
        <button 
          onClick={() => window.history.back()}
          className="p-3 rounded-full bg-white/5 border border-white/10 text-white active:scale-90 transition-all hover:bg-white/10"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="flex flex-col">
          <h2 className="text-2xl font-black text-white tracking-tight leading-none">PrognosAI</h2>
          <div className="flex items-center gap-2 mt-1">
             <BrainCircuit size={14} className="text-[#673AB7] animate-pulse" />
             <p className="text-[10px] font-black text-[#673AB7] uppercase tracking-[3px]">Institutional Strategist</p>
          </div>
        </div>
      </div>

      {/* 2. FOCUS TABS */}
      <div className="flex bg-white/5 p-1 rounded-3xl border border-white/5">
        <button 
          onClick={() => setSelectedFocus('Portfolio')}
          className={`flex-1 py-3 rounded-[20px] text-[11px] font-black uppercase transition-all ${selectedFocus === 'Portfolio' ? 'bg-[#673AB7] text-white shadow-xl' : 'text-gray-500'}`}
        >
          Portfolio Audit
        </button>
        <button 
          onClick={() => setSelectedFocus('Thematic')}
          className={`flex-1 py-3 rounded-[20px] text-[11px] font-black uppercase transition-all ${selectedFocus === 'Thematic' ? 'bg-[#673AB7] text-white shadow-xl' : 'text-gray-500'}`}
        >
          Thematic Finder
        </button>
      </div>

      {/* 3. THEMATIC SEARCH */}
      <AnimatePresence>
        {selectedFocus === 'Thematic' && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="relative mb-2">
            <input 
              className="w-full bg-white/5 border border-white/10 rounded-[28px] py-5 pl-14 pr-14 text-sm font-bold text-white focus:border-[#673AB7] outline-none transition-all" 
              placeholder="Search Theme (e.g. Green Tech, AI)..." 
              value={themeInput} 
              onChange={(e) => setThemeInput(e.target.value)} 
              onKeyDown={(e) => e.key === 'Enter' && executeGeneration(themeInput)} 
            />
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
            <button 
              onClick={() => executeGeneration(themeInput)} 
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-[#673AB7] p-2.5 rounded-full shadow-lg active:scale-90 transition-transform"
            >
              <Sparkles size={18} className="text-white" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. CONTENT FEED */}
      <div className="flex flex-col gap-5">
        {loading ? <ThinkingAnimation /> : (
          <>
            {introText && <TypewriterBox text={introText} />}
            
            <div className="space-y-4">
               {currentInsights.map((insight, i) => (
                 <motion.div 
                    key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="p-5 rounded-[28px] border flex gap-4 bg-white/2" 
                    style={{ borderColor: insight.type === 'WARNING' ? '#FF525226' : '#448AFF26' }}
                 >
                    <div className="mt-1" style={{ color: insight.type === 'WARNING' ? '#FF5252' : '#448AFF' }}>
                      {insight.type === 'WARNING' ? <AlertTriangle size={20} /> : <TrendingUp size={20} />}
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-black uppercase tracking-[2px]" style={{ color: insight.type === 'WARNING' ? '#FF5252' : '#448AFF' }}>{insight.title}</span>
                      <p className="text-sm font-medium text-gray-300 leading-relaxed">{insight.description}</p>
                    </div>
                 </motion.div>
               ))}
            </div>

            {currentSuggestions.length > 0 && (
              <div className="mt-4 space-y-4">
                <h3 className="text-xs font-black text-gray-500 uppercase tracking-[4px] ml-2">High-Conviction Picks</h3>
                {currentSuggestions.map((stock, i) => (
                  <motion.div 
                    key={i} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                    className="p-4 rounded-[28px] border border-white/5 flex items-center justify-between hover:bg-white/5 transition-all backdrop-blur-md"
                  >
                    <div className="flex items-center gap-4 flex-1 cursor-pointer">
                      <div className="h-12 w-12 rounded-[18px] bg-[#673AB7]/10 flex items-center justify-center font-black text-[#673AB7] text-lg border border-[#673AB7]/20">
                        {stock.symbol[0]}
                      </div>
                      <div className="flex flex-col">
                        <h4 className="font-black text-white text-base">{stock.symbol}</h4>
                        <p className="text-[10px] font-bold text-gray-500 uppercase">{stock.sector}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="text-[10px] text-gray-400 font-medium italic max-w-35 text-right line-clamp-2 leading-tight">
                        {stock.reason}
                      </p>
                      <button 
                        onClick={() => handleOpenTrade(stock.symbol)} 
                        className="bg-[#673AB7] p-3 rounded-full shadow-lg hover:scale-110 active:scale-90 transition-all"
                      >
                        <Plus size={20} className="text-white" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* 5. TRADE ENTRY SHEET OVERLAY */}
      <AnimatePresence>
        {isTradeSheetOpen && (
          <TradeEntrySheet 
            initialSymbol={selectedTradeSymbol} 
            onClose={() => setIsTradeSheetOpen(false)} 
            onSuccess={() => {
              setIsTradeSheetOpen(false);
              // Refresh logic can be added here
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// --- SUB COMPONENTS ---

function TradeEntrySheet({ onClose, onSuccess, initialSymbol = "" }: any) {
  const { portfolio } = useStore();
  const [searchQuery, setSearchQuery] = useState(initialSymbol);
  const [selectedSymbol, setSelectedSymbol] = useState(initialSymbol);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isDropdownExpanded, setIsDropdownExpanded] = useState(false);
  const [isBuy, setIsBuy] = useState(true);
  const [quantity, setQuantity] = useState('1');
  const [price, setPrice] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);

  const activeColor = isBuy ? '#00E676' : '#FF5252';
  const portfolioSymbols = useMemo(() => portfolio.map((s: any) => s.symbol), [portfolio]);
  const isIndianStock = selectedSymbol.endsWith(".NS") || selectedSymbol.endsWith(".BO");

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
        notes: "PrognosAI Execution"
      };
      await apexApi.recordTrade(tradeData);
      onSuccess();
    } catch (e) { alert("Execution Failed"); } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="absolute inset-0" onClick={onClose} />
      <motion.div 
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        className="glass-card w-full max-w-lg rounded-[40px] p-8 pb-12 border border-white/10 relative z-10 flex flex-col bg-[#121214]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-black tracking-tight uppercase text-white">Record Trade</h2>
          <button onClick={onClose} className="p-3 bg-white/5 rounded-full hover:bg-white/10 transition-colors">
            <X size={20} className="text-white"/>
          </button>
        </div>

        <div className="flex w-full h-14 bg-white/5 rounded-[18px] p-1.5 mb-8 border border-white/5">
          <button onClick={() => setIsBuy(true)} className={`flex-1 rounded-xl font-black text-xs transition-all ${isBuy ? 'bg-[#00E676] text-black shadow-lg shadow-[#00E676]/20' : 'text-gray-500'}`}>BUY</button>
          <button onClick={() => setIsBuy(false)} className={`flex-1 rounded-xl font-black text-xs transition-all ${!isBuy ? 'bg-[#FF5252] text-white shadow-lg shadow-[#FF5252]/20' : 'text-gray-500'}`}>SELL</button>
        </div>

        <div className="relative mb-8 z-30">
          <label className="text-[10px] font-black text-gray-500 uppercase tracking-[3px] ml-1 mb-2 block">Asset</label>
          <div className="relative">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500" size={18}/>
            <input 
              className="w-full bg-white/5 border border-white/10 rounded-[22px] p-5 pl-14 outline-none focus:border-[#673ab7] transition-all font-bold text-white"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => setIsDropdownExpanded(true)}
            />
          </div>
          <AnimatePresence>
            {isDropdownExpanded && searchResults.length > 0 && searchQuery && !selectedSymbol && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="absolute top-[105%] left-0 right-0 bg-[#1a1a20] border border-white/10 rounded-3xl overflow-hidden shadow-2xl z-50">
                {searchResults.slice(0, 5).map((s) => (
                  <button key={s.symbol} onClick={() => { setSearchQuery(s.symbol); setSelectedSymbol(s.symbol); setPrice((s.price ?? 0).toString()); setIsDropdownExpanded(false); }} className="w-full flex items-center justify-between p-5 hover:bg-white/5 border-b border-white/5">
                    <div className="flex items-center gap-3">
                      <span className="font-black text-sm text-white">{s.symbol}</span>
                      {portfolioSymbols.includes(s.symbol) && <span className="bg-[#673ab7]/10 text-[#9e86ff] text-[9px] font-black px-2 py-0.5 rounded uppercase">Owned</span>}
                    </div>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="grid grid-cols-2 gap-5 mb-8">
          <input className="bg-white/5 border border-white/10 rounded-[22px] p-5 font-black text-white" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="Qty" />
          <input className="bg-white/5 border border-white/10 rounded-[22px] p-5 font-black text-white" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Price" />
        </div>

        <div className="mb-10">
          <label className="text-[10px] font-black text-gray-500 uppercase tracking-[3px] ml-1 mb-2 block">Date</label>
          <div className="relative">
            <Calendar className="absolute right-5 top-1/2 -translate-y-1/2" size={18} style={{ color: activeColor }}/>
            <input type="date" className="w-full bg-white/5 border border-white/10 rounded-[22px] p-5 font-black text-white" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
          </div>
        </div>

        <button onClick={validateAndExecute} disabled={loading} className="w-full py-6 rounded-[28px] font-black tracking-[4px] shadow-2xl" style={{ backgroundColor: activeColor, color: isBuy ? 'black' : 'white' }}>
          {loading ? "EXECUTING..." : `EXECUTE ${isBuy ? 'BUY' : 'SELL'}`}
        </button>
      </motion.div>
    </div>
  );
}

function TypewriterBox({ text }: { text: string }) {
    return (
        <div className="bg-[#673AB7]/5 border border-[#673AB7]/10 p-5 rounded-[28px] flex gap-4 items-start animate-in fade-in duration-1000">
            <Sparkles size={18} className="text-[#673AB7] shrink-0 mt-0.5" />
            <p className="text-sm font-bold text-gray-400 italic leading-relaxed">{text}</p>
        </div>
    );
}

function ThinkingAnimation() {
  return (
    <div className="h-64 flex flex-col items-center justify-center gap-6">
      <div className="relative">
        <div className="h-20 w-20 rounded-full border-[3px] border-[#673AB7]/10" />
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }} className="absolute inset-0 h-20 w-20 rounded-full border-[3px] border-t-[#673AB7] border-transparent" />
        <Sparkles className="absolute inset-0 m-auto text-[#673AB7] animate-pulse" size={32} />
      </div>
      <p className="text-xs font-black text-[#673AB7] uppercase tracking-[5px] animate-pulse">3 Brains Active</p>
    </div>
  );
}