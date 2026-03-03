import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, RefreshCw, Trash2, Wallet, 
  TrendingUp, TrendingDown, CheckSquare, Square, X 
} from 'lucide-react';
import { TransactionItem, TransactionType } from '@/types';
import { portfolioRepo } from '@/lib/api';

interface HistoryProps {
  transactions: TransactionItem[];
  currencySymbol: string;
  onBack: () => void;
  onDelete: (ids: string[]) => void;
}

const TransactionHistoryPage: React.FC<HistoryProps> = ({ 
  transactions, currencySymbol, onBack, onDelete 
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSyncing, setIsSyncing] = useState(false);

  const stats = useMemo(() => {
    const sorted = [...transactions].sort((a, b) => b.timestamp - a.timestamp);
    const invested = transactions
      .filter(t => t.type === TransactionType.BUY)
      .reduce((acc, t) => acc + (t.price * t.quantity), 0);
    const liquidated = transactions
      .filter(t => t.type === TransactionType.SELL)
      .reduce((acc, t) => acc + (t.price * t.quantity), 0);
    
    return { sorted, invested, liquidated, net: invested - liquidated };
  }, [transactions]);

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleBatchDelete = () => {
    if (window.confirm(`Delete ${selectedIds.size} transactions?`)) {
      onDelete(Array.from(selectedIds));
      setSelectedIds(new Set());
    }
  };

  return (
    <div className="min-h-screen bg-[#08080a] text-white font-sans selection:bg-[#673ab7]/30">
      {/* GLASS HEADER */}
      <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        selectedIds.size > 0 ? 'bg-[#673ab7] py-4' : 'bg-[#08080a]/80 backdrop-blur-xl py-6'
      }`}>
        <div className="px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {selectedIds.size > 0 ? (
              <>
                <button onClick={() => setSelectedIds(new Set())} className="p-2 hover:bg-white/10 rounded-full">
                  <X size={24} />
                </button>
                <span className="text-xl font-black">{selectedIds.size} Selected</span>
              </>
            ) : (
              <>
                <button onClick={onBack} className="p-2 bg-white/5 border border-white/10 rounded-full hover:bg-white/10">
                  <ArrowLeft size={20} />
                </button>
                <div>
                  <h1 className="text-xl font-black tracking-tight">Global Ledger</h1>
                  <p className="text-[10px] uppercase tracking-widest text-[#673ab7] font-bold">Institutional Activity</p>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {selectedIds.size > 0 ? (
              <button onClick={handleBatchDelete} className="p-3 bg-red-500/20 text-red-400 rounded-2xl hover:bg-red-500/30 transition-all">
                <Trash2 size={20} />
              </button>
            ) : (
              <button 
                onClick={() => { setIsSyncing(true); setTimeout(() => setIsSyncing(false), 1500); }}
                className={`p-3 bg-white/5 border border-white/10 rounded-2xl transition-all ${isSyncing ? 'animate-spin' : ''}`}
              >
                <RefreshCw size={18} />
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="pt-28 pb-32 px-6 max-w-2xl mx-auto space-y-8">
        {/* DASHBOARD SECTION */}
        {selectedIds.size === 0 && (
          <div className="grid grid-cols-2 gap-4">
            <SummaryCard title="Invested" value={stats.invested} color="text-[#00E676]" symbol={currencySymbol} />
            <SummaryCard title="Liquidated" value={stats.liquidated} color="text-[#FF5252]" symbol={currencySymbol} />
            <div className="col-span-2 bg-white/5 border border-white/10 rounded-4xl p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-[#673ab7]/10 rounded-full text-[#673ab7]"><Wallet size={20} /></div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-gray-500">Net Cash Flow</p>
                  <p className="text-xs text-gray-400">{stats.net >= 0 ? 'Capital Flow In' : 'Capital Flow Out'}</p>
                </div>
              </div>
              <p className={`text-lg font-black ${stats.net >= 0 ? 'text-[#00E676]' : 'text-white'}`}>
                {stats.net >= 0 ? '+' : '-'}{currencySymbol}{Math.abs(stats.net).toLocaleString()}
              </p>
            </div>
          </div>
        )}

        {/* ORDER STREAM */}
        <div className="space-y-4">
          <h2 className="text-sm font-black uppercase tracking-widest text-gray-500">Order Stream</h2>
          <div className="space-y-1">
            {stats.sorted.map((tx, idx) => (
              <TransactionRow 
                key={idx}
                tx={tx} 
                symbol={currencySymbol} 
                isSelected={selectedIds.has(tx.timestamp.toString())}
                isSelectionMode={selectedIds.size > 0}
                onToggle={() => toggleSelect(tx.timestamp.toString())}
                onLongPress={() => setSelectedIds(new Set([tx.timestamp.toString()]))}
              />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

const SummaryCard = ({ title, value, color, symbol }: any) => (
  <div className="bg-white/5 border border-white/10 rounded-4xl p-5">
    <div className="flex items-center gap-2 mb-2">
      <div className={`w-1.5 h-1.5 rounded-full bg-current ${color}`} />
      <span className="text-[10px] uppercase font-bold text-gray-500">{title}</span>
    </div>
    <p className="text-lg font-black truncate">{symbol}{value.toLocaleString()}</p>
  </div>
);

const TransactionRow = ({ tx, symbol, isSelected, isSelectionMode, onToggle, onLongPress }: any) => {
  const isBuy = tx.type === TransactionType.BUY;
  const color = isBuy ? '#00E676' : '#FF5252';
  const Icon = isBuy ? TrendingUp : TrendingDown;

  return (
    <motion.div 
      onContextMenu={(e) => { e.preventDefault(); onLongPress(); }}
      onClick={onToggle}
      className={`relative group flex items-center p-4 rounded-3xl transition-all cursor-pointer ${
        isSelected ? 'bg-[#673ab7]/10' : 'hover:bg-white/5'
      }`}
    >
      <AnimatePresence>
        {isSelectionMode && (
          <motion.div 
            initial={{ width: 0, opacity: 0 }} 
            animate={{ width: 40, opacity: 1 }} 
            exit={{ width: 0, opacity: 0 }}
            className="shrink-0"
          >
            {isSelected ? <CheckSquare size={20} className="text-[#673ab7]" /> : <Square size={20} className="text-gray-600" />}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-3 rounded-2xl mr-4" style={{ backgroundColor: `${color}15`, border: `1px solid ${color}30` }}>
        <Icon size={20} style={{ color }} />
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="font-black text-white truncate">{tx.symbol}</h3>
        <div className="flex items-center gap-2">
          <p className="text-[10px] text-gray-500 font-bold uppercase">
            {new Date(tx.timestamp).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}
          </p>
          <div className="w-1 h-1 rounded-full bg-gray-700" />
          <p className="text-[10px] text-gray-500 font-bold uppercase">{tx.quantity} Units</p>
        </div>
      </div>

      <div className="text-right">
        <p className="font-black text-sm" style={{ color }}>
          {isBuy ? '+' : '-'}{symbol}{(tx.price * tx.quantity).toLocaleString()}
        </p>
        <p className="text-[10px] text-gray-500 font-bold tracking-tighter">@ {symbol}{tx.price.toLocaleString()}</p>
      </div>
    </motion.div>
  );
};