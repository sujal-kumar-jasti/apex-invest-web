'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation'; // 🌟 Added for routing
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Bookmark, BookmarkPlus, TrendingUp, BarChart2, Info
} from 'lucide-react';
import { useStore } from '@/store';
import { StockDetailsResponse, CandlePoint, YearValue, StockNews } from '@/types';
import { apexApi, portfolioRepo } from '@/lib/api';

// --- PREMIUM THEME COLORS ---
const COLORS = {
  GeminiPurple: '#673AB7',
  SurfaceDark: '#16161A',
  SurfaceLight: '#F7F7F9',
  ProGreen: '#00C853',
  ProRed: '#FF3D00',
  TextWhite: '#F0F0F0',
  TextGray: '#9E9E9E',
  BorderDark: '#2C2C35',
  BorderLight: '#E0E0E0',
  InfoBlue: '#2196F3',
};

enum ChartType { LINE, CANDLE }

// --- EXTENSION FORMATTERS ---
const fmt = (num: number) => num.toFixed(2);
const fmtPct = (num: number) => `${num.toFixed(2)}%`;
const fmtCompact = (num: number) => {
  const abs = Math.abs(num);
  if (abs >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 10_000_000) return `${(num / 10_000_000).toFixed(2)}Cr`; 
  if (abs >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
  return fmt(num);
};

// --- PROPS ---
interface StockDetailScreenProps {
  symbol: string;
  onBack: () => void;
  onNavigateToStock: (symbol: string) => void;
  onOptionsDateClick: (date: string) => void;
  isConnected: boolean;
}

export default function StockDetailScreen({
  symbol,
  onBack,
  onNavigateToStock,
  isConnected
}: StockDetailScreenProps) {
  
  const router = useRouter(); // 🌟 Initialized router for redirection

  // --- 1. STORE & CURRENCY SETUP ---
  const store = useStore();
  const watchlist = store.watchlist;
  const isFollowing = useMemo(() => watchlist.some(w => w.symbol === symbol), [watchlist, symbol]);
  const isDark = store.themeMode !== 1; 

  const isUsd = store.isUsd;
  const liveRate = store.liveRate || 84.0;
  const isIndianStock = symbol.endsWith('.NS') || symbol.endsWith('.BO');
  const activeCurrencySym = isUsd ? '$' : '₹';

  const convert = useCallback((val: number, checkInd: boolean = isIndianStock) => {
    if (!val) return 0;
    if (isUsd) return checkInd ? val / liveRate : val;
    return checkInd ? val : val * liveRate;
  }, [isUsd, liveRate, isIndianStock]);

  // --- 2. LOCAL STATE ---
  const [selectedTab, setSelectedTab] = useState(0);
  const [currentRange, setCurrentRange] = useState("1D");
  const [chartType, setChartType] = useState<ChartType>(ChartType.LINE);

  const [displayData, setDisplayData] = useState<StockDetailsResponse | null>(null);
  const [isFetching, setIsFetching] = useState(true);
  
  const isLoading = isFetching && !displayData;
  const isPositive = displayData ? displayData.change >= 0 : true;

  // --- 3. REPOSITORY STREAM ENGINE ---
  useEffect(() => {
    let isMounted = true;
    setIsFetching(true);

    const loadData = async () => {
      try {
        const stream = portfolioRepo.getFullStockDetailsStream(symbol, currentRange, false);
        for await (const chunk of stream) {
          if (!isMounted) break;
          if (chunk.result) {
            setDisplayData(chunk.result);
          }
          if (chunk.isComplete) {
            setIsFetching(false);
          }
        }
      } catch (error) {
        console.error(`[Repository Error] Failed to load ${symbol}:`, error);
        if (isMounted) setIsFetching(false);
      }
    };

    loadData();

    let pollInterval: NodeJS.Timeout;
    if (isConnected) {
      pollInterval = setInterval(async () => {
        try {
          await portfolioRepo.fetchAndUpdatePrice(symbol);
          if (isMounted) {
            const stream = portfolioRepo.getFullStockDetailsStream(symbol, currentRange, false);
            for await (const chunk of stream) {
              if (chunk.isComplete && chunk.result && isMounted) {
                setDisplayData(chunk.result);
              }
            }
          }
        } catch (e) {}
      }, 8000);
    }

    return () => {
      isMounted = false;
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [symbol, currentRange, isConnected]);

  // --- 4. DATA CONVERSION (Handles USD/INR Toggle) ---
  const safeData = useMemo(() => {
    const rawData = displayData || {
      symbol, name: "", price: 0, change: 0, changePercent: 0, currency: "USD",
      prevClose: 0, open: 0, dayHigh: 0, dayLow: 0, yearHigh: 0, yearLow: 0,
      candles: [], similarStocks: [], news: []
    } as unknown as StockDetailsResponse;

    return {
      ...rawData,
      price: convert(rawData.price),
      change: convert(rawData.change), 
      prevClose: convert(rawData.prevClose),
      open: convert(rawData.open),
      dayHigh: convert(rawData.dayHigh),
      dayLow: convert(rawData.dayLow),
      yearHigh: convert(rawData.yearHigh),
      yearLow: convert(rawData.yearLow),
      candles: (rawData.candles || []).map(c => ({
        ...c,
        open: convert(c.open),
        high: convert(c.high),
        low: convert(c.low),
        close: convert(c.close)
      })),
      similarStocks: (rawData.similarStocks || []).map(s => ({
        ...s,
        price: convert(s.price, s.symbol.endsWith('.NS') || s.symbol.endsWith('.BO')),
        market_cap: s.market_cap ? convert(s.market_cap, s.symbol.endsWith('.NS') || s.symbol.endsWith('.BO')) : s.market_cap
      }))
    };
  }, [displayData, convert, symbol]);

  // --- 5. CANDLE TAIL UPDATE ---
  const displayCandles = useMemo(() => {
    if (safeData.candles.length > 0 && safeData.price > 0) {
      const last = safeData.candles[safeData.candles.length - 1];
      const updatedLast = {
        ...last,
        close: safeData.price,
        high: Math.max(last.high, safeData.price),
        low: Math.min(last.low, safeData.price)
      };
      return [...safeData.candles.slice(0, -1), updatedLast];
    }
    return safeData.candles;
  }, [safeData.candles, safeData.price]);

  const handleToggleWatchlist = () => {
    if (isFollowing) {
      store.setWatchlist(watchlist.filter(w => w.symbol !== symbol));
    } else {
      store.setWatchlist([...watchlist, { symbol, lastPrice: displayData?.price || 0 }]);
    }
  };

  /**
   * 🌟 Redirection handler for Options Chain
   */
  const handleOptionsDateRedirect = (date: string) => {
    router.push(`/stock/${symbol}/options/${date}`);
  };

  const bgColor = isDark ? COLORS.SurfaceDark : '#FFFFFF';
  const textColor = isDark ? COLORS.TextWhite : '#000000';

  return (
    <div className="flex flex-col h-screen overflow-y-auto" style={{ backgroundColor: bgColor, color: textColor }}>
      
      {/* Top Bar */}
      <div className="sticky top-0 z-50 flex items-center justify-between px-6 py-4" style={{ backgroundColor: bgColor }}>
        <button 
          onClick={onBack}
          className="flex items-center justify-center w-10 h-10 rounded-full border transition-colors"
          style={{ 
            backgroundColor: isDark ? COLORS.SurfaceDark : COLORS.SurfaceLight,
            borderColor: isDark ? COLORS.BorderDark : COLORS.BorderLight 
          }}
        >
          <ArrowLeft size={20} color={textColor} />
        </button>
        <h1 className="text-xl font-bold">{symbol}</h1>
        <button 
          onClick={handleToggleWatchlist}
          className="flex items-center justify-center w-10 h-10 rounded-full border transition-colors"
          style={{ 
            backgroundColor: isFollowing ? COLORS.GeminiPurple : (isDark ? COLORS.SurfaceDark : COLORS.SurfaceLight),
            borderColor: isFollowing ? COLORS.GeminiPurple : (isDark ? COLORS.BorderDark : COLORS.BorderLight) 
          }}
        >
          {isFollowing ? (
            <Bookmark size={20} color="#FFFFFF" fill="#FFFFFF" />
          ) : (
            <BookmarkPlus size={20} color={textColor} />
          )}
        </button>
      </div>

      <div className="flex-1 pb-20">
        <HeaderPriceSection data={safeData} isPositive={isPositive} isDark={isDark} currencySym={activeCurrencySym} />

        <div className="h-6" />

        <ChartControls 
          currentRange={currentRange} 
          currentType={chartType} 
          isDark={isDark} 
          onRangeChange={setCurrentRange} 
          onTypeChange={setChartType} 
        />

        <div className="h-4" />

        <div className="w-full h-80 relative px-0 md:px-6">
          {(isLoading || isFetching) && displayCandles.length === 0 ? (
            <ChartOnlyShimmer isDark={isDark} />
          ) : (
            <InteractiveChart 
              candles={displayCandles} 
              type={chartType} 
              isPositive={isPositive} 
              isDark={isDark} 
            />
          )}
        </div>

        <div className="h-6" />

        <PremiumTabs selected={selectedTab} isDark={isDark} onSelect={setSelectedTab} />

        <div className="h-5" />

        <div className="px-6 flex flex-col gap-4">
          {selectedTab === 0 && (
            <>
              <AboutSection data={safeData} isDark={isDark} isLoading={isFetching && !safeData.description} />
              <OverviewSection data={safeData} isDark={isDark} isLoading={isFetching && !safeData.fundamentals} />
            </>
          )}
          {selectedTab === 1 && (
            <>
              <FinancialsSection data={safeData} isDark={isDark} isLoading={isFetching && !safeData.financials} />
              <HoldingsSection data={safeData} isDark={isDark} isLoading={isFetching && !safeData.shareholding} />
              <EsgSection data={safeData} isDark={isDark} isLoading={isFetching && !safeData.esgData} />
            </>
          )}
          {selectedTab === 2 && (
            <>
              <AnalystSection data={safeData} isDark={isDark} isLoading={isFetching && !safeData.analystData} />
              <PeersSection data={safeData} isDark={isDark} isLoading={isFetching && safeData.similarStocks.length === 0} onPeerClick={onNavigateToStock} currencySym={activeCurrencySym} />
            </>
          )}
          {selectedTab === 3 && <OptionsSection data={safeData} isDark={isDark} isLoading={isFetching && !safeData.optionsExpirations} onOptionsDateClick={handleOptionsDateRedirect} />}
          {selectedTab === 4 && <NewsSection data={safeData} isDark={isDark} isLoading={isFetching && safeData.news.length === 0} />}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// SECTIONS & COMPONENTS
// ==========================================

const HeaderPriceSection = ({ data, isPositive, isDark, currencySym }: { data: StockDetailsResponse, isPositive: boolean, isDark: boolean, currencySym: string }) => {
  if (data.price === 0) return <HeaderShimmer isDark={isDark} />;

  const color = isPositive ? COLORS.ProGreen : COLORS.ProRed;
  const textColor = isDark ? COLORS.TextWhite : '#000000';

  return (
    <div className="px-6 flex flex-col">
      <span className="text-sm font-medium" style={{ color: COLORS.TextGray }}>
        {data.name || "Loading..."}
      </span>
      <div className="flex items-end mt-1">
        <span className="text-4xl font-bold tabular-nums tracking-tight" style={{ color: textColor }}>
          {currencySym}{fmt(data.price)}
        </span>
      </div>
      <div className="flex items-center mt-1 text-base font-semibold tabular-nums" style={{ color }}>
        {isPositive ? <TrendingUp size={16} className="mr-1" /> : <BarChart2 size={16} className="mr-1" />}
        <span>{isPositive ? '+' : ''}{fmt(data.change)}</span>
        <span className="mx-1">(</span>
        <span>{fmt(data.changePercent)}%</span>
        <span>)</span>
      </div>
    </div>
  );
};

const ChartControls = ({ 
  currentRange, currentType, isDark, onRangeChange, onTypeChange 
}: { 
  currentRange: string, currentType: ChartType, isDark: boolean, onRangeChange: (r: string) => void, onTypeChange: (t: ChartType) => void 
}) => {
  const ranges = ["1D", "1W", "1M", "1Y", "5Y", "MAX"];
  
  return (
    <div className="flex items-center justify-between px-6 w-full">
      <div className="flex space-x-1">
        {ranges.map(range => {
          const isSelected = range === currentRange;
          return (
            <button
              key={range}
              onClick={() => onRangeChange(range)}
              className="px-3 py-1.5 rounded-full text-xs font-bold transition-colors"
              style={{
                backgroundColor: isSelected ? COLORS.GeminiPurple : 'transparent',
                color: isSelected ? '#FFF' : COLORS.TextGray
              }}
            >
              {range}
            </button>
          );
        })}
      </div>
      <div 
        className="flex items-center rounded-full p-0.5"
        style={{ backgroundColor: isDark ? COLORS.SurfaceDark : '#EEEEEE' }}
      >
        <button 
          onClick={() => onTypeChange(ChartType.LINE)}
          className="w-8 h-8 flex items-center justify-center rounded-full transition-colors"
          style={{ backgroundColor: currentType === ChartType.LINE ? COLORS.GeminiPurple : 'transparent' }}
        >
          <TrendingUp size={16} color={currentType === ChartType.LINE ? '#FFF' : COLORS.TextGray} />
        </button>
        <button 
          onClick={() => onTypeChange(ChartType.CANDLE)}
          className="w-8 h-8 flex items-center justify-center rounded-full transition-colors"
          style={{ backgroundColor: currentType === ChartType.CANDLE ? COLORS.GeminiPurple : 'transparent' }}
        >
          <BarChart2 size={16} color={currentType === ChartType.CANDLE ? '#FFF' : COLORS.TextGray} />
        </button>
      </div>
    </div>
  );
};

const InteractiveChart = ({ candles, type, isPositive, isDark }: { candles: CandlePoint[], type: ChartType, isPositive: boolean, isDark: boolean }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [touchX, setTouchX] = useState<number | null>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || candles.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    
    ctx.clearRect(0, 0, w, h);

    const priceHeight = h * 0.75;
    const volHeight = h * 0.40;

    const maxP = Math.max(...candles.map(c => c.high));
    const minP = Math.min(...candles.map(c => c.low));
    const pricePadding = (maxP - minP) * 0.05;
    const chartMax = maxP + pricePadding;
    const chartMin = minP - pricePadding;
    const rangeP = Math.max(chartMax - chartMin, 0.1);

    const maxV = Math.max(...candles.map(c => c.volume)) || 1;
    const stepX = w / candles.length;
    const mainColor = isPositive ? COLORS.ProGreen : COLORS.ProRed;

    candles.forEach((c, i) => {
      const barH = (c.volume / maxV) * volHeight;
      const x = i * stepX + 1;
      const y = h - barH;
      const width = Math.max(stepX - 2, 1);
      ctx.fillStyle = c.close >= c.open ? `${COLORS.ProGreen}4D` : `${COLORS.ProRed}4D`; 
      ctx.fillRect(x, y, width, barH);
    });

    if (type === ChartType.LINE) {
      const grad = ctx.createLinearGradient(0, 0, 0, priceHeight);
      grad.addColorStop(0, `${mainColor}4D`); 
      grad.addColorStop(1, `${mainColor}00`); 

      ctx.beginPath();
      candles.forEach((c, i) => {
        const x = i * stepX + stepX / 2;
        const y = priceHeight - ((c.close - minP) / rangeP) * priceHeight;
        if (i === 0) {
          ctx.moveTo(x, priceHeight);
          ctx.lineTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.lineTo(w, priceHeight);
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.beginPath();
      candles.forEach((c, i) => {
        const x = i * stepX + stepX / 2;
        const y = priceHeight - ((c.close - minP) / rangeP) * priceHeight;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = mainColor;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();

    } else {
      const candleW = Math.max(stepX * 0.6, 2);
      candles.forEach((c, i) => {
        const x = i * stepX + stepX / 2;
        const highY = priceHeight - ((c.high - minP) / rangeP) * priceHeight;
        const lowY = priceHeight - ((c.low - minP) / rangeP) * priceHeight;
        const openY = priceHeight - ((c.open - minP) / rangeP) * priceHeight;
        const closeY = priceHeight - ((c.close - minP) / rangeP) * priceHeight;
        const cColor = c.close >= c.open ? COLORS.ProGreen : COLORS.ProRed;

        ctx.beginPath();
        ctx.moveTo(x, highY);
        ctx.lineTo(x, lowY);
        ctx.strokeStyle = cColor;
        ctx.lineWidth = 1;
        ctx.stroke();

        const bodyTop = Math.min(openY, closeY);
        const bodyH = Math.max(Math.abs(openY - closeY), 1);
        ctx.fillStyle = cColor;
        ctx.fillRect(x - candleW / 2, bodyTop, candleW, bodyH);
      });
    }

    if (touchX !== null) {
      let idx = Math.floor(touchX / stepX);
      idx = Math.max(0, Math.min(idx, candles.length - 1));
      const pt = candles[idx];
      const xPos = idx * stepX + stepX / 2;
      const yPos = priceHeight - ((pt.close - minP) / rangeP) * priceHeight;

      ctx.beginPath();
      ctx.setLineDash([5, 5]);
      ctx.moveTo(xPos, 0);
      ctx.lineTo(xPos, h);
      ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.beginPath();
      ctx.arc(xPos, yPos, 5, 0, 2 * Math.PI);
      ctx.fillStyle = mainColor;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(xPos, yPos, 2, 0, 2 * Math.PI);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();

      const lines = [pt.time, `Price: ${fmt(pt.close)}`, `Vol: ${fmtCompact(pt.volume)}` ];
      ctx.font = '600 12px sans-serif';
      const maxTextW = Math.max(...lines.map(l => ctx.measureText(l).width));
      const boxW = maxTextW + 16;
      const boxH = lines.length * 16 + 12;
      
      let boxX = xPos - boxW / 2;
      if (boxX < 0) boxX = 0;
      if (boxX + boxW > w) boxX = w - boxW;

      ctx.fillStyle = isDark ? COLORS.SurfaceDark : COLORS.SurfaceLight;
      ctx.beginPath();
      ctx.roundRect(boxX, 10, boxW, boxH, 6);
      ctx.fill();
      ctx.strokeStyle = isDark ? COLORS.BorderDark : COLORS.BorderLight;
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = isDark ? COLORS.TextWhite : '#000000';
      lines.forEach((line, i) => { ctx.fillText(line, boxX + 8, 26 + (i * 16)); });
    }
  }, [candles, type, isPositive, isDark, touchX]);

  useEffect(() => {
    draw();
    window.addEventListener('resize', draw);
    return () => window.removeEventListener('resize', draw);
  }, [draw]);

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) setTouchX(e.clientX - rect.left);
  };

  return (
    <div className="w-full h-full" ref={containerRef}>
      <canvas 
        ref={canvasRef}
        className="w-full h-full outline-none"
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerMove}
        onPointerUp={() => setTouchX(null)}
        onPointerLeave={() => setTouchX(null)}
        style={{ touchAction: 'none' }} 
      />
    </div>
  );
};

const PremiumTabs = ({ selected, isDark, onSelect }: { selected: number, isDark: boolean, onSelect: (i: number) => void }) => {
  const tabs = ["Overview", "Financials", "Wall Street", "Options", "News"];
  return (
    <div className="flex justify-between w-full p-1 rounded-full mx-6" style={{ backgroundColor: isDark ? COLORS.SurfaceDark : COLORS.SurfaceLight, width: 'calc(100% - 48px)' }}>
      {tabs.map((title, index) => {
        const isSelected = selected === index;
        return (
          <button key={title} onClick={() => onSelect(index)} className="relative flex-1 h-9 flex items-center justify-center rounded-full text-[11px] font-bold z-10 truncate px-1 transition-colors" style={{ color: isSelected ? '#FFFFFF' : COLORS.TextGray }}>
            {isSelected && (
              <motion.div layoutId="activeTab" className="absolute inset-0 rounded-full -z-10" style={{ backgroundColor: COLORS.GeminiPurple }} transition={{ type: "spring", stiffness: 300, damping: 30 }} />
            )}
            {title}
          </button>
        );
      })}
    </div>
  );
};

const PremiumCard = ({ title, isDark, children }: { title: string, isDark: boolean, children: React.ReactNode }) => (
  <div className="w-full rounded-[30px] border p-5 flex flex-col" style={{ backgroundColor: isDark ? COLORS.SurfaceDark : '#FFFFFF', borderColor: isDark ? COLORS.BorderDark : COLORS.BorderLight }}>
    <h3 className="text-lg font-bold" style={{ color: isDark ? COLORS.TextWhite : '#000000' }}>{title}</h3>
    <div className="mt-4 flex flex-col">{children}</div>
  </div>
);

const EmptyStateMessage = ({ message }: { message: string }) => (
  <div className="w-full py-4 flex flex-col items-center justify-center">
    <Info size={32} color={COLORS.TextGray} opacity={0.5} />
    <span className="mt-2 text-[13px] font-medium text-center" style={{ color: COLORS.TextGray }}>{message}</span>
  </div>
);

const FundamentalItem = ({ label, value, isDark }: { label: string, value: string, isDark: boolean }) => (
  <div className="w-25 flex flex-col">
    <span className="text-[11px]" style={{ color: COLORS.TextGray }}>{label}</span>
    <span className="text-sm font-bold mt-1" style={{ color: isDark ? COLORS.TextWhite : '#000000' }}>{value}</span>
  </div>
);

const PerformanceBar = ({ label, low, high, current, isDark }: { label: string, low: number, high: number, current: number, isDark: boolean }) => {
  const progress = high > low ? Math.max(0, Math.min(1, (current - low) / (high - low))) * 100 : 0;
  return (
    <div className="flex flex-col">
      <div className="flex justify-between w-full">
        <span className="text-xs font-bold" style={{ color: isDark ? COLORS.TextWhite : '#000000' }}>{label}</span>
        <span className="text-[11px]" style={{ color: COLORS.TextGray }}>{fmt(low)} - {fmt(high)}</span>
      </div>
      <div className="w-full h-1.5 rounded-full mt-2 relative overflow-hidden" style={{ backgroundColor: isDark ? COLORS.SurfaceDark : '#E0E0E0' }}>
        <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 1, ease: "easeOut" }} className="absolute top-0 left-0 h-full rounded-full" style={{ backgroundColor: COLORS.GeminiPurple }} />
      </div>
    </div>
  );
};

const AboutSection = ({ data, isDark, isLoading }: { data: StockDetailsResponse, isDark: boolean, isLoading: boolean }) => {
  if (isLoading) return <InfoSectionShimmer isDark={isDark} />;
  if (!data.description && !data.sector) {
    return <PremiumCard title="About Company" isDark={isDark}><EmptyStateMessage message="Company details are currently unavailable." /></PremiumCard>;
  }
  return (
    <PremiumCard title="About Company" isDark={isDark}>
      {(data.sector || data.industry) && (
        <div className="w-full rounded-[30px] p-3 flex mb-4" style={{ backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : COLORS.SurfaceLight }}>
          {data.sector && <div className="flex-1 flex flex-col"><span className="text-[11px]" style={{ color: COLORS.TextGray }}>Sector</span><span className="text-sm font-bold" style={{ color: isDark ? COLORS.TextWhite : '#000000' }}>{data.sector}</span></div>}
          {data.industry && <div className="flex-1 flex flex-col"><span className="text-[11px]" style={{ color: COLORS.TextGray }}>Industry</span><span className="text-sm font-bold" style={{ color: isDark ? COLORS.TextWhite : '#000000' }}>{data.industry}</span></div>}
        </div>
      )}
      {data.description && <p className="text-sm leading-5.5" style={{ color: isDark ? 'rgba(240,240,240,0.8)' : 'rgba(0,0,0,0.8)' }}>{data.description}</p>}
    </PremiumCard>
  );
};

const OverviewSection = ({ data, isDark, isLoading }: { data: StockDetailsResponse, isDark: boolean, isLoading: boolean }) => {
  if (isLoading) return <InfoSectionShimmer isDark={isDark} />;
  if (!data.fundamentals) {
    return <PremiumCard title="Fundamentals & Performance" isDark={isDark}><EmptyStateMessage message="Fundamental data is currently unavailable." /></PremiumCard>;
  }
  const f = data.fundamentals;
  return (
    <PremiumCard title="Fundamentals & Performance" isDark={isDark}>
      <PerformanceBar label="Day's Range" low={data.dayLow} high={data.dayHigh} current={data.price} isDark={isDark} />
      <div className="h-4" />
      <PerformanceBar label="52-Week Range" low={data.yearLow} high={data.yearHigh} current={data.price} isDark={isDark} />
      <div className="w-full h-px my-6" style={{ backgroundColor: isDark ? COLORS.BorderDark : COLORS.BorderLight }} />
      <div className="flex justify-between w-full mb-4">
        <FundamentalItem label="Mkt Cap" value={f.market_cap_class || "-"} isDark={isDark} />
        <FundamentalItem label="P/E Ratio" value={f.pe_ratio ? fmt(f.pe_ratio) : "-"} isDark={isDark} />
        <FundamentalItem label="Div Yield" value={f.dividend_yield ? fmtPct(f.dividend_yield) : "-"} isDark={isDark} />
      </div>
      <div className="flex justify-between w-full mb-4">
        <FundamentalItem label="ROE" value={f.roe ? fmtPct(f.roe) : "-"} isDark={isDark} />
        <FundamentalItem label="EPS" value={f.eps ? fmt(f.eps) : "-"} isDark={isDark} />
        <FundamentalItem label="P/B Ratio" value={f.pb_ratio ? fmt(f.pb_ratio) : "-"} isDark={isDark} />
      </div>
      <div className="flex justify-between w-full">
        <FundamentalItem label="Debt/Eq" value={f.debt_to_equity ? fmt(f.debt_to_equity) : "-"} isDark={isDark} />
        <FundamentalItem label="Book Val" value={f.book_value ? fmt(f.book_value) : "-"} isDark={isDark} />
        <FundamentalItem label="Ind P/E" value={f.industry_pe ? fmt(f.industry_pe) : "-"} isDark={isDark} />
      </div>
    </PremiumCard>
  );
};

const FinancialBarChart = ({ title, data, color, isDark }: { title: string, data: YearValue[], color: string, isDark: boolean }) => {
  if (data.length === 0) return null;
  const max = Math.max(...data.map(d => Math.abs(d.value))) || 1;
  return (
    <div className="flex flex-col">
      <h4 className="text-sm font-bold mb-3" style={{ color: isDark ? COLORS.TextWhite : '#000000' }}>{title}</h4>
      <div className="flex flex-col gap-2">
        {data.slice(-4).map((item, i) => {
          const w = Math.max(0.1, Math.abs(item.value) / max) * 100;
          return (
            <div key={i} className="flex items-center w-full">
              <span className="text-[11px] w-9" style={{ color: COLORS.TextGray }}>{item.period}</span>
              <div className="flex-1 h-5 mr-2">
                <motion.div initial={{ width: 0 }} animate={{ width: `${w}%` }} className="h-full rounded-r-sm" style={{ backgroundColor: item.value >= 0 ? color : COLORS.ProRed }} />
              </div>
              <span className="text-[11px] font-bold w-12 text-right" style={{ color: isDark ? COLORS.TextWhite : '#000000' }}>{fmtCompact(item.value)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const FinancialsSection = ({ data, isDark, isLoading }: { data: StockDetailsResponse, isDark: boolean, isLoading: boolean }) => {
  if (isLoading) return <InfoSectionShimmer isDark={isDark} />;
  if (!data.financials) {
    return <PremiumCard title="Financial Trends" isDark={isDark}><EmptyStateMessage message="Financial data is currently unavailable." /></PremiumCard>;
  }
  const { revenue, profit, net_worth } = data.financials;
  return (
    <PremiumCard title="Financial Trends" isDark={isDark}>
      {revenue.length > 0 && <FinancialBarChart title="Revenue" data={revenue} color={COLORS.GeminiPurple} isDark={isDark} />}
      {revenue.length > 0 && profit.length > 0 && <div className="h-6" />}
      {profit.length > 0 && <FinancialBarChart title="Net Profit" data={profit} color={COLORS.ProGreen} isDark={isDark} />}
      {net_worth.length > 0 && <div className="h-6" />}
      {net_worth.length > 0 && <FinancialBarChart title="Net Worth" data={net_worth} color={COLORS.InfoBlue} isDark={isDark} />}
    </PremiumCard>
  );
};

const SVGDonut = ({ segments }: { segments: { value: number, color: string }[] }) => {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  let cumulativeOffset = 0;
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  return (
    <svg width="100" height="100" viewBox="0 0 100 100" className="-rotate-90">
      {segments.map((seg, i) => {
        if (seg.value === 0) return null;
        const strokeDasharray = `${(seg.value / total) * circumference} ${circumference}`;
        const strokeDashoffset = -cumulativeOffset;
        cumulativeOffset += (seg.value / total) * circumference;
        return <circle key={i} cx="50" cy="50" r={radius} fill="transparent" stroke={seg.color} strokeWidth="15" strokeDasharray={strokeDasharray} strokeDashoffset={strokeDashoffset} className="transition-all duration-1000 ease-out" />;
      })}
    </svg>
  );
};

const HoldingsSection = ({ data, isDark, isLoading }: { data: StockDetailsResponse, isDark: boolean, isLoading: boolean }) => {
  if (isLoading) return <InfoSectionShimmer isDark={isDark} />;
  if (!data.shareholding) {
    return <PremiumCard title="Shareholding" isDark={isDark}><EmptyStateMessage message="Shareholding patterns are not disclosed." /></PremiumCard>;
  }
  const s = data.shareholding;
  const total = s.promoters + s.institutions + s.retail;
  return (
    <PremiumCard title="Shareholding" isDark={isDark}>
      {total <= 0 ? <EmptyStateMessage message="Shareholding patterns are not disclosed." /> : (
        <div className="flex items-center">
          <div className="w-25 h-25"><SVGDonut segments={[{ value: s.promoters, color: COLORS.GeminiPurple }, { value: s.institutions, color: COLORS.ProGreen }, { value: s.retail, color: '#9E9E9E' }]} /></div>
          <div className="w-6" />
          <div className="flex flex-col gap-2">
            <HoldingLegend label="Promoters" value={s.promoters} color={COLORS.GeminiPurple} isDark={isDark} />
            <HoldingLegend label="Institutions" value={s.institutions} color={COLORS.ProGreen} isDark={isDark} />
            <HoldingLegend label="Public" value={s.retail} color="#9E9E9E" isDark={isDark} />
          </div>
        </div>
      )}
    </PremiumCard>
  );
};

const HoldingLegend = ({ label, value, color, isDark }: { label: string, value: number, color: string, isDark: boolean }) => (
  <div className="flex items-center"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} /><div className="w-2" /><div className="flex flex-col"><span className="text-[11px]" style={{ color: COLORS.TextGray }}>{label}</span><span className="text-[13px] font-bold" style={{ color: isDark ? COLORS.TextWhite : '#000000' }}>{fmt(value)}%</span></div></div>
);

const EsgSection = ({ data, isDark, isLoading }: { data: StockDetailsResponse, isDark: boolean, isLoading: boolean }) => {
  if (isLoading) return <InfoSectionShimmer isDark={isDark} />;
  if (!data.esgData) {
    return <PremiumCard title="ESG Sustainability" isDark={isDark}><EmptyStateMessage message="ESG sustainability scores are not reported." /></PremiumCard>;
  }
  const esg = data.esgData;
  return (
    <PremiumCard title="ESG Sustainability" isDark={isDark}>
      {!esg.total_esg || esg.total_esg <= 0 ? <EmptyStateMessage message="ESG sustainability scores are not reported." /> : (
        <div className="flex items-center">
          <div className="relative w-20 h-20 flex items-center justify-center">
            <svg width="80" height="80" viewBox="0 0 80 80" className="-rotate-90 absolute inset-0"><circle cx="40" cy="40" r="32" fill="transparent" stroke={isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"} strokeWidth="10" /><circle cx="40" cy="40" r="32" fill="transparent" stroke={esg.total_esg < 20 ? COLORS.ProGreen : esg.total_esg < 30 ? '#FFC107' : COLORS.ProRed} strokeWidth="10" strokeLinecap="round" strokeDasharray={`${(esg.total_esg / 100) * (2 * Math.PI * 32)} ${2 * Math.PI * 32}`} /></svg>
            <span className="text-lg font-black" style={{ color: isDark ? COLORS.TextWhite : '#000000' }}>{fmt(esg.total_esg)}</span>
          </div>
          <div className="w-6" />
          <div className="flex flex-col gap-2"><FundamentalItem label="Environment" value={esg.environment_score ? fmt(esg.environment_score) : "-"} isDark={isDark} /><FundamentalItem label="Social" value={esg.social_score ? fmt(esg.social_score) : "-"} isDark={isDark} /><FundamentalItem label="Governance" value={esg.governance_score ? fmt(esg.governance_score) : "-"} isDark={isDark} /></div>
        </div>
      )}
    </PremiumCard>
  );
};

const AnalystSection = ({ data, isDark, isLoading }: { data: StockDetailsResponse, isDark: boolean, isLoading: boolean }) => {
  if (isLoading) return <InfoSectionShimmer isDark={isDark} />;
  const ad = data.analystData;
  if (!ad) {
    return <PremiumCard title="Wall Street Targets" isDark={isDark}><EmptyStateMessage message="No analyst coverage available for this stock." /></PremiumCard>;
  }
  return (
    <PremiumCard title="Wall Street Targets" isDark={isDark}>
      {ad.target_high && <><PerformanceBar label="Price Targets" low={ad.target_low || 0} high={ad.target_high} current={ad.target_mean || 0} isDark={isDark} /><div className="h-2" /><div className="flex justify-between w-full"><span className="text-[11px]" style={{ color: COLORS.ProRed }}>Low: {fmt(ad.target_low || 0)}</span><span className="text-[11px] font-bold" style={{ color: COLORS.InfoBlue }}>Avg: {fmt(ad.target_mean || 0)}</span><span className="text-[11px]" style={{ color: COLORS.ProGreen }}>High: {fmt(ad.target_high)}</span></div><div className="h-1" /><span className="text-[11px]" style={{ color: COLORS.TextGray }}>Median Target: {fmt(ad.target_median || 0)}</span><div className="h-6" /></>}
      {ad.recommendation_key && <div className="flex items-center"><span className="text-sm" style={{ color: COLORS.TextGray }}>Consensus:</span><div className="w-2" /><div className="px-2 py-1 rounded-lg text-xs font-bold" style={{ color: ad.recommendation_key.toLowerCase().includes("buy") ? COLORS.ProGreen : COLORS.ProRed, backgroundColor: ad.recommendation_key.toLowerCase().includes("buy") ? `${COLORS.ProGreen}33` : `${COLORS.ProRed}33` }}>{ad.recommendation_key.replace("_", " ").toUpperCase()}</div>{ad.recommendation_mean && <span className="ml-2 text-xs" style={{ color: COLORS.TextGray }}>(Score: {fmt(ad.recommendation_mean)})</span>}</div>}
    </PremiumCard>
  );
};

const OptionsSection = ({ data, isDark, isLoading, onOptionsDateClick }: { data: StockDetailsResponse, isDark: boolean, isLoading: boolean, onOptionsDateClick: (d: string) => void }) => {
  if (isLoading) return <InfoSectionShimmer isDark={isDark} />;
  if (!data.optionsExpirations || data.optionsExpirations.length === 0) {
    return <PremiumCard title="Options Chain" isDark={isDark}><EmptyStateMessage message="Options data unavailable." /></PremiumCard>;
  }
  return (
    <PremiumCard title="Options Chain" isDark={isDark}>
      <span className="text-xs font-medium" style={{ color: COLORS.TextGray }}>Select Expiration Date</span>
      <div className="flex overflow-x-auto gap-2.5 mt-3 no-scrollbar">{data.optionsExpirations.slice(0, 10).map(date => (<button key={date} onClick={() => onOptionsDateClick(date)} className="flex px-4 py-3 rounded-full border" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderColor: isDark ? 'rgba(167,141,213,0.5)' : `${COLORS.GeminiPurple}4D`, color: isDark ? COLORS.TextWhite : COLORS.GeminiPurple }}><span className="text-[13px] font-bold whitespace-nowrap">{date}</span></button>))}</div>
    </PremiumCard>
  );
};

const PeersSection = ({ data, isDark, isLoading, onPeerClick, currencySym }: { data: StockDetailsResponse, isDark: boolean, isLoading: boolean, onPeerClick: (s: string) => void, currencySym: string }) => {
  if (isLoading) return <InfoSectionShimmer isDark={isDark} />;
  if (data.similarStocks.length === 0) {
    return <PremiumCard title="Similar Stocks" isDark={isDark}><EmptyStateMessage message="No similar stocks found." /></PremiumCard>;
  }
  return (
    <PremiumCard title="Similar Stocks" isDark={isDark}>
      {data.similarStocks.map(peer => (
        <div key={peer.symbol} onClick={() => onPeerClick(peer.symbol)} className="flex items-center p-4 mb-3 rounded-2xl border cursor-pointer" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}>
          <div className="flex-1 truncate"><span className="font-bold block" style={{ color: isDark ? COLORS.TextWhite : '#000000' }}>{peer.symbol}</span><span className="text-xs text-gray-400 truncate block">{peer.name}</span></div>
          <div className="text-right ml-2"><span className="font-bold block" style={{ color: isDark ? COLORS.TextWhite : '#000000' }}>{currencySym}{fmt(peer.price)}</span><span className="text-xs font-bold" style={{ color: peer.change_percent >= 0 ? COLORS.ProGreen : COLORS.ProRed }}>{peer.change_percent > 0 ? "+" : ""}{fmt(peer.change_percent)}%</span></div>
        </div>
      ))}
    </PremiumCard>
  );
};

const NewsSection = ({ data, isDark, isLoading }: { data: StockDetailsResponse, isDark: boolean, isLoading: boolean }) => {
  if (isLoading) return <div className="px-6"><h3 className="text-lg font-bold mb-4">Latest News</h3><InfoSectionShimmer isDark={isDark} /></div>;
  if (data.news.length === 0) {
    return <div className="px-6"><h3 className="text-lg font-bold mb-4">Latest News</h3><EmptyStateMessage message="No news available." /></div>;
  }
  return (
    <div className="px-6 pb-10"><h3 className="text-lg font-bold mb-4">Latest News</h3>{data.news.map((article, i) => (<a key={i} href={article.link || "#"} target="_blank" className="block mb-3"><div className="rounded-[30px] border p-4" style={{ backgroundColor: isDark ? COLORS.SurfaceDark : '#FFFFFF', borderColor: isDark ? COLORS.BorderDark : COLORS.BorderLight }}><span className="text-xs font-bold" style={{ color: COLORS.GeminiPurple }}>{article.publisher || "Market"}</span><div className="text-sm font-bold mt-1 line-clamp-2">{article.title}</div><div className="text-[11px] text-gray-500 mt-2">{article.date || article.date}</div></div></a>))}</div>
  );
};

const ShimmerBlock = ({ isDark, className }: { isDark: boolean, className: string }) => (
  <motion.div className={`rounded-md ${className}`} animate={{ opacity: [0.2, 0.5, 0.2] }} transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }} style={{ backgroundColor: isDark ? '#FFFFFF' : '#000000' }} />
);

const HeaderShimmer = ({ isDark }: { isDark: boolean }) => (
  <div className="px-6 flex flex-col"><ShimmerBlock isDark={isDark} className="w-25 h-4" /><div className="h-3" /><ShimmerBlock isDark={isDark} className="w-40 h-10 rounded-lg" /><div className="h-3" /><ShimmerBlock isDark={isDark} className="w-30 h-5" /></div>
);

const ChartOnlyShimmer = ({ isDark }: { isDark: boolean }) => (
  <ShimmerBlock isDark={isDark} className="w-full h-full rounded-2xl" />
);

const InfoSectionShimmer = ({ isDark }: { isDark: boolean }) => (
  <div className="flex flex-col w-full"><ShimmerBlock isDark={isDark} className="w-35 h-6" /><div className="h-5" /><div className="flex justify-between w-full"><ShimmerBlock isDark={isDark} className="w-20 h-9" /><ShimmerBlock isDark={isDark} className="w-20 h-9" /><ShimmerBlock isDark={isDark} className="w-20 h-9" /></div></div>
);