# 01 — Project overview

[README](../README.md) · [Requirements](02-PRODUCT-REQUIREMENTS.md) · [Simulation](06-SIMULATION-ENGINE.md)

## Purpose and evidence

**JalDhara** makes the effect of a broken link in an Eri-inspired tank cascade visible and testable. The real decision problem is prioritizing restoration when maintenance funds are limited, especially when a disruption changes downstream access. A [Tamil Nadu government order on tail-end irrigation](https://www.tnagrisnet.tn.gov.in/fcms/documents/go/agri_e_ms_87_ae2_2023.pdf) identifies silt and vegetation as causes of reduced channel capacity and calls for maintenance to support flow and equity. The [state WRD inventory](https://tngis.tn.gov.in/wrd/) establishes that tanks are active infrastructure; its counts are **not** inputs to the demo.

The traditional **Eri** is a Tamil irrigation tank. This MVP abstracts a directed cascade in which a tank receives runoff and upstream overflow, retains water, serves local demand, and may pass surplus through a channel to another tank. A [Mailam, Tamil Nadu, tank-cascade study](https://www.frontiersin.org/journals/water/articles/10.3389/frwa.2025.1597293/full) documents linked tanks and infrastructure degradation. The [ICID Veeranam description](https://icid-ciid.org/award/his_details/154) illustrates a historic tank with catchment storage, irrigation, channels, and surplus routing. These sources support the **concept**, not the numerical fixture or a universal rule for all Eris.

## Engineering opportunity and innovation

The **Parampara Recovery Engine** turns a network idea into an executable counterfactual: run the same rainfall, starting storage, demands, and policy against an intact, damaged, and repaired graph. The difference comes from a pure water-balance function, not AI-generated scores. A budgeted subset search evaluates whole-network consequences, including repairs whose benefit depends on another repair. The UI shows where losses and unserved demand occur.

## Users and primary journey

Hackathon judges need a credible demonstration in under a minute. Students, civil engineers, water stewards, and local planning teams could later use a calibrated version for discussion; the MVP is **not** a field decision tool. The user opens a loaded four-tank demo; selects a channel; blocks it; runs the model; inspects affected villages; enters a budget; sees a feasible repair; applies it; compares computed metrics; exports assumptions and limitations.

## Position and sustainability relevance

Educational water maps show location; a generic dashboard reports totals. This MVP adds reproducible **network intervention comparison**. It may help frame maintenance questions and preserve interest in indigenous engineering knowledge. Any claim of real water savings, drought relief, or equitable impact would require site surveys, calibrated rainfall/catchments, loss measurements, community consultation, and engineering review. The illustrative example has none of those.

## Boundary decisions

One Next.js app, one fixture, one one-step directed acyclic network, one allocation policy toggle, one subset optimizer, and optional text extraction. No maps, live data, login, sensors, pumps, formal design approval, or other traditional systems as simulation presets. [Data models](05-DATA-MODELS.md) identify every numeric fixture value as illustrative. Policy is a configurable software rule inspired by community allocation, **not** a universal historical claim.
