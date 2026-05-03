/**
 * config.js — Game configuration: tracks, modes, difficulty levels.
 * All data-driven settings live here for easy tuning and expansion.
 */
import * as THREE from 'three';

// ================================================================
//  TRACK LAYOUTS
// ================================================================

export const TRACKS = {
    greenfield: {
        name: 'Greenfield Circuit',
        description: 'Classic grassland track — great for beginners',
        skyColor:    0x87ceeb,
        fogColor:    0x87ceeb,
        fogNear:     180,
        fogFar:      400,
        groundColor: 0x2a5e1a,
        roadColor:   0x333338,
        outerBarrierColor: 0xdd3322,
        innerBarrierColor: 0xeeaa11,
        centerLineColor:   0xcccccc,
        treeColor:   0x1a7a2a,
        trunkColor:  0x5c3a1e,
        width:       10,
        ambientIntensity: 0.5,
        sunIntensity:     1.4,
        sunColor:    0xfff4e0,
        points: [
            new THREE.Vector3(-60, 0, -100),
            new THREE.Vector3(40,  0, -105),
            new THREE.Vector3(100, 0, -82),
            new THREE.Vector3(130, 0, -38),
            new THREE.Vector3(125, 0,  18),
            new THREE.Vector3(98,  0,  55),
            new THREE.Vector3(118, 0,  88),
            new THREE.Vector3(88,  0, 115),
            new THREE.Vector3(28,  0, 120),
            new THREE.Vector3(-42, 0, 108),
            new THREE.Vector3(-92, 0,  78),
            new THREE.Vector3(-122,0,  38),
            new THREE.Vector3(-128,0, -12),
            new THREE.Vector3(-108,0, -58),
            new THREE.Vector3(-88, 0, -82),
        ],
    },

    desert: {
        name: 'Desert Storm',
        description: 'Scorching desert speedway — wide and fast',
        skyColor:    0xe8c880,
        fogColor:    0xd4b06a,
        fogNear:     200,
        fogFar:      450,
        groundColor: 0xc8a960,
        roadColor:   0x55554a,
        outerBarrierColor: 0x884422,
        innerBarrierColor: 0xcc8844,
        centerLineColor:   0x998866,
        treeColor:   0x6b8c42,
        trunkColor:  0x8b7355,
        width:       12,
        ambientIntensity: 0.6,
        sunIntensity:     1.8,
        sunColor:    0xffe8b0,
        points: [
            new THREE.Vector3(-70,  0, -140),
            new THREE.Vector3(55,   0, -145),
            new THREE.Vector3(130,  0, -115),
            new THREE.Vector3(165,  0, -55),
            new THREE.Vector3(158,  0,  15),
            new THREE.Vector3(130,  0,  65),
            new THREE.Vector3(75,   0, 105),
            new THREE.Vector3(15,   0, 135),
            new THREE.Vector3(-55,  0, 145),
            new THREE.Vector3(-115, 0, 125),
            new THREE.Vector3(-155, 0,  70),
            new THREE.Vector3(-165, 0,  5),
            new THREE.Vector3(-145, 0, -55),
            new THREE.Vector3(-115, 0, -110),
        ],
    },

    neon: {
        name: 'Neon Speedway',
        description: 'Tight night circuit — technical and unforgiving',
        skyColor:    0x060612,
        fogColor:    0x060612,
        fogNear:     120,
        fogFar:      320,
        groundColor: 0x0c0c1e,
        roadColor:   0x1a1a2e,
        outerBarrierColor: 0xff00ff,
        innerBarrierColor: 0x00ffff,
        centerLineColor:   0x8844ff,
        treeColor:   0x222244,
        trunkColor:  0x18182e,
        width:       9,
        ambientIntensity: 0.25,
        sunIntensity:     0.3,
        sunColor:    0x8888ff,
        points: [
            new THREE.Vector3(-40,  0, -95),
            new THREE.Vector3(35,   0, -100),
            new THREE.Vector3(75,   0, -72),
            new THREE.Vector3(52,   0, -38),
            new THREE.Vector3(82,   0, -5),
            new THREE.Vector3(115,  0,  32),
            new THREE.Vector3(92,   0,  72),
            new THREE.Vector3(38,   0,  82),
            new THREE.Vector3(-12,  0,  58),
            new THREE.Vector3(-52,  0,  92),
            new THREE.Vector3(-95,  0,  68),
            new THREE.Vector3(-115, 0,  18),
            new THREE.Vector3(-82,  0, -32),
            new THREE.Vector3(-62,  0, -68),
        ],
    },
};

// ================================================================
//  GAME MODES
// ================================================================

export const MODES = {
    quickrace: {
        name: 'Quick Race',
        description: '3 laps — beat the AI!',
        laps: 3,
        hasAI: true,
    },
    timetrial: {
        name: 'Time Trial',
        description: 'Solo run — set the fastest time',
        laps: 3,
        hasAI: false,
    },
    endurance: {
        name: 'Endurance',
        description: '7 laps — stamina and consistency',
        laps: 7,
        hasAI: true,
    },
};

// ================================================================
//  DIFFICULTY LEVELS
// ================================================================

export const DIFFICULTIES = {
    easy: {
        name: 'Easy',
        description: 'Relaxed opponent — great for learning',
        aiMinSpeed: 28,
        aiMaxSpeed: 40,
        playerGrip: 0.95,
        playerDriftGrip: 0.88,
    },
    medium: {
        name: 'Medium',
        description: 'Balanced challenge',
        aiMinSpeed: 36,
        aiMaxSpeed: 55,
        playerGrip: 0.92,
        playerDriftGrip: 0.82,
    },
    hard: {
        name: 'Hard',
        description: 'Aggressive AI — slippery handling',
        aiMinSpeed: 48,
        aiMaxSpeed: 68,
        playerGrip: 0.87,
        playerDriftGrip: 0.76,
    },
};

/** Default selections */
export const DEFAULTS = {
    track:      'greenfield',
    mode:       'quickrace',
    difficulty: 'medium',
};
