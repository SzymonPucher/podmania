# Terrain & Track Element Catalog

A catalog of terrain features and layout elements across all playable maps in Podmania, based on [mapRegistry.ts](../src/maps/mapRegistry.ts) and [TrackBuilder.ts](../src/world/TrackBuilder.ts).

## Maps Reference

- **Dustveil Gorge** — [map1_dustveil.ts](../src/maps/map1_dustveil.ts)
- **Crimson Rift** — [map2_crimson_rift.ts](../src/maps/map2_crimson_rift.ts)
- **Frostspire Glacier** — [map3_frostspire.ts](../src/maps/map3_frostspire.ts)
- **Zenith Skyway** — [map4_zenith_skyway.ts](../src/maps/map4_zenith_skyway.ts)
- **Sunscorch Labyrinth** — [map5_dune_labyrinth.ts](../src/maps/map5_dune_labyrinth.ts)

## Element Catalog

| Element | Description | Maps Where It Appears |
| :--- | :--- | :--- |
| **Big Height Difference / Chasm Plunge** | Major vertical drops (`22m–44m` per drop) combining `jump_lip` or `cliff_drop` with `chasm_floor` and `landing_slope`. | Dustveil Gorge (24m & 44m drops), Crimson Rift (26m & 42m drops), Frostspire Glacier (32m drop), Zenith Skyway (24m & 32m drops), Sunscorch Labyrinth (28m & 22m drops) |
| **Sheer Cliff Drop** (`cliff_drop`) | Level cliff edge with warning pylons that drops vertically (`42m–44m`) into a deep basin. | Dustveil Gorge (44m drop), Crimson Rift (42m drop) |
| **Two-Tier Split Terrace** (`split_terrace`) | Extra-wide (`56m`) divided section where the left half climbs along a long, gradual slope up to `+24m` above the right half; players can drop onto the lower half mid-section, and the upper terrace ends in a drop. | Zenith Skyway |
| **200m Obstacle Slalom Arena** (`pillar_slalom`) | Ultra-wide (`200m`) basin filled with staggered rock outcrops to slalom through, plus huge optional launch ramps to jump over sections of obstacles. | Sunscorch Labyrinth |
| **Half-Track Rock Barrier** (`half_rock_left` / `half_rock_right`) | Giant jagged rock blocking either the left or right half of the track (on straights, inside turns, or outside turns); can be chained for high-speed slaloms. | Dustveil Gorge, Crimson Rift |
| **Sharp Turn / Hairpin** | Tight direction-reversing bends with heavy banking (`14°–18°`), often inside caverns or drift sectors. | Dustveil Gorge (Echoing Cavern, `-18°`), Crimson Rift (Lava Tube Cavern, `±14°`), Frostspire Glacier (Drift Hairpins & Ice Prism Cavern, `±16°`), Sunscorch Labyrinth (Geode Cavern, `-16°`) |
| **S-Bend / Slalom** | Rapidly alternating left/right banked turns (`10°–16°` reversals). | Dustveil Gorge (Twin-Arch Serpentine, Finish Chicane), Frostspire Glacier (Frozen Basin Slalom), Zenith Skyway (S-Bend Causeway), Sunscorch Labyrinth (Boulder Scree Wash) |
| **Middle Track Height Divider** (`ridge_split`) | Raised central rock spine splitting the track into two parallel channels (`32–36m` total width). | Crimson Rift (Twin-Ledge Basalt Split, Caldera Ridge) |
| **Enclosed Cavern** (`cave`) | Pitch-dark roofed rock/ice/geode tunnel with dim crystal glints and ceiling collision where the pod's engines are the brightest light source. | Dustveil Gorge, Crimson Rift, Frostspire Glacier, Sunscorch Labyrinth |
| **Jumpy Section — Rolling Dunes** (`sand_dunes`) | Sinusoidal wave-shaped terrain floor creating rhythmic vertical bumps. | Sunscorch Labyrinth |
| **Jumpy Section — Rough Scree** (`rough_scree`) | Jagged, uneven boulder-strewn floor with high surface noise. | *(available terrain type; currently unused in maps)* |
| **Boost Pad / Accelerator Rail** (`boost_pad`) | Flat high-speed energy deck with glowing guide rails, often placed before jumps or finish sprints. | Frostspire Glacier, Zenith Skyway, Sunscorch Labyrinth |
| **Thermal Magma Vent / Geyser** (`magma_vent`) | Central glowing fissure with raised outer basalt ledges and thermal updrafts. | Crimson Rift, Sunscorch Labyrinth |
| **Low-Friction Ice Sheet** (`ice_sheet`) | Smooth, shallow-trough glacial surface built for long drifts. | Frostspire Glacier |
| **Elevated Skyway / Bridge Deck** (`bridge_deck`) | Flat suspended causeway with low outer curbs and open drop-offs instead of canyon walls. | Zenith Skyway |
| **Banked Canyon Berm** | Angled track floor (`6°–18°` banking) for carrying speed through curves. | Dustveil Gorge, Crimson Rift, Frostspire Glacier, Zenith Skyway, Sunscorch Labyrinth |
| **Narrow Technical Squeeze** | Tight `20–22m` canyon width sections (compared to `28–36m` wide basins/splits). | Dustveil Gorge (`20m`), Crimson Rift (`22m`), Frostspire Glacier (`22m`), Sunscorch Labyrinth (`22m`) |
| **Finish Basin** (`finish_basin`) | Widened (`26–30m`) final stretch leading through the finish gate. | Dustveil Gorge, Crimson Rift, Frostspire Glacier, Zenith Skyway, Sunscorch Labyrinth |
