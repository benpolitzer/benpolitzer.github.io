---
title: "Procedural Terrain Generation"
date: 2026-02-09
weight: 10
cover: "terraingen.png"
---
This project explores how procedural terrain generation can support game development by turning adjustable heightmap data into playable landscapes. 
The generator creates island-like terrain using controllable falloff and complexity values, making it useful for rapid level blockout, open-world prototyping, or replayable terrain generation. 
To make the system easier to tune, I built a PNG-style heightmap visualizer that shows the generated elevation data in 2D before it becomes a 3D landscape. 
This helped connect the underlying data to the final terrain result and made debugging the generation process much more intuitive.
![Outline](/gifs/texturevis.gif)