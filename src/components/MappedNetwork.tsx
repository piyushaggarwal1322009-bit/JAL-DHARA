"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowUpRight, MapPin, Ruler } from "lucide-react";
import { allTankDistances, minimumConnectionTree } from "@/lib/geo";
import { isSiteFeature, SITE_DATA_KEY, type SiteFeature } from "@/lib/site-data";

const RATE_KEY = "jalsaarthi.map-cost-rate.v1";
const fmt = (value: number, digits = 0) => new Intl.NumberFormat("en-IN", { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(value);
const rupees = (value: number) => `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(value))}`;

function LocationDiagram({ tanks, links }: { tanks: SiteFeature[]; links: ReturnType<typeof minimumConnectionTree> }) {
  const width = 900;
  const height = Math.max(320, Math.min(560, 180 + tanks.length * 22));
  const coords = tanks.map((tank) => [tank.longitude, tank.latitude] as const);
  const minLng = Math.min(...coords.map(([lng]) => lng));
  const maxLng = Math.max(...coords.map(([lng]) => lng));
  const minLat = Math.min(...coords.map(([, lat]) => lat));
  const maxLat = Math.max(...coords.map(([, lat]) => lat));
  const spanLng = maxLng - minLng || 0.01;
  const spanLat = maxLat - minLat || 0.01;
  const positions = new Map(tanks.map((tank) => [tank.id, {
    x: 36 + ((tank.longitude - minLng) / spanLng) * (width - 90),
    y: height - 38 - ((tank.latitude - minLat) / spanLat) * (height - 90),
  }]));
  return <div className="mapped-diagram-wrap"><svg className="mapped-diagram" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Mapped tank locations connected by proposed shortest straight-line links">
    {links.map((link) => {
      const from = positions.get(link.from.id)!;
      const to = positions.get(link.to.id)!;
      const labelX = (from.x + to.x) / 2;
      const labelY = (from.y + to.y) / 2 - 8;
      return <g key={`${link.from.id}-${link.to.id}`}><line x1={from.x} y1={from.y} x2={to.x} y2={to.y} className="mapped-link" /><rect x={labelX - 32} y={labelY - 12} width="64" height="20" rx="6" className="mapped-link-label-bg" /><text x={labelX} y={labelY + 2} className="mapped-link-label">{fmt(link.meters, 0)} m</text></g>;
    })}
    {tanks.map((tank, index) => {
      const point = positions.get(tank.id)!;
      return <g key={tank.id} className="mapped-tank-point"><circle cx={point.x} cy={point.y} r="8" /><text x={point.x + 14} y={point.y + 5}>{tank.name}</text><title>{`${tank.name} · ${tank.latitude.toFixed(6)}, ${tank.longitude.toFixed(6)}`}</title><text x={point.x - 3} y={point.y + 4} className="mapped-tank-number">{index + 1}</text></g>;
    })}
  </svg></div>;
}

export function MappedNetwork() {
  const [tanks, setTanks] = useState<SiteFeature[]>([]);
  const [rateText, setRateText] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SITE_DATA_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) setTanks(parsed.filter(isSiteFeature).filter((feature) => feature.kind === "tank"));
      }
      setRateText(localStorage.getItem(RATE_KEY) ?? "");
    } catch { setTanks([]); }
    setLoaded(true);
  }, []);

  const distances = useMemo(() => allTankDistances(tanks), [tanks]);
  const tree = useMemo(() => minimumConnectionTree(tanks), [tanks]);
  const totalMeters = tree.reduce((sum, edge) => sum + edge.meters, 0);
  const rate = rateText.trim() && Number.isFinite(Number(rateText)) && Number(rateText) > 0 ? Number(rateText) : null;

  function updateRate(value: string) {
    setRateText(value);
    if (!value || (Number.isFinite(Number(value)) && Number(value) >= 0)) localStorage.setItem(RATE_KEY, value);
  }

  return <main className="network-page">
    <header className="network-page-heading"><div><Link href="/map" className="back-link"><ArrowLeft size={16} /> Field map</Link><p className="site-map-kicker">LOCATION NETWORK</p><h1>Tank locations and distances</h1><p>Names and coordinates come from your mapped records. Lines show proposed shortest links, not surveyed channels.</p></div><Link href="/#workspace" className="button-outline">Open simulation <ArrowUpRight size={15} /></Link></header>
    {!loaded ? <div className="network-empty">Loading saved tank locations…</div> : tanks.length === 0 ? <section className="network-empty"><MapPin size={22} /><h2>No mapped tanks yet</h2><p>Add a tank location on the field map. Saving it will bring you back here.</p><Link className="button-primary" href="/map">Add tank location</Link></section> : <>
      <section className="mapped-overview glass-surface">
        <div><span>Mapped tanks</span><strong>{tanks.length}</strong></div>
        <div><span>Shortest connecting length</span><strong>{fmt(totalMeters, 0)} <small>m</small></strong></div>
        <div><span>Estimated connection cost</span><strong>{rate ? rupees(totalMeters * rate) : "Add rate"}</strong><small>{rate ? `${rupees(rate)} per metre · user supplied` : "Use a local schedule or quote"}</small></div>
      </section>
      <div className="network-two-col">
        <section className="network-card glass-surface"><div className="panel-heading"><div><h2>Mapped layout</h2><p>Shortest straight-line links between the tank locations</p></div><Ruler size={18} /></div>
          <LocationDiagram tanks={tanks} links={tree} />
          <p className="network-disclaimer">Distances are geodesic straight-line measurements between saved points. A real channel route may be longer and must be surveyed.</p>
          {tree.length > 0 && <div className="proposed-links">{tree.map((edge) => <div key={`${edge.from.id}-${edge.to.id}`}><span>{edge.from.name} <i>to</i> {edge.to.name}</span><strong>{fmt(edge.meters, 0)} m</strong></div>)}</div>}
        </section>
        <aside className="network-card network-cost-card glass-surface"><div className="panel-heading"><div><h2>Cost estimate</h2><p>Based on the shortest connecting length</p></div></div>
          <label htmlFor="rate-per-meter">Local cost rate <span>INR / metre</span></label>
          <input id="rate-per-meter" type="number" min="0" step="0.01" value={rateText} onChange={(event) => updateRate(event.target.value)} placeholder="Enter a sourced rate" />
          <p className="network-formula">{fmt(totalMeters, 0)} m × {rate ? `${rupees(rate)} / m` : "your local rate"}</p>
          <div className="cost-result"><span>Estimated total</span><strong>{rate ? rupees(totalMeters * rate) : "—"}</strong></div>
          <p className="network-disclaimer">This is a preliminary distance × rate calculation. It excludes route deviations, elevation, earthwork, materials, access, taxes, and approvals. Add a rate from a current local schedule or contractor quote; no AI-generated rate is used.</p>
          <Link href="/map" className="button-outline"><MapPin size={16} /> Add or edit locations</Link>
        </aside>
      </div>
      <section className="distance-table-card glass-surface"><div className="panel-heading"><div><h2>Distances between every pair</h2><p>Sorted from nearest to farthest</p></div><span>{distances.length} pairs</span></div>
        {distances.length ? <div className="distance-table-wrap"><table><thead><tr><th>First tank</th><th>Second tank</th><th>Distance</th></tr></thead><tbody>{distances.map((pair) => <tr key={`${pair.from.id}-${pair.to.id}`}><td>{pair.from.name}</td><td>{pair.to.name}</td><td>{fmt(pair.meters, 0)} m</td></tr>)}</tbody></table></div> : <p className="network-disclaimer">Add a second tank to compare the distance between locations.</p>}
      </section>
    </>}
  </main>;
}
