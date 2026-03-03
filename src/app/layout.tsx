'use client';

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { useStore } from "@/store/useStore";
import { useEffect } from "react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const themeMode = useStore((state) => state.themeMode);

  useEffect(() => {
    // 1 = Light Mode, 2 = Dark Mode
    const root = window.document.documentElement;
    if (themeMode === 1) {
      root.classList.add('light');
      root.classList.remove('dark'); // Optional if using tailwind dark:
      root.style.colorScheme = 'light';
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    }
  }, [themeMode]);

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased transition-colors duration-300`}
        style={{ 
          backgroundColor: themeMode === 1 ? '#f7f7f9' : '#0f0f13',
          color: themeMode === 1 ? '#1a1a1a' : '#f0f0f0'
        }}
      >
        {children}
      </body>
    </html>
  );
}