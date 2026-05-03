/**
 * HUD — Updates DOM elements that display speed, lap, timer, position, boost.
 */
export class HUD {
    constructor() {
        this.speedEl    = document.getElementById('speed-value');
        this.lapCurEl   = document.getElementById('lap-current');
        this.lapTotEl   = document.getElementById('lap-total');
        this.timerEl    = document.getElementById('timer-display');
        this.positionEl = document.getElementById('position-value');
        this.boostBar   = document.getElementById('boost-bar');
        this.hudRoot    = document.getElementById('hud');
    }

    show() { this.hudRoot.classList.remove('hidden'); }
    hide() { this.hudRoot.classList.add('hidden'); }

    /**
     * @param {number} speed     display speed in km/h
     * @param {number} lap       current lap (1-indexed)
     * @param {number} totalLaps
     * @param {string} time      formatted time string
     * @param {string} position  "1st" or "2nd"
     * @param {number} boostPct  0–1
     */
    update(speed, lap, totalLaps, time, position, boostPct) {
        this.speedEl.textContent    = speed;
        this.lapCurEl.textContent   = lap;
        this.lapTotEl.textContent   = totalLaps;
        this.timerEl.textContent    = time;
        this.positionEl.textContent = position;
        this.boostBar.style.width   = `${Math.round(boostPct * 100)}%`;
    }
}
