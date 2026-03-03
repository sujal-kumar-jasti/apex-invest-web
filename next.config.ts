import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false, 
  
  async rewrites() {
    return [
      /**
       * --- 1. AUTH & USER (RENDER) ---
       * apexApi uses createAuthClient("/api")
       */
      {
        source: '/api/auth/:path*',
        destination: 'https://apexinvest-api-5ql5.onrender.com/auth/:path*',
      },
      {
        source: '/api/user/:path*',
        destination: 'https://apexinvest-api-5ql5.onrender.com/user/:path*',
      },

      /**
       * --- 2. MARKET DATA (HF SPACES) ---
       */
      {
        // liveClient -> sujal7337-stock-api
        source: '/api/live/:path*',
        destination: 'https://sujal7337-stock-api.hf.space/:path*',
      },
      {
        // pythonClient -> jsujalkumar7899-stock-api (Indian Info)
        source: '/api/python/:path*',
        destination: 'https://jsujalkumar7899-stock-api.hf.space/:path*',
      },
      {
        // globalClient -> sujal7899-stocks-api (Global Info)
        source: '/api/global/:path*',
        destination: 'https://sujal7899-stocks-api.hf.space/:path*',
      },

      /**
       * --- 3. ANALYTICS & AI ---
       */
      {
        // heavyClient -> swapna7899-prognosai
        source: '/api/ai/:path*',
        destination: 'https://swapna7899-prognosai-fastapi-backend-1.hf.space/:path*',
      },
      {
        // advancedClient -> sujal7337-stock-details (Options/ESG)
        source: '/api/advanced/:path*',
        destination: 'https://sujal7337-stock-details.hf.space/:path*',
      },
      {
        // prognosClient -> sujal7899-prognos-data-engine
        source: '/api/prognos/:path*',
        destination: 'https://sujal7899-prognos-data-engine.hf.space/:path*',
      },
      {
        // ideasClient -> sujal8310-apex-invest-ideas
        source: '/api/ideas/:path*',
        destination: 'https://sujal8310-apex-invest-ideas-generator.hf.space/:path*',
      }
    ];
  },
};

export default nextConfig;