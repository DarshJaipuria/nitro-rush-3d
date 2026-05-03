/**
 * CheckpointSystem — Tracks car progress through checkpoints for lap counting.
 * Checkpoints are invisible gates placed evenly around the track curve.
 */
import * as THREE from 'three';

export class CheckpointSystem {
    /**
     * @param {import('./track.js').Track} track
     * @param {number} numCheckpoints
     * @param {number} totalLaps
     */
    constructor(track, numCheckpoints = 8, totalLaps = 3) {
        this.track         = track;
        this.totalLaps     = totalLaps;
        this.triggerRadius = 14;       // how close car must be to trigger

        // Generate checkpoint positions evenly along the curve
        this.checkpoints = [];
        for (let i = 0; i < numCheckpoints; i++) {
            const t  = i / numCheckpoints;
            const pt = track.curve.getPoint(t);
            this.checkpoints.push({
                position: new THREE.Vector3(pt.x, 0, pt.z),
                t
            });
        }

        // Per-racer state: { nextCP, lap, finished }
        this.racers = new Map();
    }

    /** Register a racer (player or AI) */
    registerRacer(id) {
        this.racers.set(id, { nextCP: 0, lap: 0, finished: false });
    }

    /** Reset all racers to starting state */
    resetAll() {
        for (const [id] of this.racers) {
            this.racers.set(id, { nextCP: 0, lap: 0, finished: false });
        }
    }

    /**
     * Check and update progress for a racer.
     * @param {string} id          racer identifier
     * @param {THREE.Vector3} pos  current world position
     * @returns {{ crossed: boolean, newLap: boolean, finished: boolean }}
     */
    update(id, pos) {
        const state = this.racers.get(id);
        if (!state || state.finished) return { crossed: false, newLap: false, finished: true };

        const cp   = this.checkpoints[state.nextCP];
        const dx   = pos.x - cp.position.x;
        const dz   = pos.z - cp.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist < this.triggerRadius) {
            state.nextCP++;
            let newLap  = false;
            let finished = false;

            if (state.nextCP >= this.checkpoints.length) {
                state.nextCP = 0;
                state.lap++;
                newLap = true;

                if (state.lap >= this.totalLaps) {
                    state.finished = true;
                    finished = true;
                }
            }
            return { crossed: true, newLap, finished };
        }
        return { crossed: false, newLap: false, finished: false };
    }

    /** Get a racer's current lap (1-indexed for display) */
    getLap(id) {
        const s = this.racers.get(id);
        return s ? Math.min(s.lap + 1, this.totalLaps) : 1;
    }

    /**
     * Compare two racers and return who is ahead.
     * Returns a progress number (higher = further ahead).
     */
    getProgress(id) {
        const s = this.racers.get(id);
        if (!s) return 0;
        return s.lap * this.checkpoints.length + s.nextCP;
    }

    /** Calculate position label ("1st" or "2nd") comparing two racers */
    getPositionLabel(playerId, aiId) {
        const pProg = this.getProgress(playerId);
        const aProg = this.getProgress(aiId);
        return pProg >= aProg ? '1st' : '2nd';
    }
}
