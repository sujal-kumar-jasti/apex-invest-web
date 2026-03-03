/**
 * --- 1. AUTHENTICATION & SECURITY (ApexAuthApiService.kt) ---
 */
export interface AuthRequest {
  email: string;
  password?: string;
}

export interface VerifyOtpRequest extends AuthRequest {
  otp: string;
}

export interface AuthResponse {
  token?: string;
  email?: string;
  message: string;
  isGoogleUser?: boolean;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  email: string;
  otp: string;
  newPassword?: string;
}

export interface GoogleAuthRequest {
  idToken: string;
}

export interface ChangePasswordRequest {
  email: string;
  oldPassword?: string;
  newPassword?: string;
}

/**
 * --- 2. CLOUD SYNC & TRADING (PortfolioItem.kt / TransactionItem.kt) ---
 */
export interface PortfolioItem {
  symbol: string;
  quantity: number;
  averageBuyPrice: number;
  lastUpdated: string;
}

export interface WatchlistItem {
  symbol: string;
}

export enum TransactionType {
  BUY = "BUY",
  SELL = "SELL"
}

export interface TransactionItem {
  symbol: string;
  type: TransactionType | "BUY" | "SELL";
  quantity: number;
  price: number;
  fees?: number;
  notes?: string | null;
  timestamp: number; 
}

export interface SyncResponse {
  portfolio: PortfolioItem[];
  watchlist: WatchlistItem[];
  transactions: TransactionItem[];
}

/**
 * --- 3. CORE ASSET ENTITIES & LIVE DATA (StockLiveDto.kt & DAOs) ---
 */

export interface StockEntity {
  symbol: string;
  name?: string;
  quantity: number;
  buyPrice: number;
  currentPrice: number;
  dailyChange: number;
  changePercent?: number;
  lastUpdated: string;
  sector?: string;
}

export interface WatchlistEntity {
  symbol: string;
  lastPrice: number;
}

export interface TransactionEntity {
  id?: string | number;
  symbol: string;
  type: TransactionType | "BUY" | "SELL";
  quantity: number;
  price: number;
  timestamp: number;
  fees: number;
  notes: string;
}

export interface StockLiveDto {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  previousClose: number;
  open: number;
  dayHigh: number;
  dayLow: number;
  yearHigh: number;
  yearLow: number;
  candles: CandlePoint[];
}

export interface StockSearchResult {
  symbol: string; 
  name: string | null;
  exchange: string | null;
  type: string | null;
  exch?: string; 
}

/**
 * --- 4. EXPLORE & TRENDING DTOs (TrendingStockDto.kt / CommodityDto.kt) ---
 */

export interface TrendingStockDto {
  symbol: string;
  name: string | null;
  price: number | null;
  changePercent: number | null; 
  currency: string | null;
}

export interface CommodityDto {
  symbol: string;
  name: string | null;
  type: string | null;
  currency: string | null;
  price: number | null;
  changePercent: number | null;
  isPositive?: boolean; 
}

/**
 * 🌟 NEW: UI Model for processed display
 */
export interface CommodityUiModel {
    symbol: string;
    name: string;
    value: string;
    isPositive: boolean;
    changePercent: string;
}

/**
 * --- 5. MARKET DATA & MASTER UI MODEL (StockInfoDto.kt) ---
 */

export interface StockDetailsResponse {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
  prevClose: number;
  open: number;
  dayHigh: number;
  dayLow: number;
  yearHigh: number;
  yearLow: number;
  sector?: string | null;
  industry?: string | null;
  description?: string | null;
  candles: CandlePoint[];
  fundamentals?: Fundamentals | null;
  financials?: Financials | null;
  shareholding?: Shareholding | null;
  similarStocks: SimilarStock[];
  news: StockNews[];
  analystData?: AnalystData | null;
  esgData?: ESGData | null;
  optionsExpirations?: string[] | null;
}

export interface CandlePoint {
  time: string; 
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Fundamentals {
  market_cap: number;
  market_cap_class: string; 
  pe_ratio: number | null;
  pb_ratio: number | null;
  debt_to_equity: number | null;
  book_value: number | null;
  dividend_yield: number | null;
  roe: number | null;
  eps: number | null;
  industry_pe: number | null;
}

export interface YearValue {
  period: string; 
  value: number;
  growth: number;
}

export interface Financials {
  revenue: YearValue[];
  profit: YearValue[];
  net_worth: YearValue[];
}

export interface Shareholding {
  promoters: number;
  retail: number;
  institutions: number;
  foreign_institutions?: number | null;
  domestic_institutions?: number | null;
  mutual_funds?: number | null;
}

export interface StockInfoDto {
  name: string;
  currency: string;
  sector: string | null;
  industry: string | null;
  description: string | null;
  fundamentals: Fundamentals | null;
  financials: Financials | null;
  shareholding: Shareholding | null;
  similar_stocks: SimilarStock[];
  news: StockNews[]; 
  analystData: AnalystData | null;
  esgData: ESGData | null;
  optionsExpirations: string[] | null;
}

export interface StockNews {
  title: string | null;
  publisher: string | null;
  link: string | null;
  published: string | null; 
  date?: string; 
  sentiment_label?: string;
  score?: number;
}

export interface SimilarStock {
  symbol: string;
  name: string;
  price: number;
  change_percent: number;
  market_cap?: number | null;
}

export interface CollectionItem {
  symbol: string;
  price: number;
  changePercent: number;
  volume: number;
}

export interface ScreenerResult {
  symbol: string;
  name: string;
  price: number;
  change_percent: number;
  market_cap: number;
  sector: string;
  pe_ratio: number | null;
}

/**
 * --- 6. AI & DEEP ANALYSIS (DeepAnalysisResponse.kt) ---
 */
export interface HistoricalPricePoint {
  date: string; 
  close: number;
  volume: number;
  ma_50?: number | null;
  rsi_14?: number | null;
  macd?: number | null;
  macd_signal?: number | null;
}

export interface MonteCarloPoint {
  date: string;
  mean_price: number;
  bull_case_90th: number;
  bear_case_10th: number;
}

export interface SentimentAnalysis {
  overall_score: number;
  label: string;
  news_articles: NewsItem[];
}

export interface NewsItem {
  title: string;
  link: string;
  publisher: string;
  sentiment_label: string;
  score: number;
}

export interface AgentSynthesis {
  fundamental_thesis: string;
  macro_news_thesis: string;
  final_verdict: string;
}

export interface FundamentalMetrics {
  market_cap: string;
  pe_ratio: number;
  debt_to_equity: number;
  put_call_ratio: number;
  institutional_ownership: number;
  revenue_history: ChartPoint[];
  free_cash_flow_history: ChartPoint[];
}

export interface ChartPoint {
  date: string;
  value: number;
}

export interface DeepAnalysisResponse {
  symbol: string;
  current_price: number;
  financial_health_score: string;
  historical_chart_data: HistoricalPricePoint[];
  monte_carlo_forecast: MonteCarloPoint[];
  fundamentals: FundamentalMetrics;
  sentiment: SentimentAnalysis;
  agent_synthesis: AgentSynthesis;
}

/**
 * --- 7. ASYNC JOB HANDLERS (PredictionApiService.kt) ---
 */
export interface JobInitResponse {
  job_id: string;
  status: string;
  message: string;
}

export interface JobStatusResponse {
  status: "pending" | "processing" | "completed" | "failed" | string;
  error?: string | null;
  data?: any; 
}

/**
 * --- 8. PORTFOLIO AI SUMMARY (PortfolioSummary.kt) ---
 */
export interface PortfolioSummary {
  user_id: string;
  total_sentiment_score: number;
  market_mood: string;
  risk_warning: string | null;
  top_pick: string | null;
  stock_breakdowns: DeepAnalysisResponse[];
}

/**
 * --- 9. AI IDEAS & THEMATIC REQUESTS (IdeasApi.kt) ---
 */
export interface PortfolioAnalysisRequest {
  symbols: string[];
}

export interface PortfolioRequest {
  summary: string;
}

export interface ThemeRequest {
  theme: string;
}

export interface IdeaResponse {
  response_text?: string; 
  responseText?: string; 
}

/**
 * --- 10. ADVANCED ANALYTICS (AnalystData.kt / ESGData.kt / Options) ---
 */
export interface ESGData {
  symbol: string;
  total_esg: number | null;
  environment_score: number | null;
  social_score: number | null;
  governance_score: number | null;
  controversy_level: number | null;
}

export interface AnalystRecommendation {
  firm: string;
  to_grade: string;
  from_grade?: string; 
  action: string;
}

export interface AnalystData {
  symbol: string;
  target_high: number | null;
  target_low: number | null;
  target_mean: number | null;
  target_median?: number | null;
  recommendation_key: string | null;
  recommendation_mean?: number | null;
  recent_updates: AnalystRecommendation[];
}

export interface OptionsExpirationsResponse {
  symbol: string;
  expirations: string[];
}

export interface OptionContract {
  strike: number;
  last_price: number;
  bid: number;
  ask: number;
  volume: number;
  open_interest: number;
  implied_volatility: number;
  in_the_money: boolean;
}

export interface OptionsChainResponse {
  symbol: string;
  expiration_date: string;
  calls: OptionContract[];
  puts: OptionContract[];
}

/**
 * --- 11. UI STATE & UI ENTITIES ---
 */
export interface AiInsight {
  type: 'WARNING' | 'OPPORTUNITY' | 'SUCCESS';
  title: string;
  description: string;
}

export interface StockSuggestion {
  symbol: string;
  sector: string;
  reason: string;
}

export interface SectorData {
  sector: string;
  value: number;
  percentage: number;
  color?: string;
}

export interface PortfolioStats {
  totalValue: number;
  totalInvestment: number;
  unrealizedPnl: number;
  pnlPercentage: number;
  isProfit: boolean;
}

export interface MarketPulse {
  price: number;
  changePercent: number;
  sparkline: number[];
}

export interface ExchangeRateResponse {
  rates: Record<string, number>;
}