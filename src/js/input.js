/**
 * InputManager — Keyboard input handler for the racing game.
 * Tracks pressed keys and exposes clean boolean accessors for game controls.
 */
export class InputManager {
    constructor() {
        /** @type {Object<string, boolean>} raw key states */
        this.keys = {};
        this._prevEscape = false;

        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            // Prevent browser defaults for game keys
            if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
                e.preventDefault();
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
    }

    /* ---- Driving ---- */
    get forward()  { return !!(this.keys['KeyW'] || this.keys['ArrowUp']); }
    get backward() { return !!(this.keys['KeyS'] || this.keys['ArrowDown']); }
    get left()     { return !!(this.keys['KeyA'] || this.keys['ArrowLeft']); }
    get right()    { return !!(this.keys['KeyD'] || this.keys['ArrowRight']); }
    get brake()    { return !!this.keys['Space']; }
    get boost()    { return !!(this.keys['ShiftLeft'] || this.keys['ShiftRight']); }

    /* ---- Pause (edge-triggered) ---- */
    get pauseJustPressed() {
        const current = !!this.keys['Escape'];
        const pressed = current && !this._prevEscape;
        this._prevEscape = current;
        return pressed;
    }

    /** Clear all key states (useful on scene transitions) */
    reset() {
        this.keys = {};
        this._prevEscape = false;
    }
}
