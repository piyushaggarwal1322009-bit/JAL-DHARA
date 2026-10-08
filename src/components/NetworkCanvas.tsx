"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ReactFlow, Controls, Handle, MarkerType, Position, type Edge, type Node, type NodeProps } from "@xyflow/react";
import { MapPin, Ruler } from "lucide-react";
import type { SimulationInput, SimulationResult } from "@/lib/model";
import { allTankDistances, minimumConnectionTree } from "@/lib/geo";
import { isSiteFeature, SITE_DATA_KEY, type SiteFeature } from "@/lib/site-data";

export type Selection = { type: "tank" | "channel"; id: string } | null;
const format = (value: number) => new Intl.NumberFormat("en-IN").format(value);
const formatDistance = (meters: number) => meters >= 1000 ? `${(meters / 1000).toFixed(2)} km` : `${Math.round(meters)} m`;

function MappedLocations({ tanks }: { tanks: SiteFeature[] }) {
  const links = useMemo(() => minimumConnectionTree(tanks), [tanks]);
  const width = 820;
  const height = 440;
  const minLng = Math.min(...tanks.map((tank) => tank.longitude));
  const maxLng = Math.max(...tanks.map((tank) => tank.longitude));
  const minLat = Math.min(...tanks.map((tank) => tank.latitude));
  const maxLat = Math.max(...tanks.map((tank) => tank.latitude));
  const spanLng = maxLng - minLng || 0.01;
  const spanLat = maxLat - minLat || 0.01;
  const points = new Map(tanks.map((tank) => [tank.id, {
    x: tanks.length === 1 ? width / 2 : 105 + ((tank.longitude - minLng) / spanLng) * (width - 210),
    y: tanks.length === 1 ? height / 2 : 90 + ((maxLat - tank.latitude) / spanLat) * (height - 180),
  }]));
  const pairs = allTankDistances(tanks);
  return <div className="mapped-canvas-view">
    <div className="mapped-canvas-toolbar"><span><MapPin size={15} /> {tanks.length} mapped {tanks.length === 1 ? "tank" : "tanks"}</span><Link href="/network"><Ruler size={14} /> All distances and cost <span aria-hidden>↗</span></Link></div>
    <div className="mapped-canvas-diagram"><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Mapped tanks with straight-line distances between nearest connections">
      {links.map((link) => {
        const from = points.get(link.from.id)!; const to = points.get(link.to.id)!;
        const x = (from.x + to.x) / 2; const y = (from.y + to.y) / 2;
        return <g key={`${link.from.id}-${link.to.id}`}><line x1={from.x} y1={from.y} x2={to.x} y2={to.y} className="mapped-canvas-line" /><rect x={x - 42} y={y - 14} width="84" height="28" rx="14" className="mapped-canvas-distance-bg" /><text x={x} y={y + 5} className="mapped-canvas-distance">{formatDistance(link.meters)}</text></g>;
      })}
      {tanks.map((tank, index) => {
        const point = points.get(tank.id)!;
        return <g key={tank.id} className="mapped-canvas-tank"><rect x={point.x - 91} y={point.y - 40} width="182" height="80" rx="16" /><circle cx={point.x - 68} cy={point.y - 14} r="12" /><text x={point.x - 68} y={point.y - 10} className="mapped-canvas-index">{index + 1}</text><text x={point.x - 48} y={point.y - 10} className="mapped-canvas-name">{tank.name.length > 18 ? `${tank.name.slice(0, 17)}…` : tank.name}</text><text x={point.x - 68} y={point.y + 17} className="mapped-canvas-coordinate">{tank.latitude.toFixed(4)}°, {tank.longitude.toFixed(4)}°</text><title>{`${tank.name} · ${tank.latitude.toFixed(6)}, ${tank.longitude.toFixed(6)}`}</title></g>;
      })}
    </svg></div>
    <div className="mapped-canvas-foot"><span><i /> Proposed nearest connections</span><span>{pairs.length} measured pairs · straight-line distance</span></div>
  </div>;
}

interface TankNodeData extends Record<string, unknown> {
  letter: string; name: string; village: string; storage: number;
  capacity: number; selected: boolean; hasResult: boolean;
}

function TankNode({ data }: NodeProps<Node<TankNodeData>>) {
  return (
    <div className={`tank-node ${data.selected ? "tank-node-selected" : ""}`}>
      <Handle type="target" position={Position.Left} id="left" className="tank-handle" />
      <Handle type="target" position={Position.Top} id="top" className="tank-handle" />
      <div className="tank-node-name">{data.name}</div>
      <div className="tank-node-village">{data.village}</div>
      <div className="tank-node-divider" />
      <div className="tank-node-bottom"><span>{data.hasResult ? "Remaining" : "Initial storage"}</span><strong>{format(data.storage)} <small>L</small></strong></div>
      <div className="tank-storage-track"><div style={{ width: `${Math.min(100, data.capacity ? data.storage / data.capacity * 100 : 0)}%` }} /></div>
      <Handle type="source" position={Position.Right} id="right" className="tank-handle" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="tank-handle" />
    </div>
  );
}

const nodeTypes = { tank: TankNode };
const positions: Record<string, { x: number; y: number }> = {
  a: { x: 70, y: 0 }, b: { x: 250, y: 0 }, c: { x: 250, y: 160 }, d: { x: 430, y: 160 },
};

interface Props {
  input: SimulationInput; result: SimulationResult | null;
  selection: Selection; restoredIds: string[]; onSelect: (selection: Selection) => void;
}

export function NetworkCanvas({ input, result, selection, restoredIds, onSelect }: Props) {
  const [showFlow, setShowFlow] = useState(false);
  const [mappedTanks, setMappedTanks] = useState<SiteFeature[]>([]);
  const [networkView, setNetworkView] = useState<"mapped" | "simulation">("simulation");
  useEffect(() => {
    const read = () => {
      try {
        const raw = localStorage.getItem(SITE_DATA_KEY);
        const parsed: unknown = raw ? JSON.parse(raw) : [];
        const tanks = Array.isArray(parsed) ? parsed.filter(isSiteFeature).filter((feature) => feature.kind === "tank") : [];
        setMappedTanks(tanks);
        if (tanks.length) setNetworkView("mapped");
      } catch { setMappedTanks([]); }
    };
    read();
    window.addEventListener("storage", read);
    window.addEventListener("focus", read);
    return () => { window.removeEventListener("storage", read); window.removeEventListener("focus", read); };
  }, []);
  useEffect(() => {
    const media = window.matchMedia("(min-width: 641px)");
    const update = () => setShowFlow(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  const nodes = useMemo<Node[]>(() => input.tanks.map((tank, index) => {
    const village = input.villages.find((item) => item.tankId === tank.id);
    const balance = result?.tankBalances.find((item) => item.tankId === tank.id);
    return {
      id: tank.id, type: "tank", position: positions[tank.id] ?? { x: index * 240, y: 0 },
      data: { letter: tank.id.toUpperCase(), name: tank.name, village: village?.name ?? "Upstream source",
        storage: balance?.finalStorageL ?? tank.initialStorageL, capacity: tank.capacityL,
        selected: selection?.type === "tank" && selection.id === tank.id, hasResult: Boolean(result) },
    };
  }), [input, result, selection]);

  const edges = useMemo<Edge[]>(() => input.channels.map((channel) => {
    const flow = result?.channelFlows.find((item) => item.channelId === channel.id);
    const blocked = channel.condition === "blocked";
    const active = !blocked && Boolean(flow?.receivedL);
    const color = blocked ? "#b91c1c" : active ? "#2563eb" : "#a8a29e";
    return {
      id: channel.id, source: channel.sourceTankId, target: channel.targetTankId,
      sourceHandle: channel.sourceTankId === "b" && channel.targetTankId === "c" ? "bottom" : "right",
      targetHandle: channel.sourceTankId === "b" && channel.targetTankId === "c" ? "top" : "left",
      type: "smoothstep", selectable: true, interactionWidth: 24,
      label: blocked ? "× Blocked" : restoredIds.includes(channel.id) ? "Restored" : flow ? `${format(flow.receivedL)} L` : "No flow",
      labelStyle: { fill: blocked ? "#b91c1c" : active ? "#2563eb" : "#57534e", fontSize: 14, fontWeight: 600 },
      labelBgStyle: { fill: "var(--surface)", fillOpacity: 1 }, labelBgPadding: [8, 5] as [number, number], labelBgBorderRadius: 5,
      style: { stroke: color, strokeWidth: selection?.type === "channel" && selection.id === channel.id ? 4 : active ? 3 : 2, strokeDasharray: blocked ? "7 6" : undefined },
      markerEnd: { type: MarkerType.ArrowClosed, color, width: 20, height: 20 },
      animated: false,
    };
  }), [input, result, restoredIds, selection]);

  return (
    <section className="canvas-panel" aria-label="Village water network">
      <div className="canvas-header">
        <div><h2>Water network</h2><p>Select a tank or channel to inspect it.</p></div>
      </div>
      {mappedTanks.length > 0 && <div className="network-view-switch" role="tablist" aria-label="Network view">
        <button role="tab" aria-selected={networkView === "mapped"} className={networkView === "mapped" ? "selected" : ""} onClick={() => setNetworkView("mapped")}><MapPin size={14} /> Map locations</button>
        <button role="tab" aria-selected={networkView === "simulation"} className={networkView === "simulation" ? "selected" : ""} onClick={() => setNetworkView("simulation")}>Simulation flow</button>
      </div>}
      <div className="flow-wrap">
        {networkView === "mapped" && mappedTanks.length > 0 ? <MappedLocations tanks={mappedTanks} /> : <><div className="desktop-flow">{showFlow && <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView fitViewOptions={{ padding: 0.1, minZoom: 0.5, maxZoom: 1 }}
          nodesDraggable={false} nodesConnectable={false} elementsSelectable
          minZoom={0.5} maxZoom={1.35}
          onInit={(instance) => { requestAnimationFrame(() => instance.fitView({ padding: 0.1, minZoom: 0.5, maxZoom: 1 })); }}
          onNodeClick={(_, node) => onSelect({ type: "tank", id: node.id })}
          onEdgeClick={(_, edge) => onSelect({ type: "channel", id: edge.id })}
          onPaneClick={() => onSelect(null)}>
          <Controls showInteractive={false} className="canvas-controls" />
        </ReactFlow>}</div><div className="mobile-network-list">
          {input.tanks.map((tank, index) => {
            const village = input.villages.find((item) => item.tankId === tank.id);
            const balance = result?.tankBalances.find((item) => item.tankId === tank.id);
            const outgoing = input.channels.find((item) => item.sourceTankId === tank.id);
            const flow = outgoing && result?.channelFlows.find((item) => item.channelId === outgoing.id);
            return <div key={tank.id} className="mobile-network-step">
              <button className={`mobile-tank ${selection?.type === "tank" && selection.id === tank.id ? "selected" : ""}`} onClick={() => onSelect({ type: "tank", id: tank.id })}>
                <span className="mobile-tank-content"><span><strong>{tank.name}</strong><small>{village?.name ?? "Upstream source"}</small></span><span className="mobile-tank-meter"><i style={{ width: `${Math.min(100, tank.capacityL ? (balance?.finalStorageL ?? tank.initialStorageL) / tank.capacityL * 100 : 0)}%` }} /></span></span>
                <span className="mobile-tank-volume">{format(balance?.finalStorageL ?? tank.initialStorageL)} <small>L</small></span>
              </button>
              {index < input.tanks.length - 1 && outgoing && <button className={`mobile-channel ${outgoing.condition === "blocked" ? "blocked" : ""}`} onClick={() => onSelect({ type: "channel", id: outgoing.id })}>
                <span className="mobile-channel-line" /><span>{outgoing.condition === "blocked" ? "Blocked" : flow ? `${format(flow.receivedL)} L transferred` : "Channel"}</span><span>↓</span>
              </button>}
            </div>;
          })}
        </div></>}
      </div>
      {networkView === "simulation" && <div className="canvas-footer">
        <div className="legend"><span><i className="legend-line flow" /> Flowing</span><span><i className="legend-line blocked" /> Blocked</span><span><i className="legend-line idle" /> No transfer</span></div>
      </div>}
    </section>
  );
}
