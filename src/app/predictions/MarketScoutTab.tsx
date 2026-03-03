'use client'; 

import React, { useState, useRef, useCallback } from 'react';
import { apexApi } from '@/lib/api';
import { motion } from 'framer-motion'; 
import { Search, Loader2 } from 'lucide-react';
import { DeepAnalysisResponse } from '@/types';

export default function MarketScoutTab({ onAnalyzeComplete }: { onAnalyzeComplete: (d: DeepAnalysisResponse) => void }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState("Initializing...");
  const [results, setResults] = useState<any[]>([]);
  
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const attemptsRef = useRef(0);

  // 1. Live Search
  const handleSearch = async (val: string) => {
    setQuery(val);
    if (val.length < 2) {
        setResults([]);
        return;
    }
    try {
      const res = await apexApi.search(val);
      setResults(Array.isArray(res.data) ? res.data : []);
    } catch (e) { setResults([]); }
  };

  // 2. Retry Helper
  const analyzeWithRetry = useCallback(async (symbol: string, retries = 3): Promise<string> => {
    try {
      const { data } = await apexApi.analyzeStock(symbol);
      return data.job_id;
    } catch (error) {
      if (retries > 0) {
        setStatusText("Waking up AI Engine...");
        await new Promise(r => setTimeout(r, 2500));
        return analyzeWithRetry(symbol, retries - 1);
      }
      throw error;
    }
  }, []);

  // 3. Execute Deep Scan
  const executeScan = async (symbol: string) => {
    setLoading(true);
    setStatusText("Initializing Job...");
    setResults([]); 

    try {
      // Step A: Start Job
      const jobId = await analyzeWithRetry(symbol);
      
      setStatusText("Running Monte Carlo Simulations...");
      attemptsRef.current = 0;

      // Step B: Poll
      pollRef.current = setInterval(async () => {
        if (attemptsRef.current > 40) { // 2 min timeout
            clearInterval(pollRef.current!);
            setLoading(false);
            alert("Analysis timed out. Please try again.");
            return;
        }
        attemptsRef.current++;

        try {
          const { data: jobStatus } = await apexApi.checkJobStatus(jobId);
          const status = jobStatus.status.toUpperCase(); // FIX: Handle "COMPLETED"
          
          if (status === 'COMPLETED' && jobStatus.data) {
            clearInterval(pollRef.current!);
            
            // FIX: Parsing safety
            let cleanData = jobStatus.data;
            if (typeof cleanData === 'string') {
                try { cleanData = JSON.parse(cleanData); } catch(e){}
            }

            onAnalyzeComplete(cleanData as DeepAnalysisResponse);
            setLoading(false);
          } 
          else if (status === 'FAILED') {
            clearInterval(pollRef.current!);
            alert("Analysis Failed: " + (jobStatus.error || "Unknown Error"));
            setLoading(false);
          }
        } catch (e) { /* transient error */ }
      }, 3000);

    } catch (e) {
      console.error(e);
      setLoading(false);
      alert("Failed to connect to AI Engine.");
    }
  };

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  if (loading) {
    return (
      <div className="h-[50vh] flex flex-col items-center justify-center">
        <Loader2 size={40} className="text-[#673AB7] animate-spin mb-4" />
        <h3 className="font-black text-white text-lg">Scouting Asset</h3>
        <p className="text-xs font-bold text-gray-500 mt-2 uppercase tracking-widest">{statusText}</p>
      </div>
    );
  }

  return (
    <div className="min-h-[50vh]">
      <div className="relative group mb-8">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-[#673AB7] transition-colors" size={20}/>
        <input 
          autoFocus
          className="w-full bg-white/5 border border-white/10 rounded-[30px] p-5 pl-14 outline-none focus:border-[#673AB7] transition-all font-black text-lg placeholder:text-gray-600"
          placeholder="Scout global markets..."
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
        />
      </div>

      <div className="space-y-3">
        {results.map((stock) => (
          <motion.div 
            key={stock.symbol}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            onClick={() => executeScan(stock.symbol)}
            className="glass p-5 rounded-[24px] flex items-center justify-between border border-white/5 hover:bg-white/10 cursor-pointer active:scale-[0.98] transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-[#673AB7]/10 flex items-center justify-center font-black text-[#673AB7]">
                {stock.symbol.slice(0, 1)}
              </div>
              <div>
                <h4 className="font-black text-lg">{stock.symbol}</h4>
                <p className="text-xs font-bold text-gray-500">{stock.name}</p>
              </div>
            </div>
            <div className="h-10 w-10 rounded-full border border-white/10 flex items-center justify-center">
               <Search size={16} className="text-gray-400" />
            </div>
          </motion.div>
        ))}
        
        {results.length === 0 && query.length > 1 && (
           <p className="text-center text-gray-500 font-bold text-sm mt-10">No assets found matching "{query}"</p>
        )}
      </div>
    </div>
  );
}