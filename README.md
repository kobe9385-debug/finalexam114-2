# LOGOS p5.js Prototype v0.8 Camera Integrated

## Main Fix

v0.7 accidentally removed camera input. This version merges camera input back into the battle version.

## Features

- v0.7 counter grammar retained
- MediaPipe Hand Landmarker restored
- 21-point hand skeleton display
- Camera debug panel
- READY / CAST zone input
- Keyboard fallback retained
- Press C during battle to toggle camera input

## Camera Gesture Mapping

- Thumb + index = Ignis / FIRE
- Thumb + middle = Aqua / WATER
- Thumb + ring = Ventus / WIND
- Thumb + pinky = Terra / EARTH
- Open palm = Lux / LIGHT
- Index point = Shot
- Two fingers together = Beam
- Wall currently still best tested by keyboard key 8

## Camera Input Rhythm

1. Put hand lower in frame = READY
2. Move hand to middle of frame = CAST
3. Stable gesture is inserted into sentence
4. Return to READY before the next word

## Keyboard Controls

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
- SPACE = Start / Continue
- R = Retry

## Note

Camera requires HTTPS or localhost. GitHub Pages works because it uses HTTPS.
