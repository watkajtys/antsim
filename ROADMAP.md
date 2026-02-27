# SimAnt Clone: Architectural Roadmap

To evolve our current single-screen simulation into a full-fledged *SimAnt* experience (complete with rival colonies, underground digging, and a macro-level yard grid), we need to restructure our foundation. If we just start bolting on features, the code will quickly become an unmanageable spaghetti of loops and arrays.

Here is the phased architectural plan to lay the groundwork for the full game.

---

## Phase 1: Factions & State Encapsulation (The Micro Foundation)
Currently, the `Simulation` class owns all ants, food, and pheromones directly. To support multiple colonies (e.g., Black Ants vs. Red Ants), we need to encapsulate these concepts.

*   **The `Colony` Class:** We need to create a `Colony` object that acts as the "player" or "AI". It will own its specific `foodStored`, `moundLocation`, and array of `Ant` entities.
*   **Colony-Specific Pheromones:** Pheromone grids (Home, Food, Alarm) must belong to the `Colony`, not the global simulation. Red ants shouldn't follow Black ant trails, and their alarm pheromones shouldn't trigger each other.
*   **Combat Identification:** Ants need a `colonyId`. When two ants meet, they check IDs. If they don't match, they enter the `FIGHTING` state.
*   **Goal:** At the end of this phase, we can drop a Red Queen and a Black Queen on the same map, and they will build competing, independent pheromone networks and fight over the same food sources.

## Phase 1.5: Surface Ecosystem & Polish (Current Focus)
Before digging underground, we can make the surface feel like a living, breathing ecosystem:
*   **Castes (Workers vs. Soldiers):** Divide ants into specialized roles. Workers forage and flee; Soldiers patrol and fight.
*   **Live Prey:** Replace static food clicks with wandering caterpillars or beetles that ants must actively hunt and break down.
*   **Visual Overhaul:** Give ants distinct body segments, wiggling legs, and render pheromones as smooth, glowing trails instead of grid blocks.
*   **Environmental Hazards:** Add weather systems like rainstorms that wash away pheromone trails, forcing colonies to adapt and re-explore.

## Phase 2: The Z-Axis (Surface vs. Underground)
*SimAnt* is defined by the transition between the dangerous surface and the safe, diggable underground.

*   **Map Layers:** The simulation needs to support multiple `Map` or `Layer` objects. Currently, we just have one 2D space. We need a `SurfaceLayer` and an `UndergroundLayer`.
*   **Portals (The Mound):** The mound is no longer just a drop-off point; it becomes a portal. When an ant enters the mound on the surface, it is removed from the `SurfaceLayer` array and added to the `UndergroundLayer` array.
*   **Destructible Terrain:** The underground layer needs a dense grid of "Dirt" that ants can actively remove (dig) to create paths, chambers, and nest structures.
*   **Goal:** At the end of this phase, the user can toggle the camera between the Surface (where food and spiders are) and the Underground (where the Queen and food storage are).

## Phase 3: The Economy (Castes, Brood, and UI)
Right now, ants just pop into existence when food > 25. We need the actual life cycle.

*   **The Brood Cycle:** Food is brought to the Queen -> Queen lays Eggs -> Eggs become Larvae -> Larvae become Pupae -> Pupae hatch into Ants.
*   **Castes:** Introduce `Worker` (fast, weak, carries food), `Soldier` (slow, strong, fights), and `Queen` (stationary, breeds).
*   **Behavior States:** Ants need a higher-level "Job" state (Foraging, Nursing, Digging) that dictates which state machine they run.
*   **The UI Sliders:** Implement the classic UI where the player sets the desired ratio of castes (e.g., 70% workers, 30% soldiers) and the ratio of behaviors.
*   **Goal:** At the end of this phase, the colony feels like a living organism that the player manages via macro-commands rather than just watching it auto-grow.

## Phase 4: The Macro Grid (The Yard)
Once a single patch of dirt works perfectly with two colonies and an underground, we can zoom out.

*   **The `Yard` Class:** A high-level 2D grid (e.g., 10x10) representing the whole backyard. Each cell in this grid is a `Patch`.
*   **Active vs. Abstract Simulation:** We cannot run 60fps physics, pheromone evaporation, and line-of-sight checks for 100 patches simultaneously. 
    *   *Active Patch:* The patch the player is currently viewing runs the full `Simulation.ts` logic.
    *   *Abstract Patch:* Off-screen patches run a simplified math-based resolution (e.g., "Colony A has 500 ants, Colony B has 200 ants. Colony A gains territory").
*   **Alates (Breeders):** Introduce winged ants. In the late game, the player spawns Alates, switches to the Yard view, and clicks an adjacent patch to send them there, starting a new `Colony` instance in that `Patch`.
*   **Goal:** The full game loop is complete. The player can conquer the yard.

---

### Immediate Next Steps (Actionable for our current codebase):
To start moving towards Phase 1, our very next code changes should be:
1. Create a `Colony` class.
2. Move `foodStored`, `ants`, `moundX/Y`, and the three pheromone grids inside the `Colony` class.
3. Update the `Simulation` to hold an array of `Colonies` instead of loose ants.
4. Update the rendering loop to draw ants based on their colony color.
