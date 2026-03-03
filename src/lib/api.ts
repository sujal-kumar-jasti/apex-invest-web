'use client';

import axios, { AxiosInstance } from 'axios';
import { 
  AuthRequest, 
  VerifyOtpRequest, 
  ResetPasswordRequest, 
  ChangePasswordRequest,
  GoogleAuthRequest, 
  TransactionItem, 
  WatchlistItem, 
  SyncResponse, 
  AuthResponse, 
  StockInfoDto,
  StockLiveDto, 
  StockSearchResult, 
  CollectionItem, 
  ScreenerResult, 
  AnalystData,
  ESGData, 
  OptionsExpirationsResponse, 
  OptionsChainResponse, 
  JobInitResponse,
  JobStatusResponse, 
  ExchangeRateResponse, 
  IdeaResponse,
  StockDetailsResponse,
  StockNews,
  TrendingStockDto, // Preserved
  CommodityDto,     // Preserved
  CommodityUiModel  // Preserved
} from '../types';

/**
 * --- 1. PROXY & BASE URL MAPPING ---
 * Corrected to use relative paths so they trigger next.config.ts rewrites.
 */
const BASE_URLS = {
  RENDER: "/api",            // Maps to apexinvest-api-5ql5.onrender.com
  LIVE: "/api/live",        // Maps to sujal7337-stock-api.hf.space
  PYTHON: "/api/python",    // jsujalkumar7899-stock-api.hf.space
  GLOBAL: "/api/global",    // sujal7899-stocks-api.hf.space
  AI: "/api/ai",            // swapna7899-prognosai-fastapi-backend-1.hf.space
  ADVANCED: "/api/advanced", // sujal7337-stock-details.hf.space
  PROGNOS: "/api/prognos",   // sujal7899-prognos-data-engine.hf.space
  IDEAS: "/api/ideas",      // sujal8310-apex-invest-ideas-generator.hf.space
  CURRENCY: "https://api.exchangerate-api.com/v4/latest/" // 🌟 Live Currency API
};

/**
 * --- 2. CLIENT CONFIGURATIONS ---
 */

const createAuthClient = (baseUrl: string): AxiosInstance => {
  const instance = axios.create({
    baseURL: baseUrl,
    headers: { 'Content-Type': 'application/json' },
    timeout: 30000 
  });

  // JWT Interceptor for Cloud Sync
  instance.interceptors.request.use((config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('apex_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  }, (error) => Promise.reject(error));

  return instance;
};

// Heavy Duty Client (10-minute timeout for Monte Carlo)
const heavyClient = axios.create({
  baseURL: BASE_URLS.AI,
  headers: { 'Content-Type': 'application/json' },
  timeout: 600000 
});

// Standard Shared Client Helper
const sharedClient = (baseUrl: string) => axios.create({
  baseURL: baseUrl,
  timeout: 30000
});

// Instance Definitions
export const authApi = createAuthClient(BASE_URLS.RENDER);
const liveClient = sharedClient(BASE_URLS.LIVE);
const pythonClient = sharedClient(BASE_URLS.PYTHON);
const globalClient = sharedClient(BASE_URLS.GLOBAL);
const advancedClient = sharedClient(BASE_URLS.ADVANCED);
const prognosClient = sharedClient(BASE_URLS.PROGNOS);
const ideasClient = sharedClient(BASE_URLS.IDEAS);
const currencyClient = sharedClient(BASE_URLS.CURRENCY);

/**
 * --- 3. EXPORTED API REPOSITORY ---
 */
export const apexApi = {
  
  /** @section Auth & Cloud Sync */
  register: (data: AuthRequest) => authApi.post<AuthResponse>('/auth/register', data),
  verifyOtp: (data: VerifyOtpRequest) => authApi.post<AuthResponse>('/auth/verify-otp', data),
  login: (data: AuthRequest) => authApi.post<AuthResponse>('/auth/login', data),
  forgotPassword: (data: { email: string }) => authApi.post<AuthResponse>('/auth/forgot-password', data),
  resetPassword: (data: ResetPasswordRequest) => authApi.post<AuthResponse>('/auth/reset-password', data),
  googleLogin: (data: GoogleAuthRequest) => authApi.post<AuthResponse>('/auth/google', data),

  // Protected Routes
  sync: () => authApi.get<SyncResponse>('/user/sync'),
  changePassword: (data: ChangePasswordRequest) => authApi.post<AuthResponse>('/user/change-password', data),
  recordTrade: (trade: TransactionItem) => authApi.post<AuthResponse>('/user/trade', trade),
  updateCloudWatchlist: (item: WatchlistItem) => authApi.post('/user/watchlist', item),
  deleteFromCloudWatchlist: (item: WatchlistItem) => authApi.post('/user/watchlist/remove', item),
  deleteCloudPortfolioItem: (symbol: string) => authApi.delete(`/user/portfolio/${symbol}`),
  clearCloudTransactions: () => authApi.delete('/user/transactions'),
  deleteCloudTransaction: (id: string) => authApi.delete(`/user/transactions/${id}`),
  deleteUserAccount: () => authApi.delete('/user/account'),

  /** @section Market Data Routing */
  search: (q: string) => liveClient.get<StockSearchResult[]>('search', { params: { q } }),
  getStockLive: (symbol: string, range = "1d") => 
    liveClient.get<StockLiveDto>(`stock/${symbol}/live`, { params: { range } }),
  
  // 🌟 INDIAN vs GLOBAL INFO ROUTING
  getIndianStockInfo: (symbol: string) => pythonClient.get<StockInfoDto>(`stock/${symbol}/info`),
  getGlobalStockInfo: (symbol: string) => globalClient.get<StockInfoDto>(`stock/${symbol}/info`),
  
  getCollection: (type: string) => globalClient.get<CollectionItem[]>(`collections/${type}`),
  
  runScreener: (params: { sector?: string, market_cap_min?: number, pe_min?: number, pe_max?: number }) => 
    globalClient.post<ScreenerResult[]>('screener', null, { params }),

  /** @section Advanced Analytics */
  getAnalystRatings: (symbol: string) => advancedClient.get<AnalystData>(`stock/${symbol}/analysts`),
  getEsgScores: (symbol: string) => advancedClient.get<ESGData>(`stock/${symbol}/esg`),
  getOptionsExpirations: (symbol: string) => advancedClient.get<OptionsExpirationsResponse>(`stock/${symbol}/options`),
  getOptionsChain: (symbol: string, date: string) => 
    advancedClient.get<OptionsChainResponse>(`stock/${symbol}/options/${date}`),

  /** @section AI Prediction Jobs */
  analyzeStock: (symbol: string) => 
    heavyClient.post<JobInitResponse>('/api/v1/analyze/stock', null, { params: { symbol } }),
  
  analyzePortfolio: (symbols: string[]) => 
    heavyClient.post<JobInitResponse>('/api/v1/analyze/portfolio', { symbols }),
    
  checkJobStatus: (jobId: string) => 
    heavyClient.get<JobStatusResponse>(`/api/v1/jobs/${jobId}`),

  /** @section AI Idea Engine */
  getPortfolioAnalysis: (summary: string) => ideasClient.post<IdeaResponse>('generate/portfolio-ideas', { summary }),
  getThematicAnalysis: (theme: string) => ideasClient.post<IdeaResponse>('generate/thematic-ideas', { theme }),

  /** @section Market Intelligence & News */
  getTrending: () => prognosClient.get<TrendingStockDto[]>('/market/trending'),
  getGlobalIndices: () => prognosClient.get<CommodityDto[]>('/market/global'),
  getCommodities: () => prognosClient.get<CommodityDto[]>('/market/commodities'),
  getNews: (symbol: string) => prognosClient.get<StockNews[]>(`/news/${symbol}`),

  /** @section Analytics (Python Service) */
  getMovingAverages: (symbol: string) => pythonClient.get(`/analytics/${symbol}/ma`),
  getRsi: (symbol: string) => pythonClient.get(`/analytics/${symbol}/rsi`),

  /** @section Live Currency Sync */
  getExchangeRate: (base: string = "USD") => currencyClient.get<ExchangeRateResponse>(base)
};


/**
 * ============================================================================
 * --- 4. PORTFOLIO REPOSITORY TS MIRROR ---
 * ============================================================================
 */

type CacheEntry<T> = {
  data: T;
  timestamp: number;
};

// Internal Repository Entities
interface RepoStockEntity { symbol: string; quantity: number; buyPrice: number; currentPrice: number; lastUpdated: string; dailyChange: number; }
interface RepoWatchlistEntity { symbol: string; lastPrice: number; }

export class PortfolioRepository {
  private TAG = "PortfolioRepository";

  private isIndian = (symbol: string) => symbol.toUpperCase().endsWith(".NS") || symbol.toUpperCase().endsWith(".BO");

  // --- IN-MEMORY CACHES ---
  private infoCache = new Map<string, CacheEntry<StockInfoDto>>();
  private liveCache = new Map<string, CacheEntry<StockLiveDto>>();
  private newsCache = new Map<string, CacheEntry<StockNews[]>>();
  private analystCache = new Map<string, CacheEntry<AnalystData>>();
  private esgCache = new Map<string, CacheEntry<ESGData>>();
  private optionsCache = new Map<string, CacheEntry<string[]>>();
  private deepAnalysisCache = new Map<string, CacheEntry<any>>();
  private portfolioSummaryCache = new Map<string, CacheEntry<any>>();
  private marketPulseCache = new Map<string, CacheEntry<any>>(); 
  private rateCache: CacheEntry<number> | null = null; // 🌟 FX Cache

  // Local Stores
  public localPortfolio: RepoStockEntity[] = [];
  public localWatchlist: RepoWatchlistEntity[] = [];
  public localTransactions: TransactionItem[] = [];

  /**
   * --- 🌟 RESILIENT CURRENCY ENGINE ---
   * Fetches live conversion rates from the API with session caching.
   * @param forceRefresh - If true, bypasses the 5-minute cache.
   */
  async getConversionRate(forceRefresh = false): Promise<number> {
    const now = Date.now();
    const TTL = 300000; // 5 Minutes

    if (!forceRefresh && this.rateCache && (now - this.rateCache.timestamp < TTL)) {
      return this.rateCache.data;
    }

    try {
      const { data } = await apexApi.getExchangeRate("USD");
      const rate = data.rates?.["INR"] ?? 91.0; 
      this.rateCache = { data: rate, timestamp: now };
      return rate;
    } catch (e) {
      console.error(`[${this.TAG}] FX API Failure. Falling back to cache.`);
      return this.rateCache ? this.rateCache.data : 91.0;
    }
  }

  // --- MARKET DATA FETCHERS (SESSION CACHING) ---
  async fetchMarketPulse(type: 'trending' | 'global' | 'commodities', forceRefresh = false) {
    const now = Date.now();
    const entry = this.marketPulseCache.get(type);
    
    if (!forceRefresh && entry && (now - entry.timestamp < 300000)) {
      return entry.data;
    }

    try {
      let res;
      if (type === 'trending') res = await apexApi.getTrending();
      else if (type === 'global') res = await apexApi.getGlobalIndices();
      else res = await apexApi.getCommodities();

      this.marketPulseCache.set(type, { data: res.data, timestamp: now });
      return res.data;
    } catch (e) {
      console.error(`[${this.TAG}] Failed to fetch ${type}`, e);
      return entry ? entry.data : []; 
    }
  }

  /**
   * --- PROCESS COMMODITIES (Mirrors Kotlin logic) ---
   */
  public async processCommodities(list: CommodityDto[], forceRate?: number): Promise<CommodityUiModel[]> {
    const rate = forceRate ?? await this.getConversionRate();
    
    return list.map(item => {
      const safePrice = item.price ?? 0.0;
      const safeCurrency = item.currency ?? "USD";
      const safeChangePercent = item.changePercent ?? 0.0;
      const safeName = item.name ?? item.symbol;

      let displayPrice = safePrice;
      let displayPrefix = this.getCurrencySymbol(safeCurrency);

      if (item.symbol === "GOLDBEES.NS") {
        displayPrice = safePrice * 1225; displayPrefix = "₹";
      } else if (item.symbol === "SILVERBEES.NS") {
        displayPrice = safePrice * 1058; displayPrefix = "₹";
      } else if (item.symbol === "USO") {
        displayPrice = safePrice * rate; displayPrefix = "₹";
      } else if (item.type === "COMMODITY" && safeCurrency === "USD") {
        displayPrice = safePrice * rate; displayPrefix = "₹";
      }

      const isPositive = safeChangePercent >= 0;
      const sign = isPositive ? "+" : "";

      return {
        symbol: item.symbol,
        name: safeName,
        value: `${displayPrefix}${displayPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        isPositive,
        changePercent: `${sign}${safeChangePercent.toFixed(2)}%`
      };
    });
  }

  private getCurrencySymbol(code: string): string {
    const symbols: Record<string, string> = { "INR": "₹", "USD": "$", "GBP": "£", "EUR": "€", "JPY": "¥", "CNY": "¥", "HKD": "HK$" };
    return symbols[code] || "";
  }

  // --- 1. CLOUD SYNC LOGIC ---
  async fullCloudSync() {
    try {
      if (typeof window === 'undefined' || !localStorage.getItem('apex_token')) return;
      
      const response = await apexApi.sync();
      if (response.status === 200 && response.data) {
        const cloudData = response.data;
        console.log(`[${this.TAG}] SYNC SUCCESS! Portfolio: ${cloudData.portfolio.length}`);

        this.localPortfolio = cloudData.portfolio.map(item => ({
          symbol: item.symbol,
          quantity: item.quantity,
          buyPrice: item.averageBuyPrice,
          currentPrice: 0.0,
          lastUpdated: item.lastUpdated,
          dailyChange: 0.0
        }));

        this.localWatchlist = cloudData.watchlist.map(item => ({ symbol: item.symbol, lastPrice: 0.0 }));
        this.localTransactions = cloudData.transactions;

        this.portfolioSummaryCache.clear();
        this.deepAnalysisCache.clear();

        await this.syncAllDataAndPrices();
      }
    } catch (e) {
      console.error(`[${this.TAG}] SYNC CRASHED`, e);
      throw e; 
    }
  }

  // --- 2. STOCK DETAILS & STREAMING FLOW ---
  async searchStocks(query: string): Promise<StockSearchResult[]> {
    try {
      const res = await apexApi.search(query);
      return res.data;
    } catch { return []; }
  }

  async *getFullStockDetailsStream(symbol: string, range: string, forceRefresh = false) {
    const symbolClean = symbol.toUpperCase().trim();
    const rangeClean = range.toUpperCase().trim();
    const liveCacheKey = `${symbolClean}_${rangeClean}`;
    const now = Date.now();

    const fiveMins = 5 * 60 * 1000;
    const twelveHours = 12 * 60 * 60 * 1000;

    let liveData = (!forceRefresh && this.liveCache.has(liveCacheKey) && (now - this.liveCache.get(liveCacheKey)!.timestamp < fiveMins)) ? this.liveCache.get(liveCacheKey)!.data : null;
    let infoData = (!forceRefresh && this.infoCache.has(symbolClean) && (now - this.infoCache.get(symbolClean)!.timestamp < twelveHours)) ? this.infoCache.get(symbolClean)!.data : null;
    let newsData = (!forceRefresh && this.newsCache.has(symbolClean) && (now - this.newsCache.get(symbolClean)!.timestamp < twelveHours)) ? this.newsCache.get(symbolClean)!.data : [];
    let analystData = (!forceRefresh && this.analystCache.has(symbolClean) && (now - this.analystCache.get(symbolClean)!.timestamp < twelveHours)) ? this.analystCache.get(symbolClean)!.data : null;
    let esgData = (!forceRefresh && this.esgCache.has(symbolClean) && (now - this.esgCache.get(symbolClean)!.timestamp < twelveHours)) ? this.esgCache.get(symbolClean)!.data : null;
    let optionsExpirations = (!forceRefresh && this.optionsCache.has(symbolClean) && (now - this.optionsCache.get(symbolClean)!.timestamp < twelveHours)) ? this.optionsCache.get(symbolClean)!.data : null;

    const buildResponse = (): StockDetailsResponse | null => {
      const fallbackLive = this.liveCache.get(`${symbolClean}_1D`)?.data;
      if (!liveData && !infoData && !fallbackLive) return null;
      
      const baseLive = liveData || fallbackLive;
      const firstCandleClose = liveData?.candles?.[0]?.close || 0.0;

      const finalChange = (rangeClean !== "1D" && firstCandleClose !== 0) 
        ? ((baseLive?.price || 0) - firstCandleClose) 
        : (baseLive?.change || 0);

      const finalChangePct = (rangeClean !== "1D" && firstCandleClose !== 0)
        ? (finalChange / firstCandleClose) * 100
        : (baseLive?.changePercent || 0);

      return {
        symbol: baseLive?.symbol || symbolClean,
        name: infoData?.name || symbolClean,
        price: baseLive?.price || 0.0,
        change: finalChange,
        changePercent: finalChangePct,
        currency: infoData?.currency || (this.isIndian(symbolClean) ? "INR" : "USD"),
        prevClose: baseLive?.previousClose || 0.0,
        open: baseLive?.open || 0.0,
        dayHigh: baseLive?.dayHigh || 0.0,
        dayLow: baseLive?.dayLow || 0.0,
        yearHigh: baseLive?.yearHigh || 0.0,
        yearLow: baseLive?.yearLow || 0.0,
        sector: infoData?.sector || null,
        industry: infoData?.industry || null,
        description: infoData?.description || null,
        candles: liveData?.candles || [],
        fundamentals: infoData?.fundamentals || null,
        financials: infoData?.financials || null,
        shareholding: infoData?.shareholding || null,
        similarStocks: infoData?.similar_stocks || [],
        news: newsData,
        analystData: analystData || undefined,
        esgData: esgData || undefined,
        optionsExpirations: optionsExpirations || undefined
      };
    };

    if (infoData || liveData) {
      yield { result: buildResponse(), isComplete: false };
    }

    const promises = [];

    if (!liveData || forceRefresh) {
      promises.push(apexApi.getStockLive(symbolClean, range).then(res => {
        liveData = res.data;
        this.liveCache.set(liveCacheKey, { data: res.data, timestamp: Date.now() });
      }).catch(() => {}));
    }

    if (!infoData || forceRefresh) {
      const infoRequest = this.isIndian(symbolClean) 
        ? apexApi.getIndianStockInfo(symbolClean) 
        : apexApi.getGlobalStockInfo(symbolClean);

      promises.push(infoRequest.then(res => {
        infoData = res.data;
        this.infoCache.set(symbolClean, { data: res.data, timestamp: Date.now() });
      }).catch(() => {}));
    }

    if (newsData.length === 0 || forceRefresh) {
      promises.push(apexApi.getNews(symbolClean).then(res => {
        newsData = res.data;
        this.newsCache.set(symbolClean, { data: res.data, timestamp: Date.now() });
      }).catch(() => {}));
    }

    if (!analystData || forceRefresh) {
      promises.push(new Promise(resolve => setTimeout(resolve, 200)).then(() => apexApi.getAnalystRatings(symbolClean)).then(res => {
        analystData = res.data;
        this.analystCache.set(symbolClean, { data: res.data, timestamp: Date.now() });
      }).catch(() => {}));
    }

    if (!esgData || forceRefresh) {
      promises.push(new Promise(resolve => setTimeout(resolve, 400)).then(() => apexApi.getEsgScores(symbolClean)).then(res => {
        esgData = res.data;
        this.esgCache.set(symbolClean, { data: res.data, timestamp: Date.now() });
      }).catch(() => {}));
    }

    if (!optionsExpirations || forceRefresh) {
      promises.push(new Promise(resolve => setTimeout(resolve, 600)).then(() => apexApi.getOptionsExpirations(symbolClean)).then(res => {
        optionsExpirations = res.data.expirations;
        this.optionsCache.set(symbolClean, { data: res.data.expirations, timestamp: Date.now() });
      }).catch(() => {}));
    }

    await Promise.allSettled(promises);

    if (!liveData && !infoData) {
      throw new Error("Failed to load stock data.");
    } else {
      yield { result: buildResponse(), isComplete: true };
    }
  }

  // --- 3. TRADE RECORDING & SYNC ---
  async fetchAndUpdatePrice(symbol: string) {
    try {
      const res = await apexApi.getStockLive(symbol.toUpperCase(), "1d");
      const data = res.data;
      this.liveCache.set(`${symbol.toUpperCase()}_1D`, { data, timestamp: Date.now() });
      
      const pIdx = this.localPortfolio.findIndex(s => s.symbol === symbol.toUpperCase());
      if (pIdx > -1 && data.price > 0) {
        this.localPortfolio[pIdx].currentPrice = data.price;
        this.localPortfolio[pIdx].dailyChange = data.changePercent;
      }
    } catch {}
  }

  async recordTrade(symbol: string, type: "BUY" | "SELL", qty: number, price: number) {
     const timestamp = Date.now();
     try {
        await apexApi.recordTrade({
           symbol: symbol.toUpperCase(),
           type,
           quantity: qty,
           price,
           timestamp,
           notes: `Trade recorded at ${new Date().toISOString()}`
        });
        await this.fetchAndUpdatePrice(symbol);
     } catch (e) {
        console.error("Trade Sync Failed", e);
     }
  }

  async syncAllDataAndPrices() {
    const symbols = Array.from(new Set([
      ...this.localPortfolio.map(s => s.symbol),
      ...this.localWatchlist.map(s => s.symbol)
    ]));

    const CONCURRENCY_LIMIT = 8;
    for (let i = 0; i < symbols.length; i += CONCURRENCY_LIMIT) {
      const chunk = symbols.slice(i, i + CONCURRENCY_LIMIT);
      await Promise.allSettled(chunk.map(sym => this.fetchAndUpdatePrice(sym)));
    }
  }

  // --- 4. AI ANALYSIS FLOWS ---
  async *getDeepAnalysisStream(symbol: string, forceRefresh = false) {
    const s = symbol.toUpperCase().trim();
    if (this.deepAnalysisCache.has(s) && !forceRefresh) {
      yield { status: "COMPLETED", data: this.deepAnalysisCache.get(s)!.data };
      return;
    }
    
    try {
      yield { status: this.deepAnalysisCache.has(s) ? "Refreshing AI Data..." : "Initializing AI Engine...", data: this.deepAnalysisCache.get(s)?.data };
      const initRes = await apexApi.analyzeStock(s);
      const jobId = initRes.data.job_id;

      while (true) {
        const statusRes = await apexApi.checkJobStatus(jobId);
        if (statusRes.status === 200 && statusRes.data.status === "COMPLETED") {
          const resultData = JSON.parse(statusRes.data.data || "{}");
          this.deepAnalysisCache.set(s, { data: resultData, timestamp: Date.now() });
          yield { status: "COMPLETED", data: resultData };
          break;
        } else if (statusRes.status === 200 && statusRes.data.status === "FAILED") {
          yield { status: "Error", data: null };
          break;
        } else {
          yield { status: statusRes.data.status, data: this.deepAnalysisCache.get(s)?.data };
        }
        await new Promise(r => setTimeout(r, 3000));
      }
    } catch { yield { status: "Error", data: null }; }
  }

  // --- 5. CLEANUP ---
  clearAllLocalData() {
    this.localPortfolio = [];
    this.localWatchlist = [];
    this.localTransactions = [];
    if (typeof window !== 'undefined') localStorage.removeItem('apex_token');
    
    this.infoCache.clear();
    this.liveCache.clear();
    this.newsCache.clear();
    this.analystCache.clear();
    this.esgCache.clear();
    this.optionsCache.clear();
    this.deepAnalysisCache.clear();
    this.portfolioSummaryCache.clear();
    this.marketPulseCache.clear();
    this.rateCache = null;
  }

  // Helper for components
  public getCachedLive(symbol: string): StockLiveDto | null {
    const symbolClean = symbol.toUpperCase().trim();
    const entry = this.liveCache.get(`${symbolClean}_1D`);
    return entry ? entry.data : null;
  }
}

// Export singleton instance for React components to consume
export const portfolioRepo = new PortfolioRepository();