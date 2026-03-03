'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { DeepAnalysisResponse, NewsItem } from '@/types';
import { 
  ArrowLeft, FileText, TrendingUp, Shield, Activity, 
  Globe, Clock, ChevronRight, AlertTriangle 
} from 'lucide-react';

// Inside src/app/predictions/DeepAnalysisView.tsx

const PredictionChart = ({ data }: { data: DeepAnalysisResponse }) => {
  const { pathData, areaPath, width, height, dividerX, hasData } = useMemo(() => {
    // Safety Checks
    const history = data.historical_chart_data || [];
    const forecast = data.monte_carlo_forecast || [];
    
    // FIX 1: Consistent Return Shape (Always return object for pathData)
    if (history.length === 0) {
      return { 
        pathData: { history: "", forecast: "" }, 
        areaPath: "", 
        width: 0, 
        height: 0, 
        dividerX: 0,
        hasData: false 
      };
    }

    const allPrices = [
      ...history.map(d => d.close),
      ...forecast.map(d => d.mean_price),
      ...forecast.map(d => d.bull_case_90th),
      ...forecast.map(d => d.bear_case_10th)
    ];
    
    // Safety for flat lines
    const min = Math.min(...allPrices) * 0.98;
    const max = Math.max(...allPrices) * 1.02 || (min + 1);
    const range = max - min;

    const width = 1000;
    const height = 300;
    const totalPoints = history.length + forecast.length;
    
    // Protect against division by zero
    const step = totalPoints > 1 ? width / (totalPoints - 1) : 0;

    const getY = (val: number) => height - ((val - min) / range * height);

    // --- Generate Paths ---
    let historyPath = `M 0 ${getY(history[0].close)}`;
    history.forEach((d, i) => {
      historyPath += ` L ${i * step} ${getY(d.close)}`;
    });

    // Start forecast from the last history point to connect lines
    const startX = (history.length - 1) * step;
    let forecastPath = `M ${startX} ${getY(history[history.length - 1].close)}`;
    
    forecast.forEach((d, i) => {
      const x = (history.length + i) * step;
      forecastPath += ` L ${x} ${getY(d.mean_price)}`;
    });

    let areaPath = `M ${startX} ${getY(history[history.length - 1].close)}`;
    forecast.forEach((d, i) => {
      const x = (history.length + i) * step;
      areaPath += ` L ${x} ${getY(d.bull_case_90th)}`;
    });
    for (let i = forecast.length - 1; i >= 0; i--) {
      const x = (history.length + i) * step;
      areaPath += ` L ${x} ${getY(forecast[i].bear_case_10th)}`;
    }
    areaPath += " Z";

    // FIX 2: Calculate Divider Position Here (Clean JSX)
    const dividerX = startX;

    return { 
      pathData: { history: historyPath, forecast: forecastPath }, 
      areaPath, 
      width, height, dividerX, 
      hasData: true
    };
  }, [data]);

  if (!hasData) return <div className="h-64 flex items-center justify-center text-gray-500">No chart data available</div>;

  // FIX 3: Safe Color Logic (Optional chaining)
  const startPrice = data.historical_chart_data?.[0]?.close || 0;
  const isUp = data.current_price >= startPrice;

  return (
    <div className="w-full h-64 relative mt-4">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
        <defs>
          <linearGradient id="coneGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#673AB7" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#673AB7" stopOpacity="0.05" />
          </linearGradient>
        </defs>

        <motion.path 
          d={areaPath} 
          fill="url(#coneGrad)" 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          transition={{ duration: 1 }}
        />

        {/* Historical Line */}
        <path 
          d={pathData.history} 
          fill="none" 
          stroke={isUp ? "#00E676" : "#FF5252"} 
          strokeWidth="3" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        />

        {/* Forecast Line */}
        <path 
          d={pathData.forecast} 
          fill="none" 
          stroke="#673AB7" 
          strokeWidth="3" 
          strokeDasharray="10,10" 
          strokeLinecap="round" 
        />
        
        {/* Divider Line (Now uses calculated variable) */}
        <line 
          x1={dividerX} 
          y1="0" 
          x2={dividerX} 
          y2={height} 
          stroke="white" 
          strokeOpacity="0.2" 
          strokeDasharray="4,4" 
        />
      </svg>
      
      <div className="absolute bottom-2 left-2 text-[9px] text-gray-500 font-bold uppercase tracking-widest">Historical</div>
      <div className="absolute bottom-2 right-2 text-[9px] text-[#673AB7] font-bold uppercase tracking-widest">AI Forecast (30D)</div>
    </div>
  );
};

// --- 2. MAIN COMPONENT ---

export default function DeepAnalysisView({ data, onClose }: { data: DeepAnalysisResponse, onClose: () => void }) {
  const isBullish = data.agent_synthesis.final_verdict.toLowerCase().includes('buy');
  const verdictColor = isBullish ? '#00E676' : '#FF5252';

  return (
    <motion.div 
      initial={{ opacity: 0, x: 50 }} 
      animate={{ opacity: 1, x: 0 }} 
      exit={{ opacity: 0, x: 50 }}
      className="min-h-screen bg-[#08080a] pb-20"
    >
      {/* 1. STICKY HEADER WITH BACK BUTTON */}
      <header className="sticky top-0 z-40 bg-[#08080a]/90 backdrop-blur-xl border-b border-white/5 p-4 flex items-center justify-between">
        <button 
          onClick={onClose} 
          className="p-2 glass rounded-xl border border-white/10 active:scale-95 transition-transform hover:bg-white/5"
        >
          <ArrowLeft size={20} className="text-gray-300" />
        </button>
        <div className="text-center">
          <h2 className="text-lg font-black tracking-tight">{data.symbol}</h2>
          <p className="text-xs font-bold text-gray-500">${data.current_price.toLocaleString()}</p>
        </div>
        <div className="w-10" /> {/* Spacer */}
      </header>

      <div className="p-6 space-y-8">
        
        {/* 2. VERDICT & HERO STATS */}
        <section className="flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-2">
              <Activity size={12} className="text-[#673AB7]" />
              <span className="text-[10px] font-bold text-[#673AB7] uppercase tracking-widest">PrognosAI Verdict</span>
            </div>
            <h1 className="text-4xl font-black tracking-tighter" style={{ color: verdictColor }}>
              {data.agent_synthesis.final_verdict.toUpperCase()}
            </h1>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-gray-500 uppercase">Health Score</p>
            <p className="text-3xl font-black">{data.financial_health_score}</p>
          </div>
        </section>

        {/* 3. MONTE CARLO PREDICTION CHART */}
        <section className="glass rounded-4xl p-6 border border-white/5">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-black uppercase tracking-widest">Price Trajectory</h3>
            <span className="text-[10px] font-bold text-gray-500 bg-white/5 px-2 py-1 rounded-lg">Monte Carlo Sim</span>
          </div>
          
          <PredictionChart data={data} />
          
          <div className="flex justify-between mt-4 px-2">
             <div className="text-center">
               <p className="text-[9px] text-gray-500 uppercase">Bear Case</p>
               <p className="text-sm font-bold text-[#FF5252]">${data.monte_carlo_forecast[data.monte_carlo_forecast.length-1]?.bear_case_10th.toFixed(2)}</p>
             </div>
             <div className="text-center">
               <p className="text-[9px] text-gray-500 uppercase">Bull Case</p>
               <p className="text-sm font-bold text-[#00E676]">${data.monte_carlo_forecast[data.monte_carlo_forecast.length-1]?.bull_case_90th.toFixed(2)}</p>
             </div>
          </div>
        </section>

        {/* 4. AGENT THESIS (Fundamental & Macro) */}
        <section className="space-y-4">
          <div className="glass rounded-3xl p-6 border border-white/5">
            <div className="flex items-center gap-2 mb-3">
              <FileText size={16} className="text-[#673AB7]" />
              <h3 className="text-xs font-black uppercase tracking-widest text-[#673AB7]">Fundamental Thesis</h3>
            </div>
            <p className="text-sm font-medium text-gray-300 leading-relaxed">
              {data.agent_synthesis.fundamental_thesis}
            </p>
          </div>

          <div className="glass rounded-3xl p-6 border border-white/5">
            <div className="flex items-center gap-2 mb-3">
              <Globe size={16} className="text-blue-400" />
              <h3 className="text-xs font-black uppercase tracking-widest text-blue-400">Macro Context</h3>
            </div>
            <p className="text-sm font-medium text-gray-300 leading-relaxed">
              {data.agent_synthesis.macro_news_thesis}
            </p>
          </div>
        </section>

        {/* 5. FUNDAMENTALS GRID */}
        <section>
          <h3 className="text-sm font-black uppercase tracking-widest mb-4 px-2">Core Metrics</h3>
          <div className="grid grid-cols-3 gap-3">
            <MetricCard label="P/E Ratio" value={data.fundamentals.pe_ratio.toFixed(2)} />
            <MetricCard label="Debt/Eq" value={data.fundamentals.debt_to_equity.toFixed(2)} />
            <MetricCard label="Market Cap" value={data.fundamentals.market_cap} />
          </div>
        </section>

        {/* 6. NEWS INTELLIGENCE */}
        <section>
          <div className="flex items-center justify-between mb-4 px-2">
            <h3 className="text-sm font-black uppercase tracking-widest">News Sentiment</h3>
            <span className={`text-xs font-black px-3 py-1 rounded-full bg-white/5 border border-white/10 ${data.sentiment.overall_score > 0 ? 'text-[#00E676]' : 'text-[#FF5252]'}`}>
              {Math.round(data.sentiment.overall_score * 100)}/100 Score
            </span>
          </div>
          
          <div className="space-y-3">
            {data.sentiment.news_articles.slice(0, 5).map((news, i) => (
              <NewsCard key={i} item={news} />
            ))}
          </div>
        </section>

      </div>
    </motion.div>
  );
}

// --- SUB-COMPONENTS ---

const MetricCard = ({ label, value }: { label: string, value: string }) => (
  <div className="glass rounded-[20px] p-4 border border-white/5 text-center bg-white/2">
    <p className="text-[9px] font-bold text-gray-500 uppercase mb-1">{label}</p>
    <p className="text-sm font-black text-white">{value}</p>
  </div>
);

const NewsCard = ({ item }: { item: NewsItem }) => {
  // Parsing sentiment score to color
  const color = item.score > 0.3 ? '#00E676' : item.score < -0.3 ? '#FF5252' : '#FFB300';
  
  return (
    <a href={item.link} target="_blank" rel="noopener noreferrer" className="block">
      <div className="glass rounded-3xl p-5 border border-white/5 active:scale-[0.98] transition-transform hover:bg-white/5">
        <div className="flex justify-between items-start mb-2">
          <span className="text-[9px] font-black uppercase tracking-wider text-gray-500">{item.publisher}</span>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-[9px] font-bold uppercase" style={{ color }}>{item.sentiment_label}</span>
          </div>
        </div>
        <h4 className="text-sm font-bold leading-snug line-clamp-2 mb-2">{item.title}</h4>
        <div className="flex items-center gap-1 text-[10px] font-bold text-[#673AB7]">
          <span>Read Analysis</span>
          <ChevronRight size={10} />
        </div>
      </div>
    </a>
  );
};