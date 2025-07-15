import { Analytics } from "@vercel/analytics/react"
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

// Load Inter font for non-Apple devices
const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter",
});



export const metadata: Metadata = {
  title: "Sei Sorcerer - AI-Powered Blockchain Analysis",
  description: "Interactive AI Sorcerer that analyzes your Sei wallet and provides intelligent blockchain insights with magical precision",
  keywords: [
    "Sei", 
    "Sorcerer", 
    "Blockchain", 
    "AI", 
    "Interactive", 
    "Wallet Analysis", 
    "DeFi Detective",
    "Crypto Analysis",
    "Next.js",
    "Web3",
    "MCP",
    "Model Context Protocol",
    "Token Flow Analysis",
    "NFT Tracking",
    "Transaction Explainer",
    "Sei Network",
    "Blockchain Analytics"
  ],
  authors: [
    {
      name: "Sei Sorcerer AI",
      url: "https://sei-sorcerer.ai",
    },
  ],
  creator: "Sei Sorcerer",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://sei-sorcerer.ai",
    title: "Sei Sorcerer - AI-Powered Blockchain Analysis",
    description: "Interactive AI Sorcerer that analyzes your Sei wallet and provides intelligent blockchain insights",
    siteName: "Sei Sorcerer",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sei Sorcerer - AI-Powered Blockchain Analysis",
    description: "Interactive AI Sorcerer that analyzes your Sei wallet and provides intelligent blockchain insights",
    creator: "@seisorcerer",
  },
  icons: {
    icon: [
      {
        url: "/favicon.svg",
        sizes: "any",
      }
    ],
    shortcut: "/favicon.svg?v=2",
    apple: "/apple-touch-icon.svg?v=2",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="icon" href="/favicon.svg" sizes="any" />
      </head>
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          inter.variable,
        )}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
        >
          <main className="flex min-h-screen flex-col">
            {children}
          </main>
          <Toaster />
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}