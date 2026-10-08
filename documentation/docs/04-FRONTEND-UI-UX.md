# 04 — Frontend UI/UX specification

[Requirements](02-PRODUCT-REQUIREMENTS.md) · [Models](05-DATA-MODELS.md) · [Tests](10-TESTING-AND-VALIDATION.md)

## Visual system

An engineering workspace with one clear focal point: the network canvas. Near-black `#080808` page, charcoal `#141719` surfaces, inset `#1C2123`, primary text `#F3F6F5`, secondary text `#AAB4B3`, muted `#76817F`, water teal `#37B9AE`, focus `#7EDDD3`, warning amber `#E6B65C`, fault coral `#F08278`, success `#85CBA2`. All meaning also has text/icon. Avoid purple, decorative neon, robot art, oversized hero, or marketing cards.

Use Geist or Inter with system fallback. Text sizes: body 14–16 px, metadata 12–13 px, section headings 18–20 px, page title 24–28 px, numeric metrics 24–32 px with tabular numerals. Spacing uses 4 px increments (4/8/12/16/24/32). Minimum pointer target 44×44 px. Rounded corners 10–14 px. Glass only on navbar and floating inspector: `rgba(20,23,25,.82)`, `backdrop-filter: blur(12px)`, 1 px `rgba(255,255,255,.10)` border, soft `0 12px 32px rgba(0,0,0,.25)` shadow. Opaque charcoal is preferred for dense data panels.

## Navigation and layout

Sticky 56 px navbar, logo left, Workspace/Parampara/About links right, active link with underline and `aria-current="page"`; on small screens keep logo and a labelled menu button. No primary CTA in nav because `/` is already the tool.

Desktop ≥1200 px: three regions under navbar, `minmax(260px,300px) minmax(500px,1fr) minmax(300px,340px)` with 16 px gaps and ≤1440 px content width. Left configuration scrolls, center canvas gets at least 520 px height, right results scrolls. Tablet 768–1199 px: canvas first and full width; configuration/results appear in two columns beneath. Mobile <768 px: canvas ~42–50 vh with zoom/fit buttons; a two-tab Configuration/Results area below and component inspector as a bottom sheet. No forced three narrow columns. At 320 px, input labels and units remain visible without horizontal page scroll.

```text
┌ compact nav ──────────────────────────────────────────────┐
│ Configuration │  selectable Eri-inspired network │ Results │
│ rain, budget  │  tank → channel → tank            │ balance │
│ inspector     │  legend + fit / zoom              │ repairs │
└────────────────────────────────────────────────────────────┘
```

## Components and behavior

`WorkspacePage` → `Navbar`, `ScenarioProvider/useReducer`, `ConfigurationPanel` (`RainfallField`, `BudgetField`, `PolicyToggle`, `SelectedInspector`, `ChannelConditionControl`, `RunButton`, `ResetButton`), `NetworkCanvas` (`TankNode`, `ChannelEdge`, `Legend`, `CanvasControls`), `ResultsPanel` (`RunSummary`, `VillageDemandTable`, `RepairRecommendation`, `ComparisonTable`, `ExportButton`), and optional `DiagnosisForm/ConfirmationDialog`.

- Tank nodes display ID/name, final or initial storage as “L”, and a readable state label. Click/Enter/Space selects and opens inspector with catchment, coefficient, capacity, current storage, attached village demand, and incoming/outgoing links.
- Channel edges show arrow direction and status text/icon in tooltip and inspector. Functional = thin teal solid; blocked = coral dashed plus “Blocked”; degraded = amber; restored = teal with “Restored” badge in comparison; insufficient water = grey path with “No transfer”. Animation is optional and only when a computed positive transfer exists.
- Selected inspector is the only place to block/unblock. Toggle requires no modal. Changing it marks prior results stale. A repairable channel reveals its action/cost and restored parameters.
- Run button validates, runs, and announces “Simulation updated” through an `aria-live=polite` region. It is disabled only while invalid or actively computing. Budget is required for Optimize, not Run.
- Recommendation shows IDs, total ₹ cost, delivered/unmet differences, and a one-sentence reason derived from result fields. Apply requires an available recommendation computed from the current input fingerprint; otherwise prompt rerun.
- Compare displays intact/broken/repaired labels and per-village rows. Before is the immediately pre-application scenario. Never call a number “saved water”; say “additional delivered water in this illustrative model”.
- Export is enabled after a current run; JSON/print includes the input snapshot and result. Reset asks no confirmation because scenario has no persistence; it restores the fixture and clears comparisons.

## UI states

On first load, show the fixture and an obvious “Run baseline” button, plus an “Illustrative scenario” badge. Before first run, result pane explains the next action. After edits, show “Inputs changed; run again” over old results. Validation errors appear by field and in a summary. A network parse failure shows a bounded error panel with Reset. No candidates and no affordable repairs have explicit empty messages. AI loading uses a small spinner and text; provider errors preserve manual inputs. Export failures offer retry. Avoid full-screen skeletons for local calculations.

## Accessibility and motion

All controls are native buttons/inputs with labels, focus outline 2 px `#7EDDD3`, logical Tab order, Escape to close sheet/dialog, focus returned to opener, and keyboard selection for nodes/edges via a parallel accessible component list if React Flow keyboard behavior is insufficient. Numeric tables use row/column headers. Color contrast target WCAG AA (verify actual rendered pairs). Status never depends on hue. Respect `prefers-reduced-motion`: no flow animation, instant panel transitions. Otherwise limit transitions to opacity/position ≤200 ms and a subtle flow marker for positive transfer; never animate a zero or blocked flow. See [tests](10-TESTING-AND-VALIDATION.md).
