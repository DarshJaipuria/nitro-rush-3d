/**
 * MenuManager — Controls visibility and button bindings for all UI overlays.
 * Main menu, setup screen, countdown, pause menu, finish screen.
 */
export class MenuManager {
    /**
     * @param {object} callbacks  { onPlay, onStartRace, onResume, onRestart, onQuitToMenu, onQuit }
     */
    constructor(callbacks) {
        this.cb = callbacks;

        // Selections (defaults)
        this.selectedTrack = 'greenfield';
        this.selectedMode  = 'quickrace';
        this.selectedDiff  = 'medium';

        // DOM refs
        this.mainMenu      = document.getElementById('main-menu');
        this.setupScreen   = document.getElementById('setup-screen');
        this.countdown     = document.getElementById('countdown');
        this.countdownTxt  = document.getElementById('countdown-text');
        this.pauseMenu     = document.getElementById('pause-menu');
        this.finishScreen  = document.getElementById('finish-screen');
        this.finishTitle   = document.getElementById('finish-title');
        this.finishTime    = document.getElementById('finish-time');
        this.finishPos     = document.getElementById('finish-position');

        // ---- Main Menu Buttons ----
        document.getElementById('btn-play').addEventListener('click', () => {
            this._hide(this.mainMenu);
            this._show(this.setupScreen);
        });
        document.getElementById('btn-quit').addEventListener('click', () => this.cb.onQuit());

        // ---- Setup Screen ----
        this._initOptionGroup('track-options', (val) => { this.selectedTrack = val; });
        this._initOptionGroup('mode-options',  (val) => { this.selectedMode  = val; });
        this._initOptionGroup('diff-options',  (val) => { this.selectedDiff  = val; });

        document.getElementById('btn-start-race').addEventListener('click', () => {
            this._hide(this.setupScreen);
            this.cb.onStartRace(this.selectedTrack, this.selectedMode, this.selectedDiff);
        });
        document.getElementById('btn-back-menu').addEventListener('click', () => {
            this._hide(this.setupScreen);
            this._show(this.mainMenu);
        });

        // ---- Pause / Finish Buttons ----
        document.getElementById('btn-resume').addEventListener('click',         () => this.cb.onResume());
        document.getElementById('btn-restart').addEventListener('click',        () => this.cb.onRestart());
        document.getElementById('btn-quit-race').addEventListener('click',      () => this.cb.onQuitToMenu());
        document.getElementById('btn-restart-finish').addEventListener('click', () => this.cb.onRestart());
        document.getElementById('btn-menu-finish').addEventListener('click',    () => this.cb.onQuitToMenu());
    }

    // ---- Option group handler ----

    _initOptionGroup(groupId, onChange) {
        const group = document.getElementById(groupId);
        const buttons = group.querySelectorAll('.option-btn');
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                buttons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                onChange(btn.dataset.value);
            });
        });
    }

    // ---- Show / hide helpers ----

    showMainMenu()  { this._show(this.mainMenu); this._hide(this.setupScreen); this._hide(this.pauseMenu); this._hide(this.finishScreen); this._hide(this.countdown); }
    hideMainMenu()  { this._hide(this.mainMenu); }

    showCountdown(num) {
        this._show(this.countdown);
        this.countdownTxt.textContent = num > 0 ? num : 'GO!';
        this.countdownTxt.style.animation = 'none';
        void this.countdownTxt.offsetWidth;
        this.countdownTxt.style.animation = '';
    }
    hideCountdown() { this._hide(this.countdown); }

    showPause()     { this._show(this.pauseMenu); }
    hidePause()     { this._hide(this.pauseMenu); }

    showFinish(time, position, modeName) {
        const won = position === '1st' || position === '--';
        this.finishTitle.textContent = won ? '🏆 YOU WIN!' : 'RACE COMPLETE';
        if (modeName === 'Time Trial') {
            this.finishTitle.textContent = '🏁 TIME TRIAL COMPLETE';
        }
        this.finishTitle.className = won ? 'win-title' : 'lose-title';
        this.finishTime.textContent  = `Time: ${time}`;
        this.finishPos.textContent   = modeName === 'Time Trial' ? '' : `Position: ${position}`;
        this._show(this.finishScreen);
    }
    hideFinish()    { this._hide(this.finishScreen); }

    hideAll() {
        this._hide(this.mainMenu);
        this._hide(this.setupScreen);
        this._hide(this.countdown);
        this._hide(this.pauseMenu);
        this._hide(this.finishScreen);
    }

    _show(el) { el.classList.remove('hidden'); }
    _hide(el) { el.classList.add('hidden'); }
}
