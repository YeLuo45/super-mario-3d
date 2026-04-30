/**
 * AudioManager - Web Audio API 音效系统
 */
class AudioManager {
    constructor() {
        this.ctx = null;
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.initialized = true;
        } catch (e) {
            console.warn('Web Audio API not supported:', e);
        }
    }

    playTone(frequency, duration, type = 'square', volume = 0.15) {
        if (!this.initialized || !this.ctx) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(frequency, this.ctx.currentTime);
        gain.gain.setValueAtTime(volume, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    playJump() {
        if (!this.initialized) this.init();
        this.playTone(400, 0.15, 'square', 0.12);
        setTimeout(() => this.playTone(600, 0.1, 'square', 0.1), 50);
    }

    playBump() {
        if (!this.initialized) this.init();
        this.playTone(150, 0.1, 'square', 0.2);
    }

    playCoin() {
        if (!this.initialized) this.init();
        this.playTone(988, 0.1, 'square', 0.1);
        setTimeout(() => this.playTone(1319, 0.15, 'square', 0.1), 80);
    }

    playPowerup() {
        if (!this.initialized) this.init();
        const notes = [523, 659, 784, 1047];
        notes.forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, 0.12, 'square', 0.12), i * 80);
        });
    }

    playDeath() {
        if (!this.initialized) this.init();
        const notes = [494, 466, 440, 392, 349, 330, 294, 262];
        notes.forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, 0.18, 'square', 0.15), i * 120);
        });
    }

    playStomp() {
        if (!this.initialized) this.init();
        this.playTone(800, 0.08, 'square', 0.15);
        setTimeout(() => this.playTone(200, 0.1, 'square', 0.12), 40);
    }

    playLevelComplete() {
        if (!this.initialized) this.init();
        const notes = [523, 659, 784, 1047];
        notes.forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, 0.2, 'square', 0.12), i * 150);
        });
    }
}

const audioManager = new AudioManager();
