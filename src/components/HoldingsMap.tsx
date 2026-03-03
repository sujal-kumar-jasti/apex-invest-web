'use client';

import React from 'react';
import { motion } from 'framer-motion';

// Refined Interface for Asset-Aware Conversion
interface AllocationItem {
  symbol: string;
  percent: number;
  change: number;
  value: number; // Raw value from store (assumed base is asset-origin)
}

interface HoldingsMapProps {
  allocations: AllocationItem[];
  isUsd: boolean;
  rate: number;
  onClick: (symbol: string) => void;
}

export default function HoldingsMap({ allocations, isUsd, rate, onClick }: HoldingsMapProps) {
  // Guard clause for empty data
  if (!allocations || allocations.length === 0) {
    return (
      <div className="bg-white/[0.02] border border-dashed border-white/10 rounded-[32px] p-12 text-center">
        <p className="text-[10px] font-black uppercase text-gray-600 tracking-widest">No Allocation Data Available</p>
      </div>
    );
  }

  /**
   * SMART CONVERTER
   * Decides if it needs to multiply or divide based on ticker origin
   */
  const getConvertedDisplayValue = (val: number, symbol: string) => {
    const isIndianStock = symbol.endsWith(".NS") || symbol.endsWith(".BO");

    if (isUsd) {
      // Goal: Display in USD
      // If Indian stock, divide by rate. If US stock, return as is.
      return isIndianStock ? val / rate : val;
    } else {
      // Goal: Display in INR
      // If Indian stock, return as is. If US stock, multiply by rate.
      return isIndianStock ? val : val * rate;
    }
  };

  return (
    <div className="bg-[#121216] rounded-[40px] p-8 border border-white/5 shadow-2xl space-y-8">
      {allocations.slice(0, 6).map((item, i) => {
        const displayVal = getConvertedDisplayValue(item.value, item.symbol);
        const isPositive = item.change >= 0;

        return (
          <motion.div 
            key={item.symbol} 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => onClick(item.symbol)} 
            className="cursor-pointer group"
          >
            {/* Asset Info Header */}
            <div className="flex justify-between items-end mb-3 px-1">
              <div className="flex flex-col">
                <span className="font-black text-sm text-white group-hover:text-[#673ab7] transition-colors">
                  {item.symbol}
                </span>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">
                  {isUsd ? '$' : '₹'}{displayVal.toLocaleString(undefined, { 
                    minimumFractionDigits: 2, 
                    maximumFractionDigits: 2 
                  })}
                </span>
              </div>
              
              <div className="text-right">
                <span className="text-[11px] font-black text-white block">
                  {item.percent.toFixed(1)}%
                </span>
                <span className={`text-[9px] font-black uppercase tracking-widest ${isPositive ? 'text-[#00e676]' : 'text-[#ff5252]'}`}>
                  {isPositive ? 'Accumulating' : 'Reducing'}
                </span>
              </div>
            </div>
            
            {/* Allocation Bar */}
            <div className="h-2.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 relative">
              <motion.div 
                initial={{ width: 0 }} 
                animate={{ width: `${item.percent}%` }} 
                transition={{ duration: 1.2, ease: "circOut", delay: i * 0.1 }}
                className="h-full rounded-full relative"
                style={{ 
                  backgroundColor: isPositive ? '#00e676' : '#ff5252',
                  boxShadow: `0 0 15px ${isPositive ? '#00e67633' : '#ff525233'}` 
                }}
              >
                {/* Subtle Shine Effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent w-full h-full" />
              </motion.div>
            </div>
          </motion.div>
        );
      })}

      {/* Footer Meta */}
      <div className="pt-2 border-t border-white/5 flex justify-center">
         <p className="text-[9px] font-black text-gray-600 uppercase tracking-[3px]">Institutional Concentration Map</p>
      </div>
    </div>
  );
}