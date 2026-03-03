'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

interface PremiumLineChartProps {
  dataPoints: number[];
  isPositive: boolean;
  strokeWidth?: number;
  showGradient?: boolean;
  animate?: boolean; // Added support for the animate prop
}

export default function PremiumLineChart({ 
  dataPoints, 
  isPositive, 
  strokeWidth = 2, 
  showGradient = true,
  animate = true 
}: PremiumLineChartProps) {
  const pathData = useMemo(() => {
    // Need at least 2 points to draw a curve
    if (!dataPoints || dataPoints.length < 2) return { stroke: "", fill: "" };
    
    const min = Math.min(...dataPoints);
    const max = Math.max(...dataPoints);
    const range = (max - min) || 0.01;
    const width = 1000; 
    const height = 100;

    const points = dataPoints.map((val, i) => ({
      x: (i / (dataPoints.length - 1)) * width,
      y: height - ((val - min) / range * 85) - 7 
    }));

    // CUBIC BEZIER (1:1 Logic Parity with Kotlin cubicTo)
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
  }, [dataPoints]);

  const color = isPositive ? '#00E676' : '#FF5252';

  return (
    <svg 
      viewBox="0 0 1000 100" 
      preserveAspectRatio="none" 
      className="w-full h-full overflow-visible"
    >
      <defs>
        <linearGradient id={`chartGrad-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {showGradient && (
        <motion.path 
          d={pathData.fill} 
          fill={`url(#chartGrad-${color})`} 
          initial={animate ? { opacity: 0 } : { opacity: 1 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        />
      )}

      <motion.path 
        d={pathData.stroke} 
        fill="none" 
        stroke={color} 
        strokeWidth={strokeWidth} 
        strokeLinecap="round" 
        strokeLinejoin="round"
        // If animate is false, path is drawn immediately (pathLength: 1)
        initial={animate ? { pathLength: 0 } : { pathLength: 1 }}
        animate={{ pathLength: 1 }}
        transition={{ 
          duration: animate ? 1.5 : 0, 
          ease: "easeInOut" 
        }}
      />
    </svg>
  );
}