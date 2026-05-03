/**
 * RaceManager — State machine that drives the entire race flow.
 * States: MENU → COUNTDOWN → RACING → PAUSED → FINISHED
 */
export class RaceManager {
    constructor() {
        /** @type {'MENU'|'COUNTDOWN'|'RACING'|'PAUSED'|'FINISHED'} */
        this.state = 'MENU';

        this.raceTime      = 0;      // seconds elapsed during RACING
        this.countdownTime = 0;      // countdown timer
        this.countdownStep = 0;      // current number shown (3, 2, 1, 0=GO)

        /** Callbacks set by main.js */
        this.onCountdownTick = null; // (number) => void
        this.onCountdownGo   = null; // () => void
        this.onRaceFinish    = null; // (time, position) => void
    }

    /** Start a new race from the menu */
    startRace() {
        this.state         = 'COUNTDOWN';
        this.raceTime      = 0;
        this.countdownTime = 3.0;
        this.countdownStep = 3;
    }

    /** Pause / unpause during RACING */
    togglePause() {
        if (this.state === 'RACING') {
            this.state = 'PAUSED';
        } else if (this.state === 'PAUSED') {
            this.state = 'RACING';
        }
    }

    /** Triggered when any racer finishes */
    finishRace(positionLabel) {
        if (this.state === 'RACING') {
            this.state = 'FINISHED';
            if (this.onRaceFinish) {
                this.onRaceFinish(this.raceTime, positionLabel);
            }
        }
    }

    /** Return to menu state */
    toMenu() {
        this.state = 'MENU';
    }

    /** Main update — called every frame */
    update(dt) {
        if (this.state === 'COUNTDOWN') {
            this.countdownTime -= dt;

            const newStep = Math.ceil(this.countdownTime);
            if (newStep !== this.countdownStep && newStep >= 0) {
                this.countdownStep = newStep;
                if (this.onCountdownTick) this.onCountdownTick(this.countdownStep);
            }

            if (this.countdownTime <= 0) {
                this.state = 'RACING';
                if (this.onCountdownGo) this.onCountdownGo();
            }
        }

        if (this.state === 'RACING') {
            this.raceTime += dt;
        }
    }

    /** Format race time as MM:SS.CC */
    get formattedTime() {
        const total  = this.raceTime;
        const mins   = Math.floor(total / 60);
        const secs   = Math.floor(total % 60);
        const cents  = Math.floor((total * 100) % 100);
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(cents).padStart(2, '0')}`;
    }
}
