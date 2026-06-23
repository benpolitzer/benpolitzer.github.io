---
title: "Hydraulic Erosion"
date: 2026-02-09
weight: 10
cover: "HydraulicErosion.gif"
---
![Hydraulic erosion simulation eroding a generated terrain mesh](/gifs/HydraulicErosion.gif)

This project simulates hydraulic erosion on procedurally generated terrain in Unity, carving rivers and ridgelines into a noise-based heightmap the same way real water reshapes land over time. 
The terrain starts as a layered Perlin noise mesh; from there, a swarm of water droplets is spawned at high points and let loose to carve, carry, and redeposit material as they flow downhill. 
Repeated over enough droplets, the once-uniform noise mesh ends up with the kind of carved channels and ridges you'd expect from real-world erosion, rather than the smoother, more artificial look of raw procedural noise.

**Features**
- Procedural terrain mesh generation using layered Perlin noise
- Particle-based hydraulic erosion simulation, with droplets that carve, carry sediment, and deposit it downhill
- Runtime UI for adjusting erosion strength, deposit amount, droplet count, and simulation speed
- Pause, resume, step, and reset controls for inspecting the simulation as it runs
- Particle path visualization via LineRenderer
- Free-fly camera for inspecting terrain detail up close

## The simulation

<div class="image-compare">
  <figure>
    <img src="/images/Terrain.PNG" alt="Generated terrain before erosion is applied">
    <figcaption>Pre-erosion terrain</figcaption>
  </figure>
  <figure>
    <img src="/images/Eroded.PNG" alt="The same terrain after the hydraulic erosion simulation has run">
    <figcaption>Post-erosion terrain</figcaption>
  </figure>
</div>

Each droplet is simulated as a point moving across the heightmap rather than a true physical particle, which keeps the simulation cheap enough to run thousands of iterations in real time. At each step, the droplet samples the height of the four surrounding grid points and bilinearly interpolates between them to get both its local height and the downhill gradient direction, since the droplet's position rarely lands exactly on a grid point.

<img src="/images/BiInterp.PNG" alt="Diagram of bilinear interpolation across a heightmap grid cell, showing how a droplet's height is weighted by distance to each corner">

Each corner of the cell is a known height sample; the droplet almost never lands exactly on one, so its height has to be estimated from the four around it. The closer a corner is, the more it pulls the droplet's interpolated height toward its own value, which is why the diagram weights each connecting line by how much that corner actually contributes rather than treating all four equally.

The droplet doesn't just follow that gradient directly, though, since pure gradient-following produces erosion paths that look jittery and unnatural. Instead, its direction each step is a blend of its previous direction and the new gradient direction, weighted by an inertia value — high inertia lets a droplet carry momentum through small dips and carve straighter, river-like channels, while low inertia lets it react more sharply to local terrain features.

As a droplet moves, it carries a sediment capacity that scales with the steepness of the slope it's on and its current speed. On steep ground it can carry more material, so it erodes the terrain it passes over, distributing that erosion across a small radius around its position rather than a single point so the result doesn't look like it's been hit with a single jagged pixel. As the droplet slows down, loses speed, or reaches flatter ground, its capacity drops below the sediment it's carrying, and it deposits the excess back onto the terrain instead. That erode-and-deposit cycle, repeated across thousands of droplets with randomized starting positions, is what produces the carved valleys and built-up deposits you can see forming over the course of the simulation.

## Particle path visualization

<img src="/images/Paths.PNG" alt="Visualized paths of particles as they erode">

Because the erosion itself happens silently across thousands of droplets per pass, it's easy for the underlying behavior to become a black box, so I added a path visualizer that traces individual droplets as they move using Unity's LineRenderer. Each traced path makes the gradient-following and inertia behavior visible directly, rather than just inferring it from the eroded terrain after the fact — it was genuinely useful for debugging the simulation while building it, since odd-looking erosion patterns are much easier to diagnose when you can watch the path that produced them rather than just the end result.

## Runtime controls

Tuning an erosion simulation by eye benefits a lot from being able to interrupt and inspect it, so I built that in from early on rather than treating generation as a one-shot operation:

- **Pause / Resume** – stops or restarts the simulation without losing its current state
- **Step** – advances the simulation by a single iteration, for inspecting how one droplet pass changes the terrain
- **Reset** – restores the terrain to its original, pre-eroded state so the same noise base can be re-eroded with different settings
- **Show Paths** – toggles the particle path visualizer on or off

Built in Unity, with the erosion and terrain shading implemented in HLSL/ShaderLab.