"use client";

import { useMemo, useRef, useState } from "react";
import { ArrowDownToLine, ArrowRight, Check, ChevronDown, CircleAlert, Droplets, RotateCcw, ShieldCheck, SlidersHorizontal, Sparkles, Wrench } from "lucide-react";
import { DEMO_INPUT, freshDemoInput } from "@/lib/fixture";
import type { AIExtractedReport, OptimizationResult, SimulationInput, SimulationResult, WaterChannel } from "@/lib/model";
import { applyRepairs } from "@/lib/optimization";
import { simulate } from "@/lib/simulation";
import { NetworkCanvas, type Selection } from "./NetworkCanvas";

const number = (value: number) => new Intl.NumberFormat("en-IN").format(value);
const money = (value: number) => `₹${number(value)}`;
const initialResult = simulate(DEMO_INPUT);

interface Comparison { before: SimulationResult; after: SimulationResult; costINR: number; repairIds: string[] }

function Metric({ label, value, suffix, tone, note }: { label: string; value: number; suffix?: string; tone?: string; note?: string }) {
  return <div className={`metric ${tone ?? ""}`}><span>{label}</span><strong key={value}>{number(value)}<small>{suffix ?? " L"}</small></strong>{note && <em>{note}</em>}</div>;
}

function currentStatus(channel: WaterChannel) {
  return channel.condition === "blocked" ? "Blocked" : channel.condition === "degraded" ? "Degraded" : "Functional";
}

const policies: { value: SimulationInput["policy"]["mode"]; label: string; description: string }[] = [
  { value: "householdFirst", label: "Households first", description: "Prioritizes essential household demand." },
  { value: "irrigationFirst", label: "Irrigation first", description: "Prioritizes water for crops." },
  { value: "proportional", label: "Proportional", description: "Shares available water by each request’s size." },
  { value: "equalShare", label: "Equal share", description: "Shares the same starting amount across requests." },
];

function PolicyPicker({ value, onChange }: { value: SimulationInput["policy"]["mode"]; onChange: (value: SimulationInput["policy"]["mode"]) => void }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const active = policies.find((policy) => policy.value === value) ?? policies[0];
  return <div className={`policy-picker ${open ? "is-open" : ""}`}>
    <button ref={triggerRef} className="policy-trigger" type="button" aria-labelledby="policy-label" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(!open)} onKeyDown={(event) => { if (event.key === "Escape") setOpen(false); }}>
      <span>{active.label}</span><ChevronDown size={17} className={open ? "rotated" : ""} />
    </button>
    {open && <div className="policy-menu" role="listbox" aria-label="Water-sharing rule" onKeyDown={(event) => { if (event.key === "Escape") { setOpen(false); triggerRef.current?.focus(); } }}>
      {policies.map((policy) => <button key={policy.value} type="button" role="option" aria-selected={policy.value === value} className={`policy-option ${policy.value === value ? "selected" : ""}`} onClick={() => { onChange(policy.value); setOpen(false); triggerRef.current?.focus(); }}>
        <span className="policy-option-copy"><strong>{policy.label}</strong><small>{policy.description}</small></span>{policy.value === value && <Check size={16} />}
      </button>)}
    </div>}
  </div>;
}

export function Workspace() {
  const [scenario, setScenario] = useState<SimulationInput>(freshDemoInput);
  const [lastRunInput, setLastRunInput] = useState<SimulationInput>(freshDemoInput);
  const [result, setResult] = useState<SimulationResult>(initialResult);
  const [dirty, setDirty] = useState(false);
  const [selection, setSelection] = useState<Selection>({ type: "channel", id: "b-c" });
  const [rainfallText, setRainfallText] = useState("40");
  const [budgetText, setBudgetText] = useState("12000");
  const [recommendation, setRecommendation] = useState<OptimizationResult | null>(null);
  const [comparison, setComparison] = useState<Comparison | null>(null);
  const [error, setError] = useState("");
  const [reportText, setReportText] = useState("");
  const [proposal, setProposal] = useState<AIExtractedReport | null>(null);
  const [diagnosisBusy, setDiagnosisBusy] = useState(false);
  const [diagnosisMessage, setDiagnosisMessage] = useState("");

  const selectedTank = selection?.type === "tank" ? scenario.tanks.find((item) => item.id === selection.id) : undefined;
  const selectedChannel = selection?.type === "channel" ? scenario.channels.find((item) => item.id === selection.id) : undefined;
  const selectedRepair = selectedChannel && scenario.repairs.find((item) => item.channelId === selectedChannel.id);
  const restoredIds = useMemo(() => comparison?.repairIds.map((id) => scenario.repairs.find((item) => item.id === id)?.channelId).filter((id): id is string => Boolean(id)) ?? [], [comparison, scenario]);
  const invalidRainfall = !/^\d+(?:\.\d+)?$/.test(rainfallText) || Number(rainfallText) > 500;
  const invalidBudget = !/^\d+$/.test(budgetText) || Number(budgetText) > 1_000_000_000;

  function edit(next: SimulationInput) {
    setScenario(next); setDirty(true); setRecommendation(null); setComparison(null); setError("");
  }

  function updateCondition(condition: WaterChannel["condition"]) {
    if (!selectedChannel) return;
    edit({ ...scenario, channels: scenario.channels.map((item) => item.id === selectedChannel.id ? { ...item, condition } : item) });
  }

  async function run() {
    if (invalidRainfall) { setError("Enter rainfall from 0 to 500 mm."); return; }
    try {
      const response = await fetch("/api/simulate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(scenario) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not run simulation.");
      const nextResult = data.result as SimulationResult;
      setResult(nextResult); setLastRunInput(structuredClone(scenario)); setDirty(false);
      setRecommendation(null); setComparison(null); setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not run simulation."); }
  }

  async function findRepairs() {
    if (invalidRainfall || invalidBudget) { setError("Enter valid rainfall and a whole-rupee repair budget."); return; }
    try {
      const response = await fetch("/api/optimize", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ input: scenario, budgetINR: Number(budgetText) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not evaluate repairs.");
      const next = data.recommendation as OptimizationResult;
      setResult(next.baseline); setLastRunInput(structuredClone(scenario)); setDirty(false);
      setRecommendation(next); setComparison(null); setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not evaluate repairs."); }
  }

  function applyRecommendation() {
    if (!recommendation || dirty || recommendation.selectedRepairIds.length === 0) return;
    try {
      const next = applyRepairs(scenario, recommendation.selectedRepairIds);
      const after = simulate(next);
      setComparison({ before: recommendation.baseline, after, costINR: recommendation.totalCostINR, repairIds: recommendation.selectedRepairIds });
      setScenario(next); setLastRunInput(structuredClone(next)); setResult(after); setRecommendation(null); setDirty(false); setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not apply repairs."); }
  }

  function reset() {
    const fresh = freshDemoInput();
    setScenario(fresh); setLastRunInput(freshDemoInput()); setResult(simulate(fresh));
    setRainfallText("40"); setBudgetText("12000"); setSelection({ type: "channel", id: "b-c" });
    setDirty(false); setRecommendation(null); setComparison(null); setError(""); setProposal(null); setDiagnosisMessage("");
  }

  function exportReport() {
    const report = {
      title: "JalDhara — illustrative scenario report",
      disclaimer: "Invented demonstration values. Not a field survey or engineering approval.",
      assumptions: ["One rainfall event and instantaneous routing step", "Demand served before storage and onward surplus", "Integer litres", "All fixture names, quantities and repair costs are illustrative"],
      scenario: lastRunInput, result,
      comparison,
      engineeringConstraints: ["Directed acyclic network", "Tank and channel capacity limits", "Water balance residual must equal zero"],
      limitations: ["No infiltration, evaporation, groundwater, hydraulic head, travel time, or calibrated rainfall series"],
      references: ["https://www.frontiersin.org/journals/water/articles/10.3389/frwa.2025.1597293/full", "https://www.tnagrisnet.tn.gov.in/fcms/documents/go/agri_e_ms_87_ae2_2023.pdf"],
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a"); link.href = url; link.download = "jaldhara-scenario.json"; link.click();
    URL.revokeObjectURL(url);
  }

  async function diagnose() {
    if (!reportText.trim()) return;
    setDiagnosisBusy(true); setDiagnosisMessage(""); setProposal(null);
    try {
      const response = await fetch("/api/diagnose", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: reportText }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Diagnosis is unavailable. Use the manual controls above.");
      setProposal(data.proposal);
    } catch (cause) { setDiagnosisMessage(cause instanceof Error ? cause.message : "Diagnosis unavailable. Use manual controls."); }
    finally { setDiagnosisBusy(false); }
  }

  function confirmProposal() {
    if (!proposal) return;
    let next = scenario;
    if (proposal.channelId && proposal.defect !== "unknown") {
      next = { ...next, channels: next.channels.map((item) => item.id === proposal.channelId ? { ...item, condition: proposal.defect as WaterChannel["condition"] } : item) };
      setSelection({ type: "channel", id: proposal.channelId });
    }
    if (proposal.budgetINR !== null) setBudgetText(String(proposal.budgetINR));
    edit(next); setProposal(null); setDiagnosisMessage("Proposal copied into the controls. Run the simulation to see computed results.");
  }

  const affected = scenario.villages.filter((village) => {
    if (dirty) return false;
    const now = result.villageDeliveries.find((item) => item.villageId === village.id);
    const base = initialResult.villageDeliveries.find((item) => item.villageId === village.id);
    return Boolean(now && base && now.householdUnmetL + now.irrigationUnmetL > base.householdUnmetL + base.irrigationUnmetL);
  });

  return (
    <section id="workspace" className="workspace-shell">
      <div className="workspace-intro">
        <div><h1>Understand the water system.</h1>
          <p>Change rainfall or a channel to see how water reaches each village.</p></div>
      </div>

      <div className="workspace-grid">
        <aside className="side-panel config-panel">
          <div className="panel-heading"><h2>Scenario</h2><SlidersHorizontal size={17} /></div>
          <p className="panel-subtitle">Adjust the event and allocation rule.</p>
          <h3 className="form-section-title">Event inputs</h3>
          <div className="form-group"><label htmlFor="rainfall">Rainfall input <span>mm</span></label>
            <div className="input-with-unit"><input id="rainfall" type="number" min="0" max="500" step="1" value={rainfallText}
              onChange={(event) => { const text = event.target.value; setRainfallText(text); const value = Number(text); if (text !== "" && Number.isFinite(value) && value >= 0 && value <= 500) edit({ ...scenario, rainfall: { ...scenario.rainfall, rainfallMm: value } }); }} /><span>mm</span></div>
            {invalidRainfall && <small className="field-error">Enter 0–500 mm.</small>}
            <small>Rainfall over each catchment becomes runoff.</small></div>
          <div className="form-group"><label htmlFor="budget">Repair budget <span>INR</span></label>
            <div className="input-with-unit"><input id="budget" type="number" min="0" max="1000000000" step="1" value={budgetText} onChange={(event) => { setBudgetText(event.target.value); setRecommendation(null); }} /><span>₹</span></div>
            {invalidBudget && <small className="field-error">Enter a whole-rupee budget.</small>}</div>
          <div className="form-group"><label id="policy-label">Water-sharing rule</label>
            <PolicyPicker value={scenario.policy.mode} onChange={(mode) => edit({ ...scenario, policy: { mode } })} />
            <small id="policy-help">{policies.find((policy) => policy.value === scenario.policy.mode)?.description}</small></div>

          <div className="section-rule" />
          <div className="panel-heading"><h3 className="form-section-title">Selected component</h3>{selection && <span className="inspector-count">{selection.type === "tank" ? "Tank" : "Channel"}</span>}</div>
          {selectedTank ? <div className="inspector">
            <h3>{selectedTank.name}</h3><p>{scenario.villages.find((item) => item.tankId === selectedTank.id)?.name ?? "Upstream source"}</p>
            <dl><div><dt>Capacity</dt><dd>{number(selectedTank.capacityL)} L</dd></div><div><dt>Initial storage</dt><dd>{number(selectedTank.initialStorageL)} L</dd></div><div><dt>Catchment</dt><dd>{number(selectedTank.catchmentAreaM2)} m²</dd></div><div><dt>Runoff coefficient</dt><dd>{selectedTank.runoffCoefficient}</dd></div></dl>
          </div> : selectedChannel ? <div className="inspector">
            <div className="inspector-title"><h3>{selectedChannel.sourceTankId.toUpperCase()} → {selectedChannel.targetTankId.toUpperCase()}</h3><span className={`condition-pill ${selectedChannel.condition}`}>{currentStatus(selectedChannel)}</span></div>
            <p>Overflow channel · {number(selectedChannel.capacityL)} L / event</p>
            <div className="segment-control" role="group" aria-label="Channel condition">
              {(["functional", "degraded", "blocked"] as const).map((status) => <button key={status} className={selectedChannel.condition === status ? "selected" : ""} onClick={() => updateCondition(status)}>{status}</button>)}
            </div>
            <dl><div><dt>Efficiency</dt><dd>{Math.round(selectedChannel.efficiency * 100)}%</dd></div><div><dt>Repair estimate</dt><dd>{selectedRepair ? money(selectedRepair.costINR) : "—"}</dd></div></dl>
          </div> : <div className="inspector-empty">Select a tank or channel on the canvas to inspect its properties.</div>}
          <div className="action-stack"><button className="button-primary" onClick={run} disabled={invalidRainfall}><Droplets size={17} /> Run simulation</button>
            <button className="button-outline" onClick={findRepairs} disabled={invalidRainfall || invalidBudget}><Wrench size={16} /> Find repairs within budget</button></div>
          {error && <div className="alert" role="alert"><CircleAlert size={16} />{error}</div>}
          <button className="reset-button" onClick={reset}><RotateCcw size={15} /> Reset scenario</button>
          <div className="section-rule" />
          <details className="diagnosis-details"><summary><span><Sparkles size={15} /> Describe a fault</span><ChevronDown size={15} /></summary>
            <p>Optional Groq extraction creates an editable proposal. It never calculates water outcomes.</p>
            <label htmlFor="report-text">Your observation</label><textarea id="report-text" maxLength={1000} rows={3} placeholder="The B to C channel is blocked..." value={reportText} onChange={(event) => setReportText(event.target.value)} />
            <button className="button-outline" onClick={diagnose} disabled={!reportText.trim() || diagnosisBusy}>{diagnosisBusy ? "Reading report…" : "Extract details"}</button>
            {diagnosisMessage && <small className="diagnosis-message" role="status">{diagnosisMessage}</small>}
            {proposal && <div className="proposal"><span className="eyebrow">REVIEW BEFORE APPLYING</span><strong>Channel {proposal.channelId?.toUpperCase() ?? "unknown"} · {proposal.defect}</strong><small>Budget {proposal.budgetINR === null ? "not specified" : money(proposal.budgetINR)}</small><small>Villages: {proposal.villageIds.length ? proposal.villageIds.join(", ") : "not specified"}</small><div><button onClick={confirmProposal}>Use proposal</button><button onClick={() => setProposal(null)}>Dismiss</button></div></div>}
          </details>
        </aside>

        <NetworkCanvas input={scenario} result={dirty ? null : result} selection={selection} restoredIds={restoredIds} onSelect={setSelection} />

        <aside className="side-panel results-panel">
          <div className="panel-heading"><h2>Results</h2><span className={`run-indicator ${dirty ? "stale" : ""}`}>{dirty ? "Needs update" : "Current"}</span></div>
          <p className="panel-subtitle">Water delivered in this event</p>
          {dirty && <div className="stale-notice" role="status">Inputs changed. Run the simulation to update these results.</div>}
          <div className="featured-metric"><span>Water delivered</span><strong key={result.deliveredL}>{number(result.deliveredL)}<small> L</small></strong><p>of {number(scenario.demands.reduce((total, item) => total + item.amountL, 0))} L requested</p><div className="progress-track"><div style={{ width: `${Math.min(100, result.deliveredL / Math.max(1, scenario.demands.reduce((total, item) => total + item.amountL, 0)) * 100)}%` }} /></div></div>
          <div className="metric-grid"><Metric label="Unmet demand" value={result.unmetDemandL} tone={result.unmetDemandL ? "metric-warning" : ""} /><Metric label="Blocked channels" value={scenario.channels.filter((channel) => channel.condition === "blocked").length} suffix=" channels" tone={scenario.channels.some((channel) => channel.condition === "blocked") ? "metric-warning" : ""} /><Metric label="Spill" value={result.externalSpillL} /><Metric label="Channel loss" value={result.channelLossL} /></div>
          <div className="balance-line"><ShieldCheck size={15} /><span>Stored: {number(result.finalStorageL)} L · Balance check</span><strong>{result.balanceResidualL} L</strong></div>
          <div className="section-rule" />
          <div className="panel-heading"><h3 className="form-section-title">Village delivery</h3><span className="subtle-count">{scenario.villages.length} villages</span></div>
          <div className="village-list">{scenario.villages.map((village) => {
            const row = result.villageDeliveries.find((item) => item.villageId === village.id)!;
            const delivered = row.householdDeliveredL + row.irrigationDeliveredL;
            const unmet = row.householdUnmetL + row.irrigationUnmetL;
            return <div className="village-row" key={village.id}><div><strong>{village.name}</strong><small>Household {number(row.householdDeliveredL)} · Irrigation {number(row.irrigationDeliveredL)} L</small></div><span className={unmet ? "shortage" : ""}>{number(delivered)} / 500 L</span></div>;
          })}</div>
          {affected.length > 0 && !dirty && <div className="affected-line"><CircleAlert size={15} />Affected: {affected.map((item) => item.name).join(", ")}</div>}
          <div className="section-rule" />
          <div className="section-rule" />
          <div className="panel-heading"><h3 className="form-section-title">Repair options</h3><Wrench size={16} /></div>
          {recommendation ? <div className="recommendation"><span className="rec-tag">Evaluated {recommendation.evaluatedSubsetCount} options</span><h3>{recommendation.selectedRepairIds.length ? `${recommendation.selectedRepairIds.length} repair recommended` : "No effective repair"}</h3><p>{recommendation.explanation}</p>
            {recommendation.selectedRepairIds.length > 0 && <><div className="rec-facts"><div><span>Estimated cost</span><strong>{money(recommendation.totalCostINR)}</strong></div><div><span>Unmet after</span><strong>{number(recommendation.recommended.unmetDemandL)} L</strong></div></div><button className="button-primary" onClick={applyRecommendation}><Check size={17} /> Apply recommendation <ArrowRight size={16} /></button></>}
          </div> : comparison ? <div className="recommendation comparison"><span className="rec-tag">BEFORE → AFTER</span><h3>Connection restored</h3><p>Computed using the same rainfall, storage, demand, and policy.</p><div className="compare-table"><div><span>Delivered</span><strong>{number(comparison.before.deliveredL)} → {number(comparison.after.deliveredL)} L</strong></div><div><span>Unmet</span><strong>{number(comparison.before.unmetDemandL)} → {number(comparison.after.unmetDemandL)} L</strong></div><div><span>Repair cost</span><strong>{money(comparison.costINR)}</strong></div></div></div>
            : <div className="recommendation-empty"><span className="empty-icon"><Wrench size={18} /></span><strong>No repair evaluated yet</strong><p>Block or degrade a channel, enter a budget, then find the best feasible repair set.</p></div>}
          <button className="export-button" onClick={exportReport} disabled={dirty}><ArrowDownToLine size={16} /> Download scenario report <ArrowRight size={15} /></button>
        </aside>
      </div>
      <div className="workspace-footnote"><span>MODEL NOTE</span> This is a transparent, one-step educational simulation with invented inputs. It is not a field survey, hydraulic design, or verified water-saving estimate.</div>
    </section>
  );
}
