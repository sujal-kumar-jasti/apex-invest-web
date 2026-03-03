import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { 
  StockEntity, 
  WatchlistEntity,
  TransactionItem,
  DeepAnalysisResponse, 
  PortfolioSummary, 
  AiInsight, 
  StockSuggestion,
  StockInfoDto,
  StockLiveDto,
  StockNews,
  AnalystData,
  ESGData,
  TrendingStockDto,
  CommodityDto
} from '../types';

// --- HELPER INTERFACES ---

interface MarketUpdate {
  price: number;
  changePercent: number;
  sparkline: number[];
}

// Generic Cache Item to replace PredictionCacheItem
interface CacheItem<T> {
  data: T;
  timestamp: number;
}

// Internal type for AI Idea Engine Cache
interface IdeaCacheItem {
  insights: AiInsight[];
  suggestions: StockSuggestion[];
  timestamp: number;
}

// --- STATE INTERFACE ---

interface AppState {
  // 1. AUTH & SESSION
  token: string | null;
  userEmail: string | null;
  setToken: (token: string | null, email: string | null) => void;
  logout: () => void;

  // 2. USER DATA (Local DB Equivalents)
  portfolio: StockEntity[];
  watchlist: WatchlistEntity[];
  transactions: TransactionItem[];
  setPortfolio: (data: StockEntity[]) => void;
  setWatchlist: (data: WatchlistEntity[]) => void;
  setTransactions: (data: TransactionItem[]) => void;
  
  // 3. MARKET DATA & SEARCH
  marketData: Record<string, MarketUpdate>;
  updateMarketData: (symbol: string, update: Partial<MarketUpdate>) => void;
  
  searchResults: any[];
  setSearchResults: (results: any[]) => void;

  // 🌟 NEW: EXPLORE SCREEN DATA
  trendingStocks: TrendingStockDto[];
  globalIndices: CommodityDto[];
  commodities: CommodityDto[];
  setTrendingStocks: (data: TrendingStockDto[]) => void;
  setGlobalIndices: (data: CommodityDto[]) => void;
  setCommodities: (data: CommodityDto[]) => void;

  // 4. SESSION-LEVEL CACHES (From PortfolioRepository)
  infoCache: Record<string, CacheItem<StockInfoDto>>;
  liveCache: Record<string, CacheItem<StockLiveDto>>;
  newsCache: Record<string, CacheItem<StockNews[]>>;
  analystCache: Record<string, CacheItem<AnalystData>>;
  esgCache: Record<string, CacheItem<ESGData>>;
  optionsCache: Record<string, CacheItem<string[]>>;

  setInfoCache: (symbol: string, data: StockInfoDto) => void;
  setLiveCache: (cacheKey: string, data: StockLiveDto) => void; // e.g., "AAPL_1D"
  setNewsCache: (symbol: string, data: StockNews[]) => void;
  setAnalystCache: (symbol: string, data: AnalystData) => void;
  setEsgCache: (symbol: string, data: ESGData) => void;
  setOptionsCache: (symbol: string, data: string[]) => void;

  // 5. AI & PREDICTION CACHES
  predictionCache: Record<string, CacheItem<DeepAnalysisResponse>>;
  cachePrediction: (symbol: string, data: DeepAnalysisResponse) => void;
  
  portfolioHealthCache: CacheItem<PortfolioSummary> | null;
  setPortfolioHealthCache: (data: PortfolioSummary) => void;

  portfolioAuditCache: IdeaCacheItem | null;
  setPortfolioAuditCache: (data: IdeaCacheItem) => void;

  thematicFinderCache: Record<string, IdeaCacheItem>; 
  setThematicFinderCache: (theme: string, data: IdeaCacheItem) => void;

  // 6. PREFERENCES
  isUsd: boolean;
  liveRate: number;
  toggleCurrency: () => void;
  setLiveRate: (rate: number) => void;
  
  notificationsEnabled: boolean;
  toggleNotifications: () => void;
  
  themeMode: number; 
  setThemeMode: (mode: number) => void;

  // 7. UTILS
  clearAllCaches: () => void;
}

// --- STORE IMPLEMENTATION ---

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      // --- INITIAL STATE ---
      token: typeof window !== 'undefined' ? localStorage.getItem('apex_token') : null,
      userEmail: typeof window !== 'undefined' ? localStorage.getItem('apex_email') : null,
      
      portfolio: [],
      watchlist: [],
      transactions: [],
      
      marketData: {},
      searchResults: [],

      // 🌟 Explore Data Init
      trendingStocks: [],
      globalIndices: [],
      commodities: [],
      
      // Standard Caches Init
      infoCache: {},
      liveCache: {},
      newsCache: {},
      analystCache: {},
      esgCache: {},
      optionsCache: {},

      // AI Caches Init
      predictionCache: {},
      portfolioHealthCache: null,
      portfolioAuditCache: null,
      thematicFinderCache: {},

      // Settings Init
      isUsd: false,
      liveRate: 84.0,
      notificationsEnabled: true,
      themeMode: 2,

      // --- ACTIONS ---

      setToken: (token, email) => {
        if (typeof window !== 'undefined') {
          if (token) {
            localStorage.setItem('apex_token', token);
            localStorage.setItem('apex_email', email || "");
          } else {
            localStorage.removeItem('apex_token');
            localStorage.removeItem('apex_email');
          }
        }
        set({ token, userEmail: email });
      },

      logout: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('apex_token');
          localStorage.removeItem('apex_email');
        }
        // WIPE ALL DATA ON LOGOUT (Security measure)
        set({ 
          token: null, 
          userEmail: null, 
          portfolio: [],
          watchlist: [],
          transactions: [],
          marketData: {}, 
          searchResults: [],
          trendingStocks: [],
          globalIndices: [],
          commodities: [],
          infoCache: {},
          liveCache: {},
          newsCache: {},
          analystCache: {},
          esgCache: {},
          optionsCache: {},
          predictionCache: {}, 
          portfolioHealthCache: null,
          portfolioAuditCache: null,
          thematicFinderCache: {}
        });
      },

      // --- USER DATA ACTIONS ---
      setPortfolio: (data) => set({ portfolio: data }),
      setWatchlist: (data) => set({ watchlist: data }),
      setTransactions: (data) => set({ transactions: data }),

      // --- MARKET DATA ACTIONS ---
      updateMarketData: (symbol, update) => set((state) => ({
        marketData: {
          ...state.marketData,
          [symbol]: {
            ...(state.marketData[symbol] || { price: 0, changePercent: 0, sparkline: [] }),
            ...update
          }
        }
      })),
      setSearchResults: (results) => set({ searchResults: results }),

      // 🌟 EXPLORE DATA ACTIONS
      setTrendingStocks: (data) => set({ trendingStocks: data }),
      setGlobalIndices: (data) => set({ globalIndices: data }),
      setCommodities: (data) => set({ commodities: data }),

      // --- STANDARD CACHE ACTIONS ---
      setInfoCache: (symbol, data) => set((state) => ({
        infoCache: { ...state.infoCache, [symbol.toUpperCase()]: { data, timestamp: Date.now() } }
      })),
      setLiveCache: (cacheKey, data) => set((state) => ({
        liveCache: { ...state.liveCache, [cacheKey.toUpperCase()]: { data, timestamp: Date.now() } }
      })),
      setNewsCache: (symbol, data) => set((state) => ({
        newsCache: { ...state.newsCache, [symbol.toUpperCase()]: { data, timestamp: Date.now() } }
      })),
      setAnalystCache: (symbol, data) => set((state) => ({
        analystCache: { ...state.analystCache, [symbol.toUpperCase()]: { data, timestamp: Date.now() } }
      })),
      setEsgCache: (symbol, data) => set((state) => ({
        esgCache: { ...state.esgCache, [symbol.toUpperCase()]: { data, timestamp: Date.now() } }
      })),
      setOptionsCache: (symbol, data) => set((state) => ({
        optionsCache: { ...state.optionsCache, [symbol.toUpperCase()]: { data, timestamp: Date.now() } }
      })),

      // --- AI CACHE ACTIONS ---
      cachePrediction: (symbol, data) => set((state) => ({
        predictionCache: { ...state.predictionCache, [symbol.toUpperCase()]: { data, timestamp: Date.now() } }
      })),
      setPortfolioHealthCache: (data) => set({
        portfolioHealthCache: { data, timestamp: Date.now() }
      }),
      setPortfolioAuditCache: (data) => set({ portfolioAuditCache: data }),
      setThematicFinderCache: (theme, data) => set((state) => ({
        thematicFinderCache: { ...state.thematicFinderCache, [theme.toLowerCase()]: data }
      })),

      // --- PREFERENCE ACTIONS ---
      toggleCurrency: () => set((state) => ({ isUsd: !state.isUsd })),
      setLiveRate: (rate) => set({ liveRate: rate }),
      toggleNotifications: () => set((state) => ({ notificationsEnabled: !state.notificationsEnabled })),
      setThemeMode: (mode) => set({ themeMode: mode }),

      // --- MASTER CLEAR ---
      clearAllCaches: () => set({
        infoCache: {},
        liveCache: {},
        newsCache: {},
        analystCache: {},
        esgCache: {},
        optionsCache: {},
        predictionCache: {},
        portfolioHealthCache: null,
        portfolioAuditCache: null,
        thematicFinderCache: {},
        trendingStocks: [],
        globalIndices: [],
        commodities: []
      }),
    }),
    {
      name: 'apex-invest-storage',
      storage: createJSONStorage(() => localStorage),
      // Partialize: Everything listed here survives a browser refresh
      partialize: (state) => ({ 
        token: state.token, 
        userEmail: state.userEmail,
        isUsd: state.isUsd,
        liveRate: state.liveRate,
        notificationsEnabled: state.notificationsEnabled,
        themeMode: state.themeMode,
        
        portfolio: state.portfolio,
        watchlist: state.watchlist,
        transactions: state.transactions,
        marketData: state.marketData, 

        // 🌟 Explore Screen Persistence
        trendingStocks: state.trendingStocks,
        globalIndices: state.globalIndices,
        commodities: state.commodities,
        
        infoCache: state.infoCache,
        liveCache: state.liveCache,
        newsCache: state.newsCache,
        analystCache: state.analystCache,
        esgCache: state.esgCache,
        optionsCache: state.optionsCache,
        
        predictionCache: state.predictionCache, 
        portfolioHealthCache: state.portfolioHealthCache,
        portfolioAuditCache: state.portfolioAuditCache,
        thematicFinderCache: state.thematicFinderCache
      }),
    }
  )
);