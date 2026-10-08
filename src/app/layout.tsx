import type { Metadata } from "next";
import "./globals.css";
import { SiteNav } from "@/components/SiteNav";

export const metadata: Metadata = {
  title: "JalSaarthi X — Water networks, understood",
  description: "An Eri-inspired water network workspace with a source-attributed field map and transparent scenario analysis.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" data-scroll-behavior="smooth"><body><SiteNav />{children}<footer className="site-footer"><span>JalSaarthi X</span><span>Transparent educational simulation · Illustrative inputs</span></footer></body></html>;
}
