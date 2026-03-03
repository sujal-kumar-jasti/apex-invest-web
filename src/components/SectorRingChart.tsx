'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

const COLORS = ['#673AB7', '#26C6DA', '#66BB6A', '#FFCA28', '#EF5350', '#8D6E63'];

interface SectorRingChartProps {
  sectors: Record<string, number>;
  total: number;
  isUsd: boolean;
  rate: number;
}

export default function SectorRingChart({ sectors, total, isUsd, rate }: SectorRingChartProps) {
  const segments = useMemo(() => {
    let currentOffset = 0;
    const sorted = Object.entries(sectors).sort(([, a], [, b]) => b - a);

    return sorted.map(([name, value], i) => {
      const percentage = value / total;
      const strokeDasharray = `${percentage * 100} ${100 - percentage * 100}`;
      const strokeDashoffset = -currentOffset;
      
      const segment = {
        name,
        value,
        percentage,
        strokeDasharray,
        strokeDashoffset,
        color: COLORS[i % COLORS.length]
      };

      currentOffset += percentage * 100;
      return segment;
    });
  }, [sectors, total]);

  // Currency Formatter
  const formatVal = (val: number) => {
    // Note: Since 'total' is already passed as a converted value from AnalyticsScreen,
    // we use it directly. If total was raw USD, we would apply rate logic here.
    return val.toLocaleString(undefined, { 
      maximumFractionDigits: 0 
    });
  };

  return (
    <div className="flex flex-col sm:flex-row items-center gap-10">
      
      {/* 1. ANIMATED DONUT */}
      <div className="relative w-40 h-40 shrink-0">
        <svg viewBox="0 0 42 42" className="w-full h-full -rotate-90">
          {/* Background Ring */}
          <circle 
            cx="21" cy="21" r="15.915" 
            fill="transparent" 
            stroke="rgba(255,255,255,0.03)" 
            strokeWidth="3.5" 
          />
          
          {segments.map((seg, i) => (
            <motion.circle
              key={seg.name}
              cx="21" cy="21" r="15.915"
              fill="transparent"
              stroke={seg.color}
              strokeWidth="4"
              strokeDasharray={seg.strokeDasharray}
              strokeDashoffset={100} // Start hidden
              animate={{ strokeDashoffset: seg.strokeDashoffset }}
              transition={{ duration: 1.5, ease: "circOut", delay: i * 0.1 }}
              strokeLinecap="round"
            />
          ))}
        </svg>

        {/* Center Readout */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
           <span className="text-[8px] font-black text-gray-500 uppercase tracking-[2px]">Total</span>
           <span className="text-sm font-black text-white">
             {isUsd ? '$' : '₹'}{formatVal(total)}
           </span>
        </div>
      </div>

      {/* 2. ENHANCED LEGEND */}
      <div className="flex-1 w-full space-y-4">
        {segments.slice(0, 5).map((seg) => (
          <div key={seg.name} className="group cursor-default">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-3">
                <div 
                  className="w-2.5 h-2.5 rounded-full shadow-lg" 
                  style={{ 
                    backgroundColor: seg.color,
                    boxShadow: `0 0 10px ${seg.color}44` 
                  }} 
                />
                <span className="text-xs font-black text-gray-300 group-hover:text-white transition-colors">
                  {seg.name}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[11px] font-black text-white block">
                  {(seg.percentage * 100).toFixed(1)}%
                </span>
              </div>
            </div>
            
            {/* Visual Weight Indicator */}
            <div className="flex justify-between items-center text-[9px] font-bold text-gray-600 uppercase tracking-tighter px-5">
               <span>Exposure</span>
               <span>{isUsd ? '$' : '₹'}{formatVal(seg.value)}</span>
            </div>
          </div>
        ))}
        
        {segments.length > 5 && (
          <p className="text-center text-[8px] font-black text-gray-700 uppercase tracking-widest pt-2">
            + {segments.length - 5} Other Sectors
          </p>
        )}
      </div>
    </div>
  );
}