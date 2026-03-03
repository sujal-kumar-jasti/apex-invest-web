'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ArrowLeft, TrendingUp, BarChart3, Globe, Gem, Loader2, RefreshCw } from 'lucide-react';
import { useStore } from '@/store';
import { apexApi, portfolioRepo } from '@/lib/api';
import { TrendingStockDto, StockSearchResult, CommodityDto, CommodityUiModel } from '@/types';

const COLORS = { GeminiPurple: '#673AB7', ProGreen: '#00E676', ProRed: '#FF5252' };

export default function ExplorePage() {
  const router = useRouter();
  const store = useStore();
  
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<StockSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Success State Data
  const [uiData, setUiData] = useState<{
    trending: TrendingStockDto[],
    indices: CommodityUiModel[],
    global: CommodityUiModel[],
    commodities: CommodityUiModel[]
  }>({ trending: [], indices: [], global: [], commodities: [] });

  // Safety ref to keep latest data for resilient falling back (latestCache equivalent)
  const dataRef = useRef(uiData);

  /**
   * --- RESILIENT MARKET DATA FETCH (Mirrors ViewModel) ---
   */
  const fetchMarketDataResilient = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsRefreshing(true);

    try {
      const liveRate = store.liveRate || 84.0;
      
      const [fetchedTrending, fetchedGlobal, fetchedCommodities] = await Promise.allSettled([
        apexApi.getTrending(),
        apexApi.getGlobalIndices(),
        apexApi.getCommodities()
      ]);

      // Map results safely
      const tData = fetchedTrending.status === 'fulfilled' ? fetchedTrending.value.data : null;
      const gData = fetchedGlobal.status === 'fulfilled' ? fetchedGlobal.value.data : null;
      const cData = fetchedCommodities.status === 'fulfilled' ? fetchedCommodities.value.data : null;

      // If network totally failed, don't update state (Resilient logic)
      if (!tData && !gData && !cData) return;

      const finalTrending = (tData && tData.length > 0) ? tData : dataRef.current.trending;
      
      // Process Global and Overview
      let rawGlobal: CommodityDto[] = (gData && gData.length > 0) ? gData : [];
      let rawComm: CommodityDto[] = (cData && cData.length > 0) ? cData : [];

      // Logic from fetchAndSaveMarketDataResilient (sorting type)
      const finalIndicesRaw: CommodityDto[] = [];
      const finalCommRaw: CommodityDto[] = [];
      
      rawComm.forEach(item => {
        if (item.type === "COMMODITY") finalCommRaw.push(item);
        else finalIndicesRaw.push(item);
      });

      // Update State with Processed UI Models
      const newState = {
        trending: finalTrending,
        indices: await portfolioRepo.processCommodities(finalIndicesRaw, liveRate),
        global: await portfolioRepo.processCommodities(rawGlobal, liveRate),
        commodities: await portfolioRepo.processCommodities(finalCommRaw, liveRate)
      };

      setUiData(newState);
      dataRef.current = newState;
    } catch (e) {
      console.error("Resilient update failed", e);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [store.liveRate]);

  // --- AUTO REFRESH (8 SECONDS) ---
  useEffect(() => {
    fetchMarketDataResilient(); // Initial load

    const interval = setInterval(() => {
      fetchMarketDataResilient(true);
    }, 8000);

    return () => clearInterval(interval);
  }, [fetchMarketDataResilient]);

  // --- SEARCH LOGIC (Debounced) ---
  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      if (searchQuery.length >= 2) {
        setIsSearching(true);
        try {
          const res = await apexApi.search(searchQuery);
          setSearchResults(res.data || []);
        } catch (e) { setSearchResults([]); }
        finally { setIsSearching(false); }
      } else { setSearchResults([]); }
    }, 500);
    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  return (
    <div className="min-h-screen pb-32 bg-[#08080a] text-white font-sans selection:bg-[#673ab7]/30">
      
      {/* APP BAR */}
      <header className="fixed top-0 left-0 right-0 z-40 p-6 bg-[#08080a]/80 backdrop-blur-xl border-b border-white/5 flex items-center gap-4">
        <button onClick={() => router.back()} className="h-12 w-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center active:scale-90 transition-all">
          <ArrowLeft size={20} className="text-gray-300" />
        </button>

        <div onClick={() => setShowSearch(true)} className="flex-1 flex items-center gap-3 bg-white/5 border border-white/10 h-12 px-5 rounded-2xl cursor-pointer hover:bg-white/8 transition-all">
          <Search size={18} className="text-[#673ab7]" />
          <span className="text-gray-500 text-sm font-medium">Search markets...</span>
        </div>
        
        <button onClick={() => fetchMarketDataResilient()} className={`h-12 w-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center active:scale-90 transition-all ${isRefreshing ? 'animate-spin' : ''}`}>
          <RefreshCw size={18} className="text-[#673ab7]" />
        </button>
      </header>

      {/* CONTENT */}
      <main className="pt-28 space-y-10">
        <Section title="Market Overview" icon={<BarChart3 size={16} />}>
          <HorizontalScrollRow>
            {loading ? <ShimmerCards count={4} /> : uiData.indices.map((item) => (
              <IndexCard key={item.symbol} item={item} onClick={() => router.push(`/stock/${item.symbol}`)} />
            ))}
          </HorizontalScrollRow>
        </Section>

        <Section title="Top Movers" icon={<TrendingUp size={16} />}>
          <HorizontalScrollRow>
            {loading ? <ShimmerCards count={4} /> : uiData.trending.map((item) => (
              <TrendingCard key={item.symbol} stock={item} onClick={() => router.push(`/stock/${item.symbol}`)} />
            ))}
          </HorizontalScrollRow>
        </Section>

        <Section title="Global Pulse" icon={<Globe size={16} />}>
          <HorizontalScrollRow>
            {loading ? <ShimmerCards count={4} /> : uiData.global.map((item) => (
              <IndexCard key={item.symbol} item={item} onClick={() => router.push(`/stock/${item.symbol}`)} />
            ))}
          </HorizontalScrollRow>
        </Section>

        <Section title="Commodities" icon={<Gem size={16} />}>
          <HorizontalScrollRow>
            {loading ? <ShimmerCards count={4} /> : uiData.commodities.map((item) => (
              <IndexCard key={item.symbol} item={item} onClick={() => router.push(`/stock/${item.symbol}`)} />
            ))}
          </HorizontalScrollRow>
        </Section>
      </main>

      {/* SEARCH MODAL */}
      <AnimatePresence>
        {showSearch && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-[#08080a] flex flex-col">
            <div className="p-6 flex items-center gap-4 border-b border-white/5">
              <button onClick={() => setShowSearch(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors"><ArrowLeft size={24} /></button>
              <input autoFocus placeholder="Ticker or Company..." className="flex-1 bg-transparent text-xl font-black outline-none placeholder:text-gray-700 uppercase" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              {isSearching && <Loader2 className="animate-spin text-[#673ab7]" size={20} />}
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {searchResults.map((stock) => (
                <div key={stock.symbol} onClick={() => router.push(`/stock/${stock.symbol}`)} className="bg-white/3 border border-white/5 p-5 rounded-3xl flex items-center justify-between cursor-pointer hover:bg-white/6 transition-all">
                  <div>
                    <p className="font-black text-lg">{stock.symbol}</p>
                    <p className="text-xs text-gray-500 font-bold truncate max-w-50">{stock.name}</p>
                  </div>
                  <span className="text-[10px] font-black px-3 py-1 bg-[#673ab7]/20 text-[#673ab7] rounded-full uppercase tracking-widest">{stock.exch}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- CARD COMPONENTS ---

function Section({ title, icon, children }: any) {
  return (
    <div className="space-y-4">
      <div className="px-8 flex items-center gap-2">
        <div className="text-[#673ab7]">{icon}</div>
        <h2 className="text-[11px] font-black uppercase tracking-[2px] text-gray-500">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function HorizontalScrollRow({ children }: any) {
  return <div className="flex overflow-x-auto gap-4 px-8 no-scrollbar snap-x snap-mandatory">{children}</div>;
}

function IndexCard({ item, onClick }: { item: CommodityUiModel, onClick: () => void }) {
  return (
    <motion.div whileTap={{ scale: 0.96 }} onClick={onClick} className="min-w-36.25 h-28 bg-white/2 border border-white/5 rounded-[28px] p-5 flex flex-col justify-between snap-start">
      <span className="text-[10px] font-bold text-gray-500 uppercase truncate">{item.name}</span>
      <div>
        <p className="text-base font-black tracking-tighter">{item.value}</p>
        <p className="text-[10px] font-black" style={{ color: item.isPositive ? COLORS.ProGreen : COLORS.ProRed }}>{item.changePercent}</p>
      </div>
    </motion.div>
  );
}

function TrendingCard({ stock, onClick }: { stock: TrendingStockDto, onClick: () => void }) {
  const isPos = (stock.changePercent || 0) >= 0;
  const currencySym = stock.currency === "USD" ? "$" : "₹";
  return (
    <motion.div whileTap={{ scale: 0.96 }} onClick={onClick} className="min-w-36.25 h-28 bg-[#673ab7]/10 border border-[#673ab7]/20 rounded-[28px] p-5 flex flex-col justify-between snap-start">
      <span className="text-[12px] font-black tracking-tighter truncate uppercase">{stock.symbol}</span>
      <div>
        <p className="text-sm font-bold">{currencySym}{stock.price?.toLocaleString()}</p>
        <p className="text-[10px] font-black" style={{ color: isPos ? COLORS.ProGreen : COLORS.ProRed }}>{isPos ? '+' : ''}{stock.changePercent?.toFixed(2)}%</p>
      </div>
    </motion.div>
  );
}

function ShimmerCards({ count }: { count: number }) {
  return (
    <>
      {Array(count).fill(0).map((_, i) => (
        <div key={i} className="min-w-36.25 h-28 bg-white/5 border border-white/5 rounded-[28px] animate-pulse" />
      ))}
    </>
  );
}