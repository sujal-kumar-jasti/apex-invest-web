'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import StockDetailScreen from './StockDetailScreen'; // Import the screen we just built

interface StockPageProps {
  params: Promise<{ symbol: string }>;
}

export default function StockPage({ params }: StockPageProps) {
  const router = useRouter();
  const resolvedParams = React.use(params); // Unwrap the promise
  
  // Decode the symbol (fixes issues if a stock has special characters like ^GSPC)
  const decodedSymbol = decodeURIComponent(resolvedParams.symbol).toUpperCase();

  return (
    <StockDetailScreen
      symbol={decodedSymbol}
      onBack={() => router.back()} // Goes back to Dashboard
      onNavigateToStock={(newSymbol) => router.push(`/stock/${newSymbol}`)} // For clicking "Similar Stocks"
      onOptionsDateClick={(date) => {
        // You can handle options routing here later, e.g.:
        // router.push(`/stock/${decodedSymbol}/options/${date}`)
        console.log(`Clicked options for ${date}`);
      }}
      isConnected={true} // Set to true to enable the 8-second live polling loop
    />
  );
}