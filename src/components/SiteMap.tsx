"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { ArrowDownToLine, Crosshair, MapPin, Plus, Trash2, Upload } from "lucide-react";
import { isSiteFeature, SITE_DATA_KEY, type SiteFeature, type SiteFeatureKind } from "@/lib/site-data";

const defaultCenter: [number, number] = [12.16, 79.58]; // Approximate Mailam region reference, not a tank location.
const icon = (kind: SiteFeatureKind) => L.divIcon({
  className: "site-marker-shell",
  html: `<span class="site-marker site-marker-${kind}"></span>`,
  iconSize: [20, 20], iconAnchor: [10, 10],
});
const icons = { tank: icon("tank"), village: icon("village"), channel: icon("channel"), observation: icon("observation") };

function ClickCapture({ enabled, onClick }: { enabled: boolean; onClick: (lat: number, lng: number) => void }) {
  useMapEvents({ click(event) { if (enabled) onClick(event.latlng.lat, event.latlng.lng); } });
  return null;
}

function LocateButton() {
  const map = useMap();
  return <button type="button" className="map-locate" aria-label="Show Mailam study region" title="Show Mailam study region" onClick={() => map.setView(defaultCenter, 12)}><Crosshair size={17} /></button>;
}

function featureCsv(features: SiteFeature[]) {
  const quote = (value: string) => `"${value.replaceAll('"', '""')}"`;
  return [
    ["id", "type", "name", "latitude", "longitude", "source", "observed_on", "notes", "measurements"].join(","),
    ...features.map((feature) => [feature.id, feature.kind, feature.name, String(feature.latitude), String(feature.longitude), feature.source, feature.observedOn, feature.notes, JSON.stringify(feature.measurements)].map(quote).join(",")),
  ].join("\n");
}

export function SiteMap() {
  const router = useRouter();
  const [features, setFeatures] = useState<SiteFeature[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [pending, setPending] = useState<{ lat: number; lng: number } | null>(null);
  const [kind, setKind] = useState<SiteFeatureKind>("tank");
  const [name, setName] = useState("");
  const [source, setSource] = useState("");
  const [observedOn, setObservedOn] = useState("");
  const [notes, setNotes] = useState("");
  const [measurementsText, setMeasurementsText] = useState("{}");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SITE_DATA_KEY);
      if (raw) {
        const value: unknown = JSON.parse(raw);
        if (Array.isArray(value)) setFeatures(value.filter(isSiteFeature));
      }
    } catch { setError("Saved map data could not be read. Exported backups remain available."); }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try { localStorage.setItem(SITE_DATA_KEY, JSON.stringify(features)); }
    catch { setError("Browser storage is full. Export your map data to keep a copy."); }
  }, [features, loaded]);

  const selectPosition = useCallback((lat: number, lng: number) => {
    setPending({ lat, lng }); setPlacing(false); setError(""); setMessage("");
  }, []);

  const selected = useMemo(() => features.find((feature) => feature.id === selectedId) ?? null, [features, selectedId]);

  function saveFeature(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pending || !name.trim() || !source.trim()) return;
    if (features.length >= 1000) { setError("This map has reached the 1,000-record limit. Export the data before starting another map."); return; }
    let measurements: Record<string, string>;
    try {
      const parsed: unknown = JSON.parse(measurementsText || "{}");
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) || Object.values(parsed).some((value) => typeof value !== "string" && typeof value !== "number")) throw new Error();
      measurements = Object.fromEntries(Object.entries(parsed).map(([key, value]) => [key, String(value)]));
    } catch { setError('Measurements must be a JSON object, for example {"capacityL": "12000"}.'); return; }
    const item: SiteFeature = {
      id: crypto.randomUUID(), kind, name: name.trim(), latitude: pending.lat, longitude: pending.lng,
      source: source.trim(), observedOn, notes: notes.trim(), measurements,
    };
    const nextFeatures = [...features, item];
    try { localStorage.setItem(SITE_DATA_KEY, JSON.stringify(nextFeatures)); }
    catch { setError("Browser storage is full. Export existing map data before adding another location."); return; }
    setFeatures(nextFeatures); setSelectedId(item.id); setPending(null);
    setName(""); setSource(""); setObservedOn(""); setNotes(""); setMeasurementsText("{}"); setError("");
    setMessage("Location saved in this browser with its source details.");
    if (kind === "tank") router.push("/network");
  }

  function exportData() {
    const blob = new Blob([JSON.stringify({ schemaVersion: 1, features }, null, 2)], { type: "application/json" });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "jalsaarthi-site-data.json"; link.click(); URL.revokeObjectURL(link.href);
  }

  async function importData(file?: File) {
    if (!file) return;
    try {
      if (file.size > 1024 * 1024) throw new Error();
      const parsed: unknown = JSON.parse(await file.text());
      if (!parsed || typeof parsed !== "object" || !Array.isArray((parsed as { features?: unknown }).features)) throw new Error();
      const imported = (parsed as { features: unknown[] }).features;
      if (imported.length > 1000 || !imported.every(isSiteFeature)) throw new Error();
      setFeatures(imported); setSelectedId(null); setMessage(`${imported.length} mapped records imported.`); setError("");
    } catch { setError("This file is not a valid JalSaarthi site data export."); }
  }

  return <main className="site-map-page">
    <header className="site-map-heading">
      <div><p className="site-map-kicker">FIELD DATA</p><h1>Map a water system</h1><p className="site-map-lede">Add surveyed locations and record where each measurement came from. Map points are stored in this browser.</p></div>
      <div className="site-map-actions">{features.some((feature) => feature.kind === "tank") && <Link href="/network" className="button-primary">View water network</Link>}<label className="button-outline map-import"><Upload size={16} /> Import JSON<input type="file" accept="application/json,.json" onChange={(event) => void importData(event.target.files?.[0])} /></label><button className="button-outline" onClick={exportData}><ArrowDownToLine size={16} /> Export data</button></div>
    </header>
    <div className="map-notice"><MapPin size={16} /><span>Map opens near the Mailam study area for orientation. No tank coordinates are prefilled; place only locations you have verified.</span></div>
    <div className="map-research-card"><div><strong>Mailam tank cascade</strong><span>14-tank empirical case · observations reported for 2004–2024</span><small>Published watershed findings are useful context, but do not include verified per-tank operating inputs for this simulator.</small></div><a href="https://doi.org/10.3389/frwa.2025.1597293" target="_blank" rel="noreferrer">Read the study ↗</a></div>
    <div className="site-map-layout">
      <section className="site-map-canvas" aria-label="Map for adding site features">
        <MapContainer center={defaultCenter} zoom={11} scrollWheelZoom className="leaflet-map">
          <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <ClickCapture enabled={placing} onClick={selectPosition} />
          <LocateButton />
          {features.map((feature) => <Marker key={feature.id} position={[feature.latitude, feature.longitude]} icon={icons[feature.kind]} eventHandlers={{ click: () => setSelectedId(feature.id) }} />)}
        </MapContainer>
        <div className="map-toolbar"><span>{features.length} mapped record{features.length === 1 ? "" : "s"}</span><button className={placing ? "is-placing" : ""} onClick={() => { setPlacing((value) => !value); setPending(null); }}><Plus size={16} /> {placing ? "Click map to place" : "Add location"}</button></div>
      </section>
      <aside className="site-map-sidebar">
        {pending ? <form className="field-record-form" onSubmit={saveFeature}>
          <div className="panel-heading"><h2>Record location</h2><button type="button" className="icon-button" aria-label="Cancel" onClick={() => setPending(null)}>×</button></div>
          <p className="form-hint">{pending.lat.toFixed(6)}, {pending.lng.toFixed(6)}</p>
          <label>Feature type<select value={kind} onChange={(event) => setKind(event.target.value as SiteFeatureKind)}><option value="tank">Tank / water body</option><option value="village">Village</option><option value="channel">Channel</option><option value="observation">Observation</option></select></label>
          <label>Name<input required maxLength={80} value={name} onChange={(event) => setName(event.target.value)} placeholder="Surveyed tank name" /></label>
          <label>Data source<input required maxLength={240} value={source} onChange={(event) => setSource(event.target.value)} placeholder="Survey, source document or field note" /></label>
          <label>Observed on<input type="date" value={observedOn} onChange={(event) => setObservedOn(event.target.value)} /></label>
          <label>Measurements <span className="form-hint">JSON key-value pairs with units, where known</span><textarea rows={4} value={measurementsText} onChange={(event) => setMeasurementsText(event.target.value)} spellCheck={false} /></label>
          <label>Notes<textarea rows={3} maxLength={1000} value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
          <button className="button-primary" type="submit">Save field record</button>
        </form> : selected ? <div className="field-record-detail">
          <div className="panel-heading"><h2>{selected.name}</h2><button type="button" className="icon-button danger-action" aria-label={`Delete ${selected.name}`} onClick={() => { setFeatures((current) => current.filter((feature) => feature.id !== selected.id)); setSelectedId(null); }}> <Trash2 size={16} /></button></div>
          <p className="feature-kind">{selected.kind} · {selected.latitude.toFixed(5)}, {selected.longitude.toFixed(5)}</p>
          <dl><div><dt>Source</dt><dd>{selected.source}</dd></div>{selected.observedOn && <div><dt>Observed</dt><dd>{selected.observedOn}</dd></div>}</dl>
          <div className="measurement-list">{Object.keys(selected.measurements).length ? Object.entries(selected.measurements).map(([key, value]) => <div key={key}><span>{key}</span><strong>{value}</strong></div>) : <p>No measurements recorded.</p>}</div>
          {selected.notes && <p className="record-notes">{selected.notes}</p>}
          <button className="button-outline" onClick={() => setSelectedId(null)}>Close record</button>
        </div> : <div className="site-record-list">
          <div className="panel-heading"><h2>Site records</h2><span>{features.length}</span></div>
          <p className="form-hint">Select a record to inspect its source and measurements.</p>
          {features.length ? features.map((feature) => <button key={feature.id} className="site-record-row" onClick={() => setSelectedId(feature.id)}><span className={`record-dot record-dot-${feature.kind}`} /><span><strong>{feature.name}</strong><small>{feature.kind} · {feature.latitude.toFixed(3)}, {feature.longitude.toFixed(3)}</small></span></button>) : <div className="site-map-empty"><MapPin size={18} /><p>No field locations yet.</p><span>Add verified survey points or import a site data file.</span></div>}
        </div>}
        {error && <p className="map-feedback map-error" role="alert">{error}</p>}{message && <p className="map-feedback" role="status">{message}</p>}
        <p className="storage-note">Saved locally to this browser. Export a backup to share it or move it to another device.</p>
      </aside>
    </div>
    <div className="site-map-footnote">Map tiles © OpenStreetMap contributors. Field entries are user supplied and are not checked against official records.</div>
    <section className="site-map-data-tools"><h2>Download as spreadsheet</h2><p>Use CSV for reviews or keep JSON to re-import the records into JalSaarthi.</p><button className="button-outline" onClick={() => { const blob = new Blob([featureCsv(features)], { type: "text/csv;charset=utf-8" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = "jalsaarthi-site-data.csv"; link.click(); URL.revokeObjectURL(url); }}>Export CSV</button></section>
  </main>;
}
