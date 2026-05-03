/**
 * main.js — Standalone entry point for Nitro Rush demo.
 * Adds: 60-second demo limit, controls overlay, ESC reload.
 */
import * as THREE from 'three';
import { InputManager }     from './js/input.js';
import { Car }              from './js/car.js';
import { ChaseCamera }      from './js/camera.js';
import { Track }            from './js/track.js';
import { CheckpointSystem } from './js/checkpoint.js';
import { AICar }            from './js/ai-car.js';
import { RaceManager }      from './js/race-manager.js';
import { HUD }              from './js/hud.js';
import { MenuManager }      from './js/menu.js';
import { BoostPad }         from './js/boost-pad.js';
import { ParticleSystem }   from './js/particles.js';
import { AudioManager }     from './js/audio.js';
import { TRACKS, MODES, DIFFICULTIES, DEFAULTS } from './js/config.js';

// ================================================================
//  Demo Limit (60 seconds) — iframe-safe, no alert/redirect
// ================================================================

let demoOver = false;

function showDemoEndOverlay() {
    demoOver = true;

    // Freeze all keyboard input
    input.freeze();

    // Freeze cars & audio
    if (playerCar) { playerCar.enabled = false; playerCar.speed = 0; }
    if (aiCar)     { aiCar.enabled     = false; aiCar.speed     = 0; }
    audio.muteEngine();

    // Block all pointer events on page; overlay re-enables its own below
    const root = document.body;
    root.style.pointerEvents = 'none';

    const overlay = document.createElement("div");
    overlay.id = "demo-end-overlay";
    overlay.style.cssText = [
        "position:fixed;inset:0;z-index:9999",
        "display:flex;flex-direction:column;align-items:center;justify-content:center",
        "background:rgba(0,0,0,0.92)",
        "font-family:sans-serif;color:#fff;text-align:center;gap:16px",
        "pointer-events:auto",
    ].join(";");
    overlay.innerHTML = `
        <div style="font-size:28px;font-weight:700;letter-spacing:4px;color:#00ffcc">DEMO OVER</div>
        <div style="font-size:14px;color:#aaa;max-width:300px;line-height:1.6">
            Thanks for playing Nitro Rush!<br>View the full project on GitHub.
        </div>
        <a href="https://github.com/DarshJaipuria/nitro-rush-3d"
           target="_blank" rel="noopener"
           style="margin-top:8px;padding:12px 28px;border:2px solid #00ffcc;color:#00ffcc;
                  text-decoration:none;letter-spacing:2px;font-size:13px;border-radius:4px;
                  transition:background 0.2s"
           onmouseover="this.style.background='rgba(0,255,204,0.15)'"
           onmouseout="this.style.background='transparent'">
            VIEW ON GITHUB
        </a>
        <button onclick="window.location.reload()"
                style="margin-top:4px;padding:10px 24px;background:transparent;border:1px solid #555;
                       color:#888;letter-spacing:2px;font-size:12px;cursor:pointer;border-radius:4px">
            PLAY AGAIN
        </button>
    `;
    document.body.appendChild(overlay);
}

setTimeout(showDemoEndOverlay, 60000);

// Block mouse clicks globally after demo ends (capture phase = before any button listener)
window.addEventListener("mousedown", (e) => {
    if (demoOver) e.stopImmediatePropagation();
}, true);

// ================================================================
//  Controls Overlay
// ================================================================

const controlsDiv = document.createElement("div");
controlsDiv.innerText = "W / Arrow Keys = Drive | Shift = Nitro | Space = Brake | Esc = Reload";
controlsDiv.style.cssText = "position:absolute;top:10px;left:50%;transform:translateX(-50%);color:white;font-size:14px;font-family:sans-serif;text-shadow:0 1px 3px #000;pointer-events:none;z-index:999;white-space:nowrap;";
document.body.appendChild(controlsDiv);
setTimeout(() => controlsDiv.remove(), 5000);

// ================================================================
//  ESC = Reload (works inside iframe too)
// ================================================================

window.addEventListener("keydown", (e) => {
    if (demoOver) return;
    if (e.key === "Escape") {
        window.location.reload();
    }
});

// ================================================================
//  Renderer Setup (persistent — never rebuilt)
// ================================================================

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
renderer.toneMapping       = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
document.body.prepend(renderer.domElement);

const scene  = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.5, 600);

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// ================================================================
//  Persistent Systems
// ================================================================

const input       = new InputManager();
const chaseCamera = new ChaseCamera(camera);
const raceMgr     = new RaceManager();
const hud         = new HUD();
const audio       = new AudioManager();

// ================================================================
//  Dynamic Game State
// ================================================================

let track       = null;
let playerCar   = null;
let aiCar       = null;
let checkpoints = null;
let particles   = null;
let boostPads   = [];

let currentTrackKey = DEFAULTS.track;
let currentModeKey  = DEFAULTS.mode;
let currentDiffKey  = DEFAULTS.difficulty;

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
const sunLight = new THREE.DirectionalLight(0xfff4e0, 1.4);
sunLight.position.set(80, 100, 60);
sunLight.castShadow           = true;
sunLight.shadow.mapSize.width  = 2048;
sunLight.shadow.mapSize.height = 2048;
sunLight.shadow.camera.near   = 0.5;
sunLight.shadow.camera.far    = 350;
sunLight.shadow.camera.left   = -160;
sunLight.shadow.camera.right  = 160;
sunLight.shadow.camera.top    = 160;
sunLight.shadow.camera.bottom = -160;

const fillLight = new THREE.DirectionalLight(0x8ec8f0, 0.4);
fillLight.position.set(-40, 30, -50);

const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x3a6e1e, 0.35);

scene.add(ambientLight, sunLight, fillLight, hemiLight);

// ================================================================
//  Scene Rebuild
// ================================================================

function buildScene(trackKey, modeKey, diffKey) {
    if (track)     track.dispose();
    if (playerCar) scene.remove(playerCar.mesh);
    if (aiCar)     scene.remove(aiCar.mesh);
    if (particles) {
        for (const p of particles.pool) scene.remove(p.mesh);
    }
    for (const bp of boostPads) scene.remove(bp.mesh);
    boostPads = [];

    const trackCfg = TRACKS[trackKey];
    const modeCfg  = MODES[modeKey];
    const diffCfg  = DIFFICULTIES[diffKey];

    ambientLight.intensity = trackCfg.ambientIntensity;
    sunLight.intensity     = trackCfg.sunIntensity;
    sunLight.color.setHex(trackCfg.sunColor);
    hemiLight.color.setHex(trackCfg.skyColor);

    track      = new Track(scene, trackCfg);
    playerCar  = new Car(scene, 0xe83030);
    playerCar.applyDifficulty(diffCfg);
    aiCar      = new AICar(scene, track, 0x2266ff);
    aiCar.applyDifficulty(diffCfg);
    checkpoints = new CheckpointSystem(track, 8, modeCfg.laps);
    checkpoints.registerRacer('player');
    if (modeCfg.hasAI) checkpoints.registerRacer('ai');
    particles  = new ParticleSystem(scene, 80);

    for (const bp of track.getBoostPadPositions()) {
        boostPads.push(new BoostPad(scene, bp.position, bp.rotation));
    }

    currentTrackKey = trackKey;
    currentModeKey  = modeKey;
    currentDiffKey  = diffKey;

    if (!modeCfg.hasAI) aiCar.mesh.visible = false;
}

// ================================================================
//  Menu Callbacks
// ================================================================

const menus = new MenuManager({
    onStartRace(trackKey, modeKey, diffKey) {
        if (demoOver) return;
        audio.init();
        buildScene(trackKey, modeKey, diffKey);
        startRace();
    },
    onResume() {
        if (demoOver) return;
        raceMgr.togglePause();
        menus.hidePause();
        audio.unmuteEngine();
    },
    onRestart() {
        if (demoOver) return;
        menus.hideAll();
        buildScene(currentTrackKey, currentModeKey, currentDiffKey);
        startRace();
    },
    onQuitToMenu() {
        if (demoOver) return;
        menus.hideAll();
        raceMgr.toMenu();
        hud.hide();
        if (playerCar) playerCar.enabled = false;
        if (aiCar)     aiCar.enabled     = false;
        audio.muteEngine();
        if (!track) buildScene(DEFAULTS.track, DEFAULTS.mode, DEFAULTS.difficulty);
        menus.showMainMenu();
    },
    onQuit() {
        if (demoOver) return;
        document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#000;color:#00ff88;font-size:36px;font-family:sans-serif;letter-spacing:6px;">THANKS FOR PLAYING!</div>';
    }
});

// ================================================================
//  Race Start
// ================================================================

function startRace() {
    const modeCfg = MODES[currentModeKey];
    const startHeading = track.getStartHeading();
    playerCar.resetTo(track.getStartPosition(0), startHeading);
    playerCar.enabled   = false;
    playerCar.boostFuel = 1;
    if (modeCfg.hasAI) {
        aiCar.resetToStart(track.getStartPosition(1), startHeading);
        aiCar.enabled = false;
    }
    checkpoints.resetAll();
    menus.hideAll();
    hud.show();
    chaseCamera.snapTo(playerCar.position, playerCar.heading);
    raceMgr.startRace();
    menus.showCountdown(3);
}

// ================================================================
//  Race Manager Callbacks
// ================================================================

raceMgr.onCountdownTick = (num) => {
    menus.showCountdown(num);
    audio.playCountdownBeep(false);
};

raceMgr.onCountdownGo = () => {
    menus.showCountdown(0);
    audio.playCountdownBeep(true);
    setTimeout(() => menus.hideCountdown(), 800);
    playerCar.enabled = true;
    const modeCfg = MODES[currentModeKey];
    if (modeCfg.hasAI) aiCar.enabled = true;
};

raceMgr.onRaceFinish = (time, position) => {
    playerCar.enabled = false;
    if (aiCar) aiCar.enabled = false;
    audio.muteEngine();
    const modeCfg = MODES[currentModeKey];
    menus.showFinish(raceMgr.formattedTime, position, modeCfg.name);
};

// ================================================================
//  Main Game Loop
// ================================================================

let prevTime = performance.now();

function gameLoop(now) {
    requestAnimationFrame(gameLoop);  // always keep loop alive for rendering

    const dt = Math.min((now - prevTime) / 1000, 0.05);
    prevTime = now;

    if (!demoOver) {
        raceMgr.update(dt);
    }

    if (raceMgr.state === 'MENU') {
        const t = now * 0.00005;
        const orbitR = track ? 140 : 120;
        camera.position.set(Math.sin(t) * orbitR, 55, Math.cos(t) * orbitR);
        camera.lookAt(0, 0, 0);
        renderer.render(scene, camera);
        return;
    }

    if (!demoOver) {
        if (input.pauseJustPressed) {
            if (raceMgr.state === 'RACING') {
                raceMgr.togglePause();
                menus.showPause();
                audio.muteEngine();
            } else if (raceMgr.state === 'PAUSED') {
                raceMgr.togglePause();
                menus.hidePause();
                audio.unmuteEngine();
            }
        }
    }

    if (raceMgr.state === 'PAUSED') {
        renderer.render(scene, camera);
        return;
    }

    if (!demoOver && raceMgr.state === 'RACING' && playerCar && track) {
        const modeCfg = MODES[currentModeKey];

        playerCar.update(dt, input, track);
        if (modeCfg.hasAI) aiCar.update(dt);

        const playerResult = checkpoints.update('player', playerCar.position);
        if (modeCfg.hasAI) checkpoints.update('ai', aiCar.position);

        if (playerResult.finished) {
            const pos = modeCfg.hasAI ? checkpoints.getPositionLabel('player', 'ai') : '--';
            raceMgr.finishRace(pos);
        }
        if (modeCfg.hasAI) {
            const aiState = checkpoints.racers.get('ai');
            if (aiState && aiState.finished && raceMgr.state === 'RACING') {
                const pos = checkpoints.getPositionLabel('player', 'ai');
                raceMgr.finishRace(pos);
            }
        }

        for (const bp of boostPads) {
            bp.check(playerCar, dt);
            bp.update(now / 1000);
        }

        const isDrifting = input.brake && Math.abs(playerCar.speed) > 15;
        particles.emit(playerCar.position, playerCar.heading, playerCar.speed, isDrifting);
        particles.update(dt);

        audio.updateEngine(playerCar.speed, playerCar.maxSpeed, playerCar.isBoosting);

        const posLabel = modeCfg.hasAI ? checkpoints.getPositionLabel('player', 'ai') : '--';
        hud.update(
            playerCar.displaySpeed,
            checkpoints.getLap('player'),
            checkpoints.totalLaps,
            raceMgr.formattedTime,
            posLabel,
            playerCar.boostFuel / playerCar.maxBoostFuel
        );
    }

    if (playerCar && (raceMgr.state === 'RACING' || raceMgr.state === 'COUNTDOWN' || raceMgr.state === 'FINISHED')) {
        chaseCamera.update(dt, playerCar.position, playerCar.heading, playerCar.speed);
    }

    renderer.render(scene, camera);
}

// ================================================================
//  Bootstrap
// ================================================================

buildScene(DEFAULTS.track, DEFAULTS.mode, DEFAULTS.difficulty);
menus.showMainMenu();
requestAnimationFrame(gameLoop);
