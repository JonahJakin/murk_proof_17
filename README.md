# MURK

A first-person underwater survival horror game built with Three.js. One diver enters a drowned freshwater landscape to recover evidence of something far too large for the lake. Demo V17 cleans the map and HUD, strengthens the optional found-footage treatment, and turns the handheld camera into a markedly tighter visor-free view with a brief black raise transition. The title score begins at its first major swell, photographs use the supplied mechanical shutter recording, and the workboat now has a sealed hard-chine bow instead of an open front seam. Sonar retains its exact player-relative bearing and visible 30-second recharge, and all existing predator, lighting, evidence, breathing, and exploration systems remain intact.

The world, creature, effects, and map illustrations are generated in code. The app icon is the supplied true-grid pixel artwork. Creature calls, title music, and floodlight operation use the supplied WAV recordings; suit, water, breath, and remaining interaction sounds remain procedural.

## Controls

- `WASD` swim; mouse or arrow keys look
- `Space` dive while standing at an edge of the boat and looking out, then rise underwater
- `Shift` descend
- `F` raise or stow the carried floodlight; it runs for 20 seconds and must fully cool after overheating
- `L` main lamp
- `Q` raise or stow the camera, including while aboard the boat
- `E` camera shutter (while the camera is raised)
- `M` raise or fold the map
- `C` hold breath
- `G` raise and ping the directional sonar; its latest contact remains on the map
- `X` take evidence
- `R` deploy a sinking decoy light
- `B` emergency air boost
- `Esc` pause the game and all audio; use Continue to resume

The pause menu also toggles the optional **Found Footage** visual mode.

Breaking the surface gradually refills the tank. Dense Curtain weed can conceal the diver even with the helmet lamp lit; the similar-looking Sparse weed cannot.

Restart resets the dive in place and returns the player to the boat without leaving the pause menu active.

## Run locally

```bash
pnpm install
pnpm dev
```

Build the hosted version with `pnpm build`.

## Installable PWA

MURK includes a web app manifest, maskable and Apple app icons, and an offline service worker. Build the standalone static PWA with:

```bash
pnpm build:pwa
```

The deployable static files are written to `pwa-dist/`.

## Publish with GitHub Pages

The repository includes `.github/workflows/deploy-pwa.yml`. Push the project to a GitHub repository, then choose **GitHub Actions** as the Pages source in the repository settings. Pushes to `main` build and publish the standalone PWA automatically.

The Sites build and GitHub Pages PWA share the same game source, controls, procedural visuals, and spatialized audio library.
