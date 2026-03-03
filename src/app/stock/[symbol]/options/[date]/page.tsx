'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Activity, Loader2 } from 'lucide-react';
import { apexApi } from '@/lib/api';
import { OptionContract } from '@/types';

export default function OptionsChainPage() {
  const params = useParams();
  const router = useRouter();
  const symbol = params.symbol as string;
  const date = params.date as string;

  const [loading, setLoading] = useState(true);
  const [chainData, setChainData] = useState<{ calls: OptionContract[], puts: OptionContract[] } | null>(null);

  // --- 1. DATA FETCHING ---
  useEffect(() => {
    const fetchChain = async () => {
      try {
        setLoading(true);
        const res = await apexApi.getOptionsChain(symbol, date);
        if (res.data) {
          setChainData({
            calls: res.data.calls || [],
            puts: res.data.puts || []
          });
        }
      } catch (e) {
        console.error("Failed to fetch options chain", e);
      } finally {
        setLoading(false);
      }
    };
    if (symbol && date) fetchChain();
  }, [symbol, date]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#08080a] flex items-center justify-center">
        <Loader2 className="animate-spin text-[#673ab7]" size={32} />
      </div>
    );
  }

  if (!chainData) {
    return (
      <div className="min-h-screen bg-[#08080a] text-white flex flex-col items-center justify-center p-6">
        <p className="text-gray-500 mb-4">Failed to load options data.</p>
        <button onClick={() => router.back()} className="text-[#673ab7] font-bold">Go Back</button>
      </div>
    );
  }

  return (
    <OptionsChainScreen 
      symbol={symbol} 
      expirationDate={date} 
      calls={chainData.calls} 
      puts={chainData.puts} 
      onBack={() => router.back()} 
    />
  );
}

// ==========================================
// THE SCREEN LOGIC (Fixed to prevent .reduce error)
// ==========================================
function OptionsChainScreen({ symbol, expirationDate, calls = [], puts = [], onBack }: any) {
  const [selectedTab, setSelectedTab] = useState<'calls' | 'puts'>('calls');

  // 2. ANALYTICS ENGINE (PCR & Chart Data)
  const analytics = useMemo(() => {
    // 🌟 SAFEGUARD: Ensure calls and puts are arrays before reducing
    const safeCalls = Array.isArray(calls) ? calls : [];
    const safePuts = Array.isArray(puts) ? puts : [];

    const totalCallVol = Math.max(safeCalls.reduce((sum, c) => sum + (c.volume || 0), 0), 1);
    const totalPutVol = Math.max(safePuts.reduce((sum, p) => sum + (p.volume || 0), 0), 1);
    const pcr = totalPutVol / totalCallVol;

    const allStrikes = Array.from(new Set([
      ...safeCalls.map(c => c.strike), 
      ...safePuts.map(p => p.strike)
    ])).sort((a, b) => a - b);

    const getActivity = (contract?: any) => 
      contract ? Math.max(contract.volume || 0, contract.open_interest || 0) : 0;

    const strikeActivity = allStrikes.map(strike => ({
      strike,
      callVal: getActivity(safeCalls.find(c => c.strike === strike)),
      putVal: getActivity(safePuts.find(p => p.strike === strike)),
    }));

    const maxActivity = Math.max(...strikeActivity.map(s => Math.max(s.callVal, s.putVal)), 1);

    return { pcr, strikeActivity, maxActivity };
  }, [calls, puts]);

  const activeContracts = selectedTab === 'calls' ? calls : puts;

  return (
    <div className="min-h-screen bg-[#08080a] text-white flex flex-col font-sans">
      <header className="px-6 py-4 flex items-center gap-4 sticky top-0 bg-[#08080a]/80 backdrop-blur-xl z-50 border-b border-white/5">
        <button onClick={onBack} className="p-2.5 bg-white/5 border border-white/10 rounded-2xl active:scale-90 transition-all"><ArrowLeft size={20} /></button>
        <div>
          <h1 className="text-lg font-black tracking-tight uppercase">{symbol} Options</h1>
          <p className="text-[10px] font-black text-[#673ab7] tracking-widest uppercase">Exp: {expirationDate}</p>
        </div>
      </header>

      <main className="flex-1 p-4 pb-20 space-y-6 overflow-y-auto">
        <section className="bg-[#16161a] border border-white/5 rounded-4xl p-6 shadow-2xl">
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Market Sentiment</p>
              <h2 className={`text-2xl font-black ${analytics.pcr > 1 ? 'text-[#ff3d00]' : 'text-[#00c853]'}`}>{analytics.pcr > 1 ? 'BEARISH' : 'BULLISH'}</h2>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">P/C Ratio</p>
              <p className="text-xl font-black">{analytics.pcr.toFixed(2)}</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2"><Activity size={14} className="text-[#673ab7]" /><p className="text-[11px] font-black uppercase text-white/80 tracking-tighter">Activity Distribution (Vol / OI)</p></div>
            <div className="h-25 flex items-end gap-0.5 px-1 overflow-hidden">
              {analytics.strikeActivity.map((data, idx) => (
                <div key={idx} className="flex-1 flex items-end gap-px h-full group relative">
                  <motion.div initial={{ height: 0 }} animate={{ height: `${(data.callVal / analytics.maxActivity) * 100}%` }} className="w-full bg-[#00c853]/80 rounded-t-xs" />
                  <motion.div initial={{ height: 0 }} animate={{ height: `${(data.putVal / analytics.maxActivity) * 100}%` }} className="w-full bg-[#ff3d00]/80 rounded-t-xs" />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="bg-[#16161a] p-1.5 rounded-full flex gap-1 border border-white/5">
            <TabButton title="Calls" active={selectedTab === 'calls'} color="#00C853" onClick={() => setSelectedTab('calls')} />
            <TabButton title="Puts" active={selectedTab === 'puts'} color="#FF3D00" onClick={() => setSelectedTab('puts')} />
          </div>
          <div className="divide-y divide-white/5">
            {activeContracts.map((contract: any) => (
              <OptionRow key={`${contract.strike}_${selectedTab}`} contract={contract} isCall={selectedTab === 'calls'} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

// --- HELPERS ---
function OptionRow({ contract, isCall }: any) {
  const themeColor = isCall ? '#00C853' : '#FF3D00';
  return (
    <div className={`flex items-center px-4 py-4 ${contract.in_the_money ? 'bg-white/3' : ''}`}>
      <div className="w-[30%] flex items-center gap-2">
        {contract.in_the_money && <div className="w-1 h-4 rounded-full" style={{ backgroundColor: themeColor }} />}
        <span className="text-base font-black tracking-tight">{contract.strike}</span>
      </div>
      <span className="w-[17%] text-right text-sm font-bold text-white/90">{contract.bid?.toFixed(2) || '0.00'}</span>
      <span className="w-[17%] text-right text-sm font-bold text-white/90">{contract.ask?.toFixed(2) || '0.00'}</span>
      <span className="w-[18%] text-right text-[11px] font-medium text-gray-400">{contract.volume || 0}</span>
      <span className="w-[18%] text-right text-sm font-black text-[#2196F3]">{Math.round((contract.implied_volatility || 0) * 100)}%</span>
    </div>
  );
}

function TabButton({ title, active, color, onClick }: any) {
  return (
    <button onClick={onClick} className={`flex-1 py-2.5 rounded-full text-xs font-black uppercase transition-all ${active ? 'text-white' : 'text-gray-500'}`} style={{ backgroundColor: active ? color : 'transparent' }}>{title}</button>
  );
}