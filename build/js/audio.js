/**
 * AudioManager — Web Audio API hooks for engine sound, effects, and music.
 * Uses procedurally generated tones so it works without external audio files.
 */
export class AudioManager {
    constructor() {
        this.ctx       = null;   // AudioContext, created on first user interaction
        this.engineOsc = null;
        this.engineGain = null;
        this.masterGain = null;
        this.initialized = false;
    }

    /** Must be called from a user gesture (click/keypress) */
    init() {
        if (this.initialized) return;

        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = 0.3;
            this.masterGain.connect(this.ctx.destination);

            // Engine drone — low-frequency oscillator
            this.engineOsc = this.ctx.createOscillator();
            this.engineOsc.type = 'sawtooth';
            this.engineOsc.frequency.value = 80;

            this.engineGain = this.ctx.createGain();
            this.engineGain.gain.value = 0;

            // Low-pass filter for engine sound
            this.engineFilter = this.ctx.createBiquadFilter();
            this.engineFilter.type = 'lowpass';
            this.engineFilter.frequency.value = 400;
            this.engineFilter.Q.value = 2;

            this.engineOsc.connect(this.engineFilter);
            this.engineFilter.connect(this.engineGain);
            this.engineGain.connect(this.masterGain);
            this.engineOsc.start();

            this.initialized = true;
        } catch (e) {
            console.warn('AudioManager: Web Audio not available', e);
        }
    }

    /**
     * Update engine sound based on car speed.
     * @param {number} speed  0–maxSpeed
     * @param {number} maxSpeed
     * @param {boolean} boosting
     */
    updateEngine(speed, maxSpeed, boosting) {
        if (!this.initialized) return;

        const ratio = Math.abs(speed) / maxSpeed;
        // Frequency ramps from 60 Hz (idle) to 250 Hz (max RPM)
        const freq = 60 + ratio * 190 + (boosting ? 40 : 0);
        this.engineOsc.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.1);
        this.engineFilter.frequency.setTargetAtTime(300 + ratio * 600, this.ctx.currentTime, 0.1);

        // Volume ramps up slightly with speed
        const vol = 0.08 + ratio * 0.18;
        this.engineGain.gain.setTargetAtTime(vol, this.ctx.currentTime, 0.1);
    }

    /** Play a short beep for countdown ticks */
    playCountdownBeep(isGo = false) {
        if (!this.initialized) return;
        const osc  = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type      = 'sine';
        osc.frequency.value = isGo ? 880 : 440;
        gain.gain.value     = 0.25;
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + (isGo ? 0.5 : 0.25));
        osc.stop(this.ctx.currentTime + (isGo ? 0.5 : 0.25));
    }

    /** Play collision bump sound */
    playCollision() {
        if (!this.initialized) return;
        const osc  = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.value = 80;
        gain.gain.value = 0.15;
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);
        osc.stop(this.ctx.currentTime + 0.15);
    }

    /** Play boost activation whoosh */
    playBoost() {
        if (!this.initialized) return;
        const osc  = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 200;
        osc.frequency.exponentialRampToValueAtTime(600, this.ctx.currentTime + 0.3);
        gain.gain.value = 0.12;
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.4);
        osc.stop(this.ctx.currentTime + 0.4);
    }

    /** Mute engine when paused */
    muteEngine()   { if (this.engineGain) this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05); }
    unmuteEngine() { /* will restore on next updateEngine call */ }

    /** Fully stop audio */
    stop() {
        if (this.engineOsc)  this.engineOsc.stop();
        if (this.ctx)        this.ctx.close();
        this.initialized = false;
    }
}
