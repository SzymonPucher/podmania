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

## Proposed Elements

| Element | Category | Description |
| :--- | :--- | :--- |
| **Half-Pipe / U-Trough** (`half_pipe`) | Verticality & Acrobatics | Deep concave U-shaped channel where high-speed pods can ride high up the curved walls to set up corner entries or dodge floor hazards. |
| **Wallride Bowl** (`wallride_bowl`) | Verticality & Acrobatics | Extreme `35°–65°` sweeping outer wallride curve that lets pods hold full throttle through a massive turn without washing out. |
| **Stepped Cascade** (`stepped_cascade`) | Verticality & Acrobatics | Series of 3–5 rapid medium drops (`6m–10m` each) where fast pods can clear multiple steps in one jump while slower pods bounce down step-by-step. |
| **True Void Gap Jump** (`void_gap`) | Verticality & Acrobatics | Broken bridge or split cliff with no `chasm_floor` underneath, requiring enough speed or boost to clear the gap onto the far landing deck. |
| **Double-Decker / Over-Under** (`double_decker`) | Verticality & Acrobatics | Stacked two-level section where an upper bridge/stone span runs directly above a lower tunnel or floor path, offering a high-risk upper line and a safer lower line. |
| **Tabletop Plateau Jump** (`tabletop_jump`) | Verticality & Acrobatics | Launch ramp onto an elevated flat mesa plateau followed by a down-ramp, rewarding speed control so pods land cleanly on top rather than overshooting. |
| **Stalactite / Low-Clearance Ceiling** (`stalactite_corridor`) | Hazards & Obstacles | Low-roofed cavern or overhang studded with hanging rock/ice formations that punish big air and force pods to stay low and flat. |
| **Crosswind Gust Zone** (`crosswind_zone`) | Hazards & Obstacles | Exposed cliffside or canyon gap with visible dust/snow wind streaks that push pods laterally, requiring active counter-steering. |
| **Crumbling Bridge Deck** (`crumbling_bridge`) | Hazards & Obstacles | Ancient stone or ice bridge with missing edge slabs and holes along the sides, forcing precise center-line driving at speed. |
| **Hazard Floor Basin (Lava / Acid)** (`hazard_pit`) | Hazards & Obstacles | Wide glowing floor hazard down the center or edges that overheats engines or slows pods hovering over it, forcing drivers onto narrow raised perimeter ledges. |
| **Energy Gate Chicane** (`energy_gates`) | Hazards & Obstacles | Sci-fi pylon gates with narrow horizontal or alternating open/closed energy apertures that require tight lateral or vertical threading. |
| **Wreckage / Debris Field** (`debris_field`) | Hazards & Obstacles | Denser field of low-to-medium boulders or podracer wreckage (smaller than `pillar_slalom`) that players must weave through or skim over. |
| **Deep Silt / Quicksand Trench** (`silt_trench`) | Surface & Physics Modifiers | High-drag off-line surface (typically on corner outsides or shortcuts) that bogs pods down unless they hold boost or stay on the firm racing groove. |
| **Off-Camber Curve** (`off_camber`) | Surface & Physics Modifiers | Treacherous turn banked *away* from the apex (`-6°` to `-12°`), pulling pods outward and testing braking and drift control. |
| **Washboard / Whoops Section** (`whoops_section`) | Surface & Physics Modifiers | High-frequency rhythmic terrain ripples (much shorter wavelength than `sand_dunes`) that reward hitting the right speed to skim across the crests. |
| **Shallow Water / Meltwater Ford** (`water_ford`) | Surface & Physics Modifiers | Shallow river crossing with spray effects and slight drag that rapidly cools overheated engines in exchange for a small speed dip. |
| **Asymmetric Risk/Reward Fork** (`asymmetric_fork`) | Layout, Route Choice & Flow | Branching split where one route is a tight, technical shortcut (e.g., narrow cave or boost ledge) and the other is a wider, forgiving main canyon. |
| **Helical Spiral Ramp** (`spiral_helix`) | Layout, Route Choice & Flow | Sustained `270°–360°` curving climb or descent corkscrewing around a canyon spire or skyway tower. |
| **Double-Apex Sweeper** (`double_apex`) | Layout, Route Choice & Flow | Extra-long curving basin with two distinct apexes separated by a short straightening kink, rewarding disciplined late-apex lines. |
| **Funnel / Bottleneck Entry** (`funnel_squeeze`) | Layout, Route Choice & Flow | Rapid narrowing from an ultra-wide basin (`50m+`) down to a tight `18m–20m` gate, creating high-speed line-selection pressure. |
| **Natural Rock Arch Sequence** (`rock_arch_sequence`) | Layout, Route Choice & Flow | Rapid series of open-air stone or ice arches spanning the canyon, giving dramatic light/shadow strobing and speed sensation without full cave darkness. |
