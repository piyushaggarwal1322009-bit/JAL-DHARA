"use client";

import dynamic from "next/dynamic";

const SiteMap = dynamic(() => import("@/components/SiteMap").then((module) => module.SiteMap), { ssr: false, loading: () => <main className="site-map-page"><p>Loading map…</p></main> });

export default function MapPage() {
  return <SiteMap />;
}
