# Field map and real data

## What is real in the current project

The four-tank `DEMO_INPUT` remains an invented arithmetic fixture. Its names, topology, demands, capacities, rainfall, and repair costs must not be presented as field measurements or used for a real repair decision. The map opens near the Mailam study region, but it does not place the paper's tanks at guessed coordinates.

The cited Mailam study is a real empirical reference: it describes a 14-tank cascade and reports watershed-level land-use, runoff, rainfall, and groundwater observations over 2004–2024. These findings provide context, not a complete set of per-tank inputs for the current one-step simulator. The paper does not supply a ready-to-import, verified coordinate and operating-data file for every tank. Do not infer precise tank locations, individual storage, channel capacity, or repair costs from the study-area map or aggregate totals.

Reference: [Socio-hydrology and sustainable tank management: empirical case from a Mailam tank cascade, Tamil Nadu, India](https://doi.org/10.3389/frwa.2025.1597293), *Frontiers in Water* (2025). The study is a research reference and map orientation only, not a validated engineering dataset for this application.

## Map record workflow

The `/map` page lets a user click the map to record a tank/water body, village, channel, or observation. Each record stores a name, latitude, longitude, source label, observation date, notes, and free-form key/value measurements. It supports JSON import/export and CSV export.

After saving a tank location, the app opens `/network`. The network view uses the saved tank names, shows each pair's straight-line geodesic distance, and draws the minimum set of proposed links connecting all mapped tanks. It multiplies that total length by an optional user-entered INR/metre rate to calculate a preliminary cost. The rate should come from a current local schedule or contractor quote. The result excludes route deviations, elevation, earthwork, materials, access, taxes, and approvals; the proposed links are not surveyed channels.

The user must supply and verify coordinates and measurements. The map does not geocode names, query a government inventory, infer channel paths, or estimate measured hydrology. Map tiles are provided by OpenStreetMap with visible attribution. Review the [tile usage policy](https://operations.osmfoundation.org/policies/tiles/) and configure an appropriate provider before significant production traffic.

Map records are stored in browser `localStorage`. They remain on that browser and are not sent to the application server. JSON and CSV export are backup and transfer paths. This is an individual-use MVP, not a multi-user database.

## Connecting mapped data to the simulation

Do not run a field scenario until its topology and required inputs have been reviewed. The simulation requires explicit tank catchment area, runoff coefficient, capacity, initial storage, channel capacity/efficiency/condition, village demand, rainfall, and repair assumptions. Track a source and date for measured fields; label modeled or user-estimated values distinctly. A source label alone does not establish that a value is verified.

Use official records or field surveys for per-feature coordinates and values. Keep rainfall period and units clear. Keep repair cost separate from the repair action's simulated restored capacity and efficiency; the optimizer's result is conditional on supplied assumptions, not an AI or engineering estimate.

## Production persistence gate

For cross-device use, add authentication and a database with ownership and row-level access controls. Preserve source, date, and verification status per measurement. Add audit history before allowing users to overwrite shared records. Never expose a database service key in client code. Until these controls exist, treat browser storage as user-controlled working data only.
