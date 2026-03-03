/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, 
  // Allow production builds even with linting errors to speed up Render deploy
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },

  async rewrites() {
    return [
      /**
       * --- 1. AUTH & USER (RENDER) ---
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
       * Note: Added :path* to ensure the full string is passed
       */
      {
        source: '/api/live/:path*',
        destination: 'https://sujal7337-stock-api.hf.space/:path*',
      },
      {
        source: '/api/python/:path*',
        destination: 'https://jsujalkumar7899-stock-api.hf.space/:path*',
      },
      {
        source: '/api/global/:path*',
        destination: 'https://sujal7899-stocks-api.hf.space/:path*',
      },

      /**
       * --- 3. ANALYTICS & AI ---
       */
      {
        source: '/api/ai/:path*',
        destination: 'https://swapna7899-prognosai-fastapi-backend-1.hf.space/:path*',
      },
      {
        source: '/api/advanced/:path*',
        destination: 'https://sujal7337-stock-details.hf.space/:path*',
      },
      {
        source: '/api/prognos/:path*',
        destination: 'https://sujal7899-prognos-data-engine.hf.space/:path*',
      },
      {
        source: '/api/ideas/:path*',
        destination: 'https://sujal8310-apex-invest-ideas-generator.hf.space/:path*',
      }
    ];
  },
};

export default nextConfig;