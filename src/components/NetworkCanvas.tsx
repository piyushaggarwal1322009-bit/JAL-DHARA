"use client";

import { useEffect, useMemo, useState } from "react";
import { ReactFlow, Controls, Handle, MarkerType, Position, type Edge, type Node, type NodeProps } from "@xyflow/react";
import { MapPin } from "lucide-react";
import { distanceMeters } from "@/lib/geo";
import type { SimulationInput, SimulationResult } from "@/lib/model";
import type { SiteFeature } from "@/lib/site-data";

export type Selection = { type: "tank" | "channel"; id: string } | null;
const format = (value: number) => new Intl.NumberFormat("en-IN").format(value);
const formatDistance = (meters: number) => meters >= 1000 ? `${(meters / 1000).toFixed(2)} km` : `${Math.round(meters)} m`;

interface TankNodeData extends Record<string, unknown> {
  name: string; village: string; storage: number;
  capacity: number; selected: boolean; hasResult: boolean;
}

function TankNode({ data }: NodeProps<Node<TankNodeData>>) {
  return <div className={`tank-node ${data.selected ? "tank-node-selected" : ""}`}>
    <Handle type="target" position={Position.Left} id="left" className="tank-handle" />
    <Handle type="target" position={Position.Top} id="top" className="tank-handle" />
    <div className="tank-node-name">{data.name}</div>
    <div className="tank-node-village">{data.village}</div>
    <div className="tank-node-divider" />
    <div className="tank-node-bottom"><span>{data.hasResult ? "Remaining" : "Initial storage"}</span><strong>{format(data.storage)} <small>L</small></strong></div>
    <div className="tank-storage-track"><div style={{ width: `${Math.min(100, data.capacity ? data.storage / data.capacity * 100 : 0)}%` }} /></div>
    <Handle type="source" position={Position.Right} id="right" className="tank-handle" />
    <Handle type="source" position={Position.Bottom} id="bottom" className="tank-handle" />
  </div>;
}

const nodeTypes = { tank: TankNode };
const fallbackPositions: Record<string, { x: number; y: number }> = {
  a: { x: 70, y: 0 }, b: { x: 250, y: 0 }, c: { x: 250, y: 160 }, d: { x: 430, y: 160 },
};

interface Props {
  input: SimulationInput; result: SimulationResult | null;
  selection: Selection; restoredIds: string[]; mappedTanks: SiteFeature[];
  onSelect: (selection: Selection) => void;
}

export function NetworkCanvas({ input, result, selection, restoredIds, mappedTanks, onSelect }: Props) {
  const [showFlow, setShowFlow] = useState(false);
  const mappedByTankId = useMemo(() => new Map(input.tanks.map((tank, index) => [tank.id, mappedTanks[index]]).filter((entry): entry is [string, SiteFeature] => Boolean(entry[1]))), [input.tanks, mappedTanks]);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 641px)");
    const update = () => setShowFlow(media.matches);
    update(); media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const positions = useMemo(() => {
    const locations = input.tanks.map((tank) => ({ tankId: tank.id, feature: mappedByTankId.get(tank.id) })).filter((item): item is { tankId: string; feature: SiteFeature } => Boolean(item.feature));
    if (!locations.length) return fallbackPositions;
    const minLng = Math.min(...locations.map(({ feature }) => feature.longitude));
    const maxLng = Math.max(...locations.map(({ feature }) => feature.longitude));
    const minLat = Math.min(...locations.map(({ feature }) => feature.latitude));
    const maxLat = Math.max(...locations.map(({ feature }) => feature.latitude));
    const spanLng = maxLng - minLng || 0.01; const spanLat = maxLat - minLat || 0.01;
    return Object.fromEntries(locations.map(({ tankId, feature }) => [tankId, {
      x: 60 + ((feature.longitude - minLng) / spanLng) * 660,
      y: 30 + ((maxLat - feature.latitude) / spanLat) * 340,
    }]));
  }, [input.tanks, mappedByTankId]);

  const nodes = useMemo<Node[]>(() => input.tanks.map((tank, index) => {
    const village = input.villages.find((item) => item.tankId === tank.id);
    const balance = result?.tankBalances.find((item) => item.tankId === tank.id);
    return { id: tank.id, type: "tank", position: positions[tank.id] ?? { x: index * 240, y: 0 },
      data: { name: tank.name, village: village?.name ?? "Mapped tank", storage: balance?.finalStorageL ?? tank.initialStorageL,
        capacity: tank.capacityL, selected: selection?.type === "tank" && selection.id === tank.id, hasResult: Boolean(result) } };
  }), [input, result, selection, positions]);

  const edges = useMemo<Edge[]>(() => input.channels.map((channel) => {
    const flow = result?.channelFlows.find((item) => item.channelId === channel.id);
    const from = mappedByTankId.get(channel.sourceTankId); const to = mappedByTankId.get(channel.targetTankId);
    const distance = from && to ? formatDistance(distanceMeters(from, to)) : null;
    const blocked = channel.condition === "blocked"; const overflowing = channel.condition === "overflowing";
    const active = !blocked && Boolean(flow?.receivedL);
    const color = blocked ? "#b91c1c" : overflowing ? "#d97706" : active ? "#2563eb" : "#a8a29e";
    const flowLabel = flow && result ? `${format(flow.receivedL)} L` : null;
    const label = [distance, blocked ? "× Blocked" : overflowing ? "Overflowing" : flowLabel ?? "No transfer"].filter(Boolean).join(" · ");
    return { id: channel.id, source: channel.sourceTankId, target: channel.targetTankId,
      type: "smoothstep", selectable: true, interactionWidth: 24, label,
      labelStyle: { fill: blocked ? "#b91c1c" : overflowing ? "#b45309" : active ? "#2563eb" : "#57534e", fontSize: 13, fontWeight: 650 },
      labelBgStyle: { fill: "var(--surface)", fillOpacity: 1 }, labelBgPadding: [8, 5] as [number, number], labelBgBorderRadius: 8,
      style: { stroke: color, strokeWidth: selection?.type === "channel" && selection.id === channel.id ? 4 : active ? 3 : 2, strokeDasharray: blocked ? "7 6" : overflowing ? "3 5" : undefined },
      markerEnd: { type: MarkerType.ArrowClosed, color, width: 20, height: 20 }, animated: false };
  }), [input.channels, result, mappedByTankId, selection]);

  return <section className="canvas-panel" aria-label="Mapped water network">
    <div className="canvas-header"><div><h2>Water network</h2><p>{mappedTanks.length ? <><MapPin size={14} /> {mappedTanks.length} mapped locations · distance and simulated flow</> : "Select a tank or channel to inspect it."}</p></div></div>
    <div className="flow-wrap">
      <div className="desktop-flow">{showFlow && <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView fitViewOptions={{ padding: 0.18, minZoom: 0.5, maxZoom: 1 }}
        nodesDraggable={false} nodesConnectable={false} elementsSelectable minZoom={0.5} maxZoom={1.35}
        onInit={(instance) => { requestAnimationFrame(() => instance.fitView({ padding: 0.18, minZoom: 0.5, maxZoom: 1 })); }}
        onNodeClick={(_, node) => onSelect({ type: "tank", id: node.id })}
        onEdgeClick={(_, edge) => onSelect({ type: "channel", id: edge.id })}
        onPaneClick={() => onSelect(null)}><Controls showInteractive={false} className="canvas-controls" /></ReactFlow>}</div>
      <div className="mobile-network-list">{input.tanks.map((tank) => {
        const village = input.villages.find((item) => item.tankId === tank.id);
        const balance = result?.tankBalances.find((item) => item.tankId === tank.id);
        const outgoing = input.channels.filter((item) => item.sourceTankId === tank.id);
        return <div key={tank.id} className="mobile-network-step">
          <button className={`mobile-tank ${selection?.type === "tank" && selection.id === tank.id ? "selected" : ""}`} onClick={() => onSelect({ type: "tank", id: tank.id })}>
            <span className="mobile-tank-content"><span><strong>{tank.name}</strong><small>{village?.name ?? "Mapped tank"}</small></span><span className="mobile-tank-meter"><i style={{ width: `${Math.min(100, tank.capacityL ? (balance?.finalStorageL ?? tank.initialStorageL) / tank.capacityL * 100 : 0)}%` }} /></span></span>
            <span className="mobile-tank-volume">{format(balance?.finalStorageL ?? tank.initialStorageL)} <small>L</small></span>
          </button>
          {outgoing.map((channel) => {
            const target = input.tanks.find((item) => item.id === channel.targetTankId);
            const fromMap = mappedByTankId.get(channel.sourceTankId); const toMap = mappedByTankId.get(channel.targetTankId);
            const distance = fromMap && toMap ? `${formatDistance(distanceMeters(fromMap, toMap))} · ` : "";
            const flow = result?.channelFlows.find((item) => item.channelId === channel.id);
            return <button key={channel.id} className={`mobile-channel ${channel.condition}`} onClick={() => onSelect({ type: "channel", id: channel.id })}>
              <span className="mobile-channel-line" /><span>{channel.condition === "blocked" ? "Blocked" : channel.condition === "overflowing" ? "Overflowing" : `${distance}${target?.name ?? "Channel"}${flow ? ` · ${format(flow.receivedL)} L` : ""}`}</span><span>↓</span>
            </button>;
          })}
        </div>;
      })}</div>
    </div>
    <div className="canvas-footer"><div className="legend"><span><i className="legend-line flow" /> Flowing</span><span><i className="legend-line blocked" /> Blocked</span><span><i className="legend-line overflowing" /> Overflow</span><span><i className="legend-line idle" /> No transfer</span></div></div>
  </section>;
}
