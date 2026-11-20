# GKE warehouse model

Edit the named objects, dimensions, positions and material colors in `build_warehouse.py`. Run `python3 models/build_warehouse.py` from the project directory to regenerate `public/warehouse/warehouse.glb` and `public/warehouse/overview.png`. The generator uses the Python standard library.

To edit the geometry in Blender, import `public/warehouse/warehouse.glb` using **File → Import → glTF 2.0**, then save the scene as a Blender file. Export to the same GLB path after editing. Keep coordinates in meters, with Y up in the exported glTF, and keep these object names:

- `tracked_parcel`, `forklift`, `receiving_truck`, `outbound_truck`
- `hotspot_receiving`, `hotspot_sorting`, `hotspot_staging`, `hotspot_outbound`

The simulation moves trucks and the forklift along their local positive X axis. Adjust the route positions and camera presets in `src/warehouse.ts` if loading bays, sorting stations or lanes move. The static overview should show the same sites and the four positions in `stillHotspots` should match the overview. The file ships with no external textures or decoders.
