# LOGOS p5.js Prototype v0.8.1 Black Screen Fix

## Fix

v0.8 could open to a black screen because `sketch.js` was loaded as an ES module, but p5.js global-mode lifecycle functions were not attached to `window`.

This version fixes:

- `window.setup`
- `window.draw`
- `window.keyPressed`
- Dynamic MediaPipe import inside `initCamera`
- Game can render even if MediaPipe fails or camera permission is blocked

## Controls

- SPACE = Start / Continue
- Arrow Keys = Move
- C = Toggle Camera Input
- 1 = Ignis / FIRE
- 2 = Aqua / WATER
- 3 = Ventus / WIND
- 4 = Terra / EARTH
- 5 = Lux / LIGHT
- 6 = Shot
- 7 = Beam
- 8 = Wall
- 9 = Seek
- R = Retry

## Camera

Camera requires HTTPS or localhost.
