'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

interface MiniChartProps {
  data: number[];
  isPositive: boolean;
  strokeWidth?: number;
  animate?: boolean;
}

const MiniChart = ({ data, isPositive, strokeWidth = 2, animate = true }: MiniChartProps) => {
  const pathData = useMemo(() => {
    if (!data || data.length < 2) return { stroke: "", fill: "" };
    
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = (max - min) || 0.01;
    const width = 1000; // Parity with high-res viewport
    const height = 100;

    // Mapping points with vertical padding (Parity with Kotlin verticalPadding)
    const points = data.map((val, i) => ({
      x: (i / (data.length - 1)) * width,
      y: height - ((val - min) / range * 80) - 10 
    }));

    // Generate Cubic Bezier Path (Matches cubicTo in Kotlin)
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const curr = points[i];
      const next = points[i + 1];
      const controlX = (curr.x + next.x) / 2;
      d += ` C ${controlX} ${curr.y}, ${controlX} ${next.y}, ${next.x} ${next.y}`;
    }

    return {
      stroke: d,
      fill: `${d} L ${width} 100 L 0 100 Z`
    };
  }, [data]);

  const color = isPositive ? '#00e676' : '#ff5252';

  return (
    <div className="w-full h-full overflow-hidden">
      <svg viewBox="0 0 1000 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
        <defs>
          <linearGradient id={`chartFill-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        
        {/* Gradient Fill Area */}
        <motion.path 
          d={pathData.fill} 
          fill={`url(#chartFill-${color})`} 
          initial={animate ? { opacity: 0 } : { opacity: 1 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        />

        {/* Main Trend Line */}
        <motion.path 
          d={pathData.stroke} 
          fill="none" 
          stroke={color} 
          strokeWidth={strokeWidth} 
          strokeLinecap="round" 
          strokeLinejoin="round"
          initial={animate ? { pathLength: 0 } : { pathLength: 1 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
        />
      </svg>
    </div>
  );
};

export default MiniChart;