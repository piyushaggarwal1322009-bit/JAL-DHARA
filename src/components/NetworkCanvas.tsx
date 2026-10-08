"use client";

import { useEffect, useMemo, useState } from "react";
import { ReactFlow, Controls, Handle, MarkerType, Position, type Edge, type Node, type NodeProps } from "@xyflow/react";
import type { SimulationInput, SimulationResult } from "@/lib/model";

export type Selection = { type: "tank" | "channel"; id: string } | null;
const format = (value: number) => new Intl.NumberFormat("en-IN").format(value);

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
      <div className="flow-wrap">
        <div className="desktop-flow">{showFlow && <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView fitViewOptions={{ padding: 0.1, minZoom: 0.5, maxZoom: 1 }}
          nodesDraggable={false} nodesConnectable={false} elementsSelectable
          minZoom={0.5} maxZoom={1.35}
          onInit={(instance) => { requestAnimationFrame(() => instance.fitView({ padding: 0.1, minZoom: 0.5, maxZoom: 1 })); }}
          onNodeClick={(_, node) => onSelect({ type: "tank", id: node.id })}
          onEdgeClick={(_, edge) => onSelect({ type: "channel", id: edge.id })}
          onPaneClick={() => onSelect(null)}>
          <Controls showInteractive={false} className="canvas-controls" />
        </ReactFlow>}</div>
        <div className="mobile-network-list">
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
        </div>
      </div>
      <div className="canvas-footer">
        <div className="legend"><span><i className="legend-line flow" /> Flowing</span><span><i className="legend-line blocked" /> Blocked</span><span><i className="legend-line idle" /> No transfer</span></div>
      </div>
    </section>
  );
}
