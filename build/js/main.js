/**
 * main.js — Game entry point and main loop.
 * Creates the Three.js scene, wires all systems, supports config-driven
 * track/mode/difficulty selection with full scene rebuild.
 */
import * as THREE from 'three';
import { InputManager }     from './input.js';
import { Car }              from './car.js';
import { ChaseCamera }      from './camera.js';
import { Track }            from './track.js';
import { CheckpointSystem } from './checkpoint.js';
import { AICar }            from './ai-car.js';
import { RaceManager }      from './race-manager.js';
import { HUD }              from './hud.js';
import { MenuManager }      from './menu.js';
import { BoostPad }         from './boost-pad.js';
import { ParticleSystem }   from './particles.js';
import { AudioManager }     from './audio.js';
import { TRACKS, MODES, DIFFICULTIES, DEFAULTS } from './config.js';

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
//  Persistent Systems (survive track switches)
// ================================================================

const input       = new InputManager();
const chaseCamera = new ChaseCamera(camera);
const raceMgr     = new RaceManager();
const hud         = new HUD();
const audio       = new AudioManager();

// ================================================================
//  Dynamic Game State (rebuilt each race)
// ================================================================

let track       = null;
let playerCar   = null;
let aiCar       = null;
let checkpoints = null;
let particles   = null;
let boostPads   = [];

// Current settings
let currentTrackKey = DEFAULTS.track;
let currentModeKey  = DEFAULTS.mode;
let currentDiffKey  = DEFAULTS.difficulty;

// Lights (persistent, but intensity adjusted per track)
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
//  Scene Rebuild — creates all game objects for a race
// ================================================================

function buildScene(trackKey, modeKey, diffKey) {
    // ---- Clean up previous ----
    if (track)     track.dispose();
    if (playerCar) scene.remove(playerCar.mesh);
    if (aiCar)     scene.remove(aiCar.mesh);
    if (particles) {
        for (const p of particles.pool) scene.remove(p.mesh);
    }
    for (const bp of boostPads) {
        // Remove boost pad meshes
        scene.remove(bp.mesh);
    }
    boostPads = [];

    // ---- Configs ----
    const trackCfg = TRACKS[trackKey];
    const modeCfg  = MODES[modeKey];
    const diffCfg  = DIFFICULTIES[diffKey];

    // ---- Adjust lighting for this track ----
    ambientLight.intensity = trackCfg.ambientIntensity;
    sunLight.intensity     = trackCfg.sunIntensity;
    sunLight.color.setHex(trackCfg.sunColor);
    hemiLight.color.setHex(trackCfg.skyColor);

    // ---- Build track ----
    track = new Track(scene, trackCfg);

    // ---- Player car ----
    playerCar = new Car(scene, 0xe83030);
    playerCar.applyDifficulty(diffCfg);

    // ---- AI car ----
    aiCar = new AICar(scene, track, 0x2266ff);
    aiCar.applyDifficulty(diffCfg);

    // ---- Checkpoints ----
    checkpoints = new CheckpointSystem(track, 8, modeCfg.laps);
    checkpoints.registerRacer('player');
    if (modeCfg.hasAI) checkpoints.registerRacer('ai');

    // ---- Particles ----
    particles = new ParticleSystem(scene, 80);

    // ---- Boost pads ----
    for (const bp of track.getBoostPadPositions()) {
        boostPads.push(new BoostPad(scene, bp.position, bp.rotation));
    }

    // Store current settings
    currentTrackKey = trackKey;
    currentModeKey  = modeKey;
    currentDiffKey  = diffKey;

    // Hide AI car in Time Trial mode
    if (!modeCfg.hasAI) {
        aiCar.mesh.visible = false;
    }
}

// ================================================================
//  Menu Callbacks
// ================================================================

const menus = new MenuManager({
    onStartRace(trackKey, modeKey, diffKey) {
        audio.init();
        buildScene(trackKey, modeKey, diffKey);
        startRace();
    },
    onResume() {
        raceMgr.togglePause();
        menus.hidePause();
        audio.unmuteEngine();
    },
    onRestart() {
        menus.hideAll();
        // Rebuild with same settings
        buildScene(currentTrackKey, currentModeKey, currentDiffKey);
        startRace();
    },
    onQuitToMenu() {
        menus.hideAll();
        raceMgr.toMenu();
        hud.hide();
        if (playerCar) playerCar.enabled = false;
        if (aiCar) aiCar.enabled = false;
        audio.muteEngine();

        // Build a default track for menu backdrop if none
        if (!track) {
            buildScene(DEFAULTS.track, DEFAULTS.mode, DEFAULTS.difficulty);
        }
        menus.showMainMenu();
    },
    onQuit() {
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
    requestAnimationFrame(gameLoop);

    const dt = Math.min((now - prevTime) / 1000, 0.05);
    prevTime = now;

    raceMgr.update(dt);

    // ---- Menu state: orbit camera ----
    if (raceMgr.state === 'MENU') {
        const t = now * 0.00005;
        const orbitR = track ? 140 : 120;
        camera.position.set(Math.sin(t) * orbitR, 55, Math.cos(t) * orbitR);
        camera.lookAt(0, 0, 0);
        renderer.render(scene, camera);
        return;
    }

    // ---- Pause toggle ----
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

    if (raceMgr.state === 'PAUSED') {
        renderer.render(scene, camera);
        return;
    }

    // ---- Racing ----
    if (raceMgr.state === 'RACING' && playerCar && track) {
        const modeCfg = MODES[currentModeKey];

        playerCar.update(dt, input, track);

        if (modeCfg.hasAI) aiCar.update(dt);

        // Checkpoints
        const playerResult = checkpoints.update('player', playerCar.position);
        if (modeCfg.hasAI) checkpoints.update('ai', aiCar.position);

        // Finish condition
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

        // Boost pads
        for (const bp of boostPads) {
            bp.check(playerCar, dt);
            bp.update(now / 1000);
        }

        // Particles
        const isDrifting = input.brake && Math.abs(playerCar.speed) > 15;
        particles.emit(playerCar.position, playerCar.heading, playerCar.speed, isDrifting);
        particles.update(dt);

        // Audio
        audio.updateEngine(playerCar.speed, playerCar.maxSpeed, playerCar.isBoosting);

        // HUD
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

    // ---- Camera follows player ----
    if (playerCar && (raceMgr.state === 'RACING' || raceMgr.state === 'COUNTDOWN' || raceMgr.state === 'FINISHED')) {
        chaseCamera.update(dt, playerCar.position, playerCar.heading, playerCar.speed);
    }

    renderer.render(scene, camera);
}

// ================================================================
//  Bootstrap
// ================================================================

// Build default track for the menu backdrop
buildScene(DEFAULTS.track, DEFAULTS.mode, DEFAULTS.difficulty);
menus.showMainMenu();
requestAnimationFrame(gameLoop);
