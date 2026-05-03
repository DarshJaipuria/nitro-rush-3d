# 🏎️ Nitro Rush — 3D Racing Game

"A complete browser-based 3D arcade racing game built with Three.js. Requires a local server to run — setup takes under 2 minutes!"

## 🎮 How to Play

### Option 1 — VS Code Live Server (Easiest, no install needed)
1. Install [VS Code](https://code.visualstudio.com/)
2. Install the **Live Server** extension by Ritwick Dey
3. Open the `Car 3D` folder in VS Code
4. Right-click `index.html` → **"Open with Live Server"**
5. Game launches at `http://127.0.0.1:5500` ✅

### Option 2 — Node.js (via Terminal)
1. Install [Node.js](https://nodejs.org/) (LTS version, Windows Installer)
2. Open terminal/PowerShell in the `Car 3D` folder
3. Run: npx serve .
4. Open `http://localhost:3000` in your browser ✅

> ⚠️ Do NOT open `index.html` by double-clicking — it won't work due to ES module imports.
> Always use one of the methods above.

### Controls
| Key | Action |
|-----|--------|
| W / ↑ | Accelerate |
| S / ↓ | Reverse |
| A / ← | Steer Left |
| D / → | Steer Right |
| Space | Brake (hold while turning for drift!) |
| Shift | Nitro Boost |
| Escape | Pause |

### Objective
- Complete **3 laps** around the circuit
- Beat the AI opponent (blue car)
- Hit the green **boost pads** for extra speed
- Use **Shift** for nitro (regenerates over time)

## 🏗️ Project Structure
```
├── index.html          # Entry point
├── css/style.css       # UI styling (dark racing theme)
├── js/
│   ├── main.js         # Game loop & scene setup
│   ├── car.js          # Player car (arcade physics + drift)
│   ├── camera.js       # Third-person chase camera
│   ├── track.js        # Procedural race circuit
│   ├── checkpoint.js   # Lap/checkpoint tracking
│   ├── race-manager.js # Race state machine
│   ├── ai-car.js       # AI opponent (spline following)
│   ├── hud.js          # Speed/lap/timer display
│   ├── menu.js         # Menu screens
│   ├── boost-pad.js    # Speed boost zones
│   ├── particles.js    # Tire smoke effects
│   ├── audio.js        # Procedural engine audio
│   └── input.js        # Keyboard handler
```

## ✨ Features
- 🏁 Full race loop: Menu → Countdown → Race → Finish
- 🚗 Arcade car physics with drift-lite feel
- 🤖 AI opponent with curvature-based speed
- 📊 HUD: speed, lap counter, timer, position, nitro bar
- ⏸️ Pause/resume/restart support
- 💨 Tire smoke particles
- 🔊 Procedural engine audio (pitch scales with speed)
- 🟢 Boost pads on the track
- 🌳 Procedural scenery (trees, barriers, checker start line)

## 🔧 Requirements
- Any modern browser (Chrome 89+, Firefox 89+, Edge 89+)
- Internet connection (Three.js loads from CDN)
- A local HTTP server to serve the files
