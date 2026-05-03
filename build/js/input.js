export class InputManager {
    constructor() {
        this.keys = {};
        this._prevEscape = false;
        this.enabled = true;

        window.addEventListener('keydown', (e) => {
            if (!this.enabled) return;
            this.keys[e.code] = true;
            if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
                e.preventDefault();
            }
        });

        window.addEventListener('keyup', (e) => {
            if (!this.enabled) return;
            this.keys[e.code] = false;
        });
    }

    /** Permanently disable all input (called on demo end) */
    freeze() {
        this.enabled = false;
        this.keys = {};
        this._prevEscape = false;
    }

    get forward()  { return this.enabled && !!(this.keys['KeyW'] || this.keys['ArrowUp']); }
    get backward() { return this.enabled && !!(this.keys['KeyS'] || this.keys['ArrowDown']); }
    get left()     { return this.enabled && !!(this.keys['KeyA'] || this.keys['ArrowLeft']); }
    get right()    { return this.enabled && !!(this.keys['KeyD'] || this.keys['ArrowRight']); }
    get brake()    { return this.enabled && !!this.keys['Space']; }
    get boost()    { return this.enabled && !!(this.keys['ShiftLeft'] || this.keys['ShiftRight']); }

    get pauseJustPressed() {
        if (!this.enabled) return false;
        const current = !!this.keys['Escape'];
        const pressed = current && !this._prevEscape;
        this._prevEscape = current;
        return pressed;
    }

    reset() {
        this.keys = {};
        this._prevEscape = false;
    }
}
