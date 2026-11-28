# Terrain & Track Element Catalog

A catalog of all 34 terrain features and layout elements across all 25 playable maps in Podmania, based on [mapRegistry.ts](../src/maps/mapRegistry.ts), [TrackBuilder.ts](../src/world/TrackBuilder.ts), and [PodPhysics.ts](../src/pod/PodPhysics.ts).

## Maps Reference (Categorized by Difficulty)

### Easy (6 Maps)
- **Dustveil Gorge** — [map1_dustveil.ts](../src/maps/map1_dustveil.ts)
- **Sunstone Arches** — [map6_sunstone_arches.ts](../src/maps/map6_sunstone_arches.ts)
- **Oasis Mirage Circuit** *(3-Lap Loop)* — [map7_emerald_oasis_loop.ts](../src/maps/map7_emerald_oasis_loop.ts)
- **Glacial U-Trough** — [map8_glacier_halfpipe.ts](../src/maps/map8_glacier_halfpipe.ts)
- **Cloudspan Causeway** — [map9_cloudspan_causeway.ts](../src/maps/map9_cloudspan_causeway.ts)
- **Amber Mesa Fork** — [map10_amber_mesa.ts](../src/maps/map10_amber_mesa.ts)

### Medium (7 Maps)
- **Frostspire Glacier** — [map3_frostspire.ts](../src/maps/map3_frostspire.ts)
- **Zenith Skyway** — [map4_zenith_skyway.ts](../src/maps/map4_zenith_skyway.ts)
- **Cinder Velodrome** *(3-Lap Loop)* — [map11_cinder_bowl_loop.ts](../src/maps/map11_cinder_bowl_loop.ts)
- **Copperhead Badlands** — [map12_copperhead_whoops.ts](../src/maps/map12_copperhead_whoops.ts)
- **Twin-Span Viaduct** — [map13_overpass_canyon.ts](../src/maps/map13_overpass_canyon.ts)
- **Gale-Force Spire** — [map14_zephyr_ridge.ts](../src/maps/map14_zephyr_ridge.ts)
- **Shattered Shale Run** — [map15_shale_cascade.ts](../src/maps/map15_shale_cascade.ts)

### Hard (6 Maps)
- **Crimson Rift** — [map2_crimson_rift.ts](../src/maps/map2_crimson_rift.ts)
- **Sunscorch Labyrinth** — [map5_dune_labyrinth.ts](../src/maps/map5_dune_labyrinth.ts)
- **Sulfur Acid Caldera** — [map16_acid_caldera.ts](../src/maps/map16_acid_caldera.ts)
- **Ion Conduit Ring** *(3-Lap Loop)* — [map17_reactor_gates_loop.ts](../src/maps/map17_reactor_gates_loop.ts)
- **Widowmaker Spire** — [map18_widowmaker_helix.ts](../src/maps/map18_widowmaker_helix.ts)
- **Great Rift Odyssey** *(3+ Min Continental Marathon)* — [map19_great_rift_odyssey.ts](../src/maps/map19_great_rift_odyssey.ts)

### Expert (6 Maps)
- **Skyfall Ruined Viaduct** — [map20_skyfall_ruins.ts](../src/maps/map20_skyfall_ruins.ts)
- **Pod Graveyard Gauntlet** — [map21_graveyard_gauntlet.ts](../src/maps/map21_graveyard_gauntlet.ts)
- **Obsidian Vortex** — [map22_obsidian_vortex.ts](../src/maps/map22_obsidian_vortex.ts)
- **Subzero Crevasse** — [map23_cryo_abyss_run.ts](../src/maps/map23_cryo_abyss_run.ts)
- **Colossus Sky Grand Prix** *(3-Lap Loop • 3+ Min Marathon)* — [map24_colossus_grand_prix.ts](../src/maps/map24_colossus_grand_prix.ts)
- **Trans-Planetary Crucible** *(3+ Min Ultimate Marathon)* — [map25_trans_planetary_marathon.ts](../src/maps/map25_trans_planetary_marathon.ts)

---

## Element Catalog

| Element | Description | Maps Where It Appears |
| :--- | :--- | :--- |
| **Big Height Difference / Chasm Plunge** | Major vertical drops (`22m–44m` per drop) combining `jump_lip` or `cliff_drop` with `chasm_floor` and `landing_slope`. | Dustveil Gorge, Crimson Rift, Frostspire Glacier, Zenith Skyway, Sunscorch Labyrinth, Glacial U-Trough, Amber Mesa Fork, Gale-Force Spire, Widowmaker Spire, Great Rift Odyssey, Subzero Crevasse, Trans-Planetary Crucible |
| **Sheer Cliff Drop** (`cliff_drop`) | Level cliff edge with warning pylons that drops vertically (`42m–44m`) into a deep basin. | Dustveil Gorge, Crimson Rift, Widowmaker Spire, Great Rift Odyssey, Subzero Crevasse, Trans-Planetary Crucible |
| **Two-Tier Split Terrace** (`split_terrace`) | Extra-wide (`56m`) divided section where the left half climbs along a gradual slope up to `+24m` above the right half and ends in a drop. | Zenith Skyway, Twin-Span Viaduct, Skyfall Ruined Viaduct, Colossus Sky Grand Prix |
| **200m Obstacle Slalom Arena** (`pillar_slalom`) | Ultra-wide (`200m`) basin filled with staggered rock outcrops to slalom through, plus huge optional launch ramps. | Sunscorch Labyrinth, Great Rift Odyssey, Trans-Planetary Crucible |
| **Half-Track Rock Barrier** (`half_rock_left` / `half_rock_right`) | Giant jagged rock blocking either the left or right half of the track; can be chained for high-speed slaloms. | Dustveil Gorge, Crimson Rift, Sulfur Acid Caldera, Ion Conduit Ring, Great Rift Odyssey, Skyfall Ruined Viaduct, Obsidian Vortex, Colossus Sky Grand Prix, Trans-Planetary Crucible |
| **Sharp Turn / Hairpin** | Tight direction-reversing bends with heavy banking (`14°–18°`), often inside caverns or technical sectors. | Dustveil Gorge, Crimson Rift, Frostspire Glacier, Sunscorch Labyrinth, Twin-Span Viaduct, Shattered Shale Run, Widowmaker Spire, Pod Graveyard Gauntlet, Trans-Planetary Crucible |
| **S-Bend / Slalom** | Rapidly alternating left/right banked turns (`10°–16°` reversals). | Dustveil Gorge, Frostspire Glacier, Zenith Skyway, Glacial U-Trough, Copperhead Badlands, Ion Conduit Ring, Colossus Sky Grand Prix |
| **Middle Track Height Divider** (`ridge_split`) | Raised central rock spine splitting the track into two parallel channels (`32–36m` total width). | Crimson Rift, Amber Mesa Fork, Cinder Velodrome, Twin-Span Viaduct, Great Rift Odyssey, Trans-Planetary Crucible |
| **Enclosed Cavern** (`cave`) | Pitch-dark roofed rock/ice/geode tunnel with dim crystal glints and ceiling collision. | Dustveil Gorge, Crimson Rift, Frostspire Glacier, Sunscorch Labyrinth, Glacial U-Trough, Twin-Span Viaduct, Great Rift Odyssey, Obsidian Vortex, Trans-Planetary Crucible |
| **Jumpy Section — Rolling Dunes** (`sand_dunes`) | Sinusoidal wave-shaped terrain floor creating rhythmic vertical bumps. | Sunscorch Labyrinth, Oasis Mirage Circuit, Amber Mesa Fork, Great Rift Odyssey |
| **Jumpy Section — Rough Scree** (`rough_scree`) | Jagged, uneven boulder-strewn floor with high surface noise and extra drag. | Amber Mesa Fork, Cinder Velodrome, Shattered Shale Run, Great Rift Odyssey, Pod Graveyard Gauntlet, Trans-Planetary Crucible |
| **Steep Downhill Speed Chute** | Long, steep downward slope (`26m–40m+` descent) that builds raw speed via gravity before jumps or finish sprints. | Frostspire Glacier, Zenith Skyway, Sunscorch Labyrinth, Glacial U-Trough, Gale-Force Spire, Widowmaker Spire, Great Rift Odyssey, Colossus Sky Grand Prix, Trans-Planetary Crucible |
| **Elevated Skyway / Bridge Deck** (`bridge_deck`) | Flat suspended causeway with low outer curbs, warning pylons, and open drop-offs. | Zenith Skyway, Cloudspan Causeway, Gale-Force Spire, Ion Conduit Ring, Great Rift Odyssey, Skyfall Ruined Viaduct, Obsidian Vortex, Colossus Sky Grand Prix, Trans-Planetary Crucible |
| **Banked Canyon Berm** | Angled track floor (`6°–18°` banking) for carrying speed through curves. | Appears across all 25 maps |
| **Narrow Technical Squeeze** | Tight `19–22m` canyon width sections demanding crisp line discipline. | Dustveil Gorge, Crimson Rift, Frostspire Glacier, Sunscorch Labyrinth, Copperhead Badlands, Shattered Shale Run, Sulfur Acid Caldera, Pod Graveyard Gauntlet, Subzero Crevasse, Trans-Planetary Crucible |
| **Finish Basin** (`finish_basin`) | Widened (`28–34m`) final stretch (or Start/Finish straight on loop circuits). | Appears across all 25 maps |
| **Half-Pipe / U-Trough** (`half_pipe`) | Deep concave U-shaped channel where high-speed pods can ride high up the curved walls to set up corner entries. | Sunstone Arches, Oasis Mirage Circuit, Glacial U-Trough, Ion Conduit Ring, Great Rift Odyssey |
| **Wallride Bowl** (`wallride_bowl`) | Extreme sweeping outer wallride stadium bowl with enhanced lateral grip for full-throttle cornering. | Cinder Velodrome, Gale-Force Spire, Ion Conduit Ring, Obsidian Vortex, Colossus Sky Grand Prix, Trans-Planetary Crucible |
| **Stepped Cascade** (`stepped_cascade`) | Series of 4 rapid terrace drops where fast pods clear multiple steps in one jump while slower pods hop step-by-step. | Glacial U-Trough, Cinder Velodrome, Shattered Shale Run, Great Rift Odyssey, Subzero Crevasse, Trans-Planetary Crucible |
| **True Void Gap Jump** (`void_gap`) | Broken span or split cliff with an `-82m` bottomless abyss underneath, requiring enough speed to clear onto the landing deck. | Widowmaker Spire, Skyfall Ruined Viaduct, Obsidian Vortex, Subzero Crevasse, Colossus Sky Grand Prix, Trans-Planetary Crucible |
| **Tabletop Plateau Jump** (`tabletop_jump`) | Smooth launch ramp onto an `+8.5m` elevated flat mesa plateau followed by a down-ramp. | Sunstone Arches, Oasis Mirage Circuit, Cloudspan Causeway, Copperhead Badlands, Twin-Span Viaduct, Great Rift Odyssey |
| **Stalactite / Low-Clearance Ceiling** (`stalactite_corridor`) | Low-roofed cavern studded with hanging rock/icicle cones that punish high jumps and force flat driving. | Shattered Shale Run, Sulfur Acid Caldera, Great Rift Odyssey, Pod Graveyard Gauntlet, Subzero Crevasse, Trans-Planetary Crucible |
| **Crosswind Gust Zone** (`crosswind_zone`) | Exposed ridge with visible wind-streak ribbons that push pods laterally, requiring active counter-steering. | Gale-Force Spire, Great Rift Odyssey, Skyfall Ruined Viaduct, Colossus Sky Grand Prix, Trans-Planetary Crucible |
| **Crumbling Bridge Deck** (`crumbling_bridge`) | Ancient stone or ice causeway with missing outer slabs that drop into the abyss if pods drift off the center spine. | Sulfur Acid Caldera, Skyfall Ruined Viaduct, Subzero Crevasse, Trans-Planetary Crucible |
| **Hazard Floor Basin (Lava / Acid)** (`hazard_pit`) | Glowing molten lava or caustic acid central pool that scorches hull and heats engines, forcing drivers onto raised perimeter ledges. | Sulfur Acid Caldera, Widowmaker Spire, Obsidian Vortex, Trans-Planetary Crucible |
| **Wreckage / Debris Field** (`debris_field`) | Scattered boulders and scorched podracer turbine wreckage that players weave between or hop over. | Copperhead Badlands, Great Rift Odyssey, Pod Graveyard Gauntlet, Obsidian Vortex, Trans-Planetary Crucible |
| **Deep Silt / Quicksand Trench** (`silt_trench`) | High-drag quicksand basin traversed by a narrow weaving firm stone ribbon that rewards precise line tracking. | Copperhead Badlands, Sulfur Acid Caldera, Great Rift Odyssey, Pod Graveyard Gauntlet |
| **Off-Camber Curve** (`off_camber`) | Crowned slick shale curve banked *away* from the turn apex (`±8°–12°`), pulling pods outward. | Shattered Shale Run, Widowmaker Spire, Pod Graveyard Gauntlet, Subzero Crevasse, Trans-Planetary Crucible |
| **Washboard / Whoops Section** (`whoops_section`) | High-frequency rhythmic terrain ripples that reward hitting top speed to skim across the crests. | Amber Mesa Fork, Copperhead Badlands, Great Rift Odyssey, Pod Graveyard Gauntlet |
| **Shallow Water / Meltwater Ford** (`water_ford`) | Shimmering shallow river crossing with slight water drag that rapidly cools both engines (`-26%/s`). | Sunstone Arches, Oasis Mirage Circuit, Glacial U-Trough, Twin-Span Viaduct, Shattered Shale Run, Great Rift Odyssey |
| **Asymmetric Risk/Reward Fork** (`asymmetric_fork`) | Wide split canyon divided by an off-center rock spine into a tight, fast left groove and a wide, forgiving right channel. | Amber Mesa Fork, Twin-Span Viaduct, Great Rift Odyssey, Subzero Crevasse |
| **Helical Spiral Ramp** (`spiral_helix`) | Sustained corkscrewing causeway climbing or descending around a central canyon spire or skyway tower. | Gale-Force Spire, Widowmaker Spire, Obsidian Vortex, Colossus Sky Grand Prix, Trans-Planetary Crucible |
| **Double-Apex Sweeper** (`double_apex`) | Long curving basin with striped racing kerbs and two distinct apexes separated by a short straightening kink. | Oasis Mirage Circuit, Cloudspan Causeway, Cinder Velodrome, Colossus Sky Grand Prix |
| **Funnel / Bottleneck Entry** (`funnel_squeeze`) | Rapid chevron-marked narrowing from an ultra-wide plaza (`54–58m`) down to a tight `19–24m` gate. | Cloudspan Causeway, Copperhead Badlands, Ion Conduit Ring, Pod Graveyard Gauntlet |
| **Natural Rock Arch Sequence** (`rock_arch_sequence`) | Series of open-air stone arches spanning the canyon, casting rhythmic sunlight and shadow stripes across the floor. | Sunstone Arches, Cloudspan Causeway, Twin-Span Viaduct, Great Rift Odyssey |
