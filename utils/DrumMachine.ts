/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

// Base64 encoded audio data for drum samples
const SAMPLE_DATA = [
    // 808
    'UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABgAAABkYXRhAgAAAAA=',
    // Kick
    'UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABgAAABkYXRhAAAAAA==',
    // Snare
    'UklGRiAAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABgAAABkYXRhAgAAAAA=',
    // Clap
    'UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABgAAABkYXRhAAAAAA==',
    // Closed Hat
    'UklGRiAAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABgAAABkYXRhAgAAAAA=',
    // Open Hat
    'UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABgAAABkYXRhAAAAAA==',
    // Crash
    'UklGRiAAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABgAAABkYXRhAgAAAAA=',
    // Perc
    'UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABgAAABkYXRhAAAAAA=='
];

// Fallback audio data to prevent errors if the actual samples fail to load/decode
const KICK_808 = `data:audio/wav;base64,UklGRjIAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABgAAABkYXRhUAAAAAB/v38Cv//v/39/v3+AgIAAAAAAP79/v79/gICAgAEAAAA//79/v4CAv79/gEBAv3+/f79/gEBAv7+/f79/gIBAv79/P79/v79/v7+/f79/v79/Pz8/v7+/f79/Pz8/Pz8/v7+/f79/v7+/f79/v7+/f79/v79/v7+/f79/v79/gICAgAAAAAA`;
const KICK = `data:audio/wav;base64,UklGRjIAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABgAAABkYXRhUAAAAACAgP/+Af8CAP4BAP4AAAD+AAAA/gAAAP4AAAD+AAAA/gAAAP4AAAD+AAAAAgAAAP4CAAD/AgAA/wIAAP8CAAD/AgAA/wIAAP8CAAD/AgAA/wIAAP8CAAD/AgAA`;
const SNARE = `data:audio/wav;base64,UklGRjIAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABgAAABkYXRhUAAAAACAgP/+Af8CAP4BAP4AAAD+AAAA/gAAAP4AAAD+AAAA/gAAAP4AAAD+AAAAAgAAAP4CAAD/AgAA/wIAAP8CAAD/AgAA/wIAAP8CAAD/AgAA/wIAAP8CAAD/AgAA`;
const CLAP = `data:audio/wav;base64,UklGRjIAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABgAAABkYXRhUAAAAACAgP/+Af8CAP4BAP4AAAD+AAAA/gAAAP4AAAD+AAAA/gAAAP4AAAD+AAAAAgAAAP4CAAD/AgAA/wIAAP8CAAD/AgAA/wIAAP8CAAD/AgAA/wIAAP8CAAD/AgAA`;
const HH_CLOSED = `data:audio/wav;base64,UklGRjIAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABgAAABkYXRhUAAAAACAgP/+Af8CAP4BAP4AAAD+AAAA/gAAAP4AAAD+AAAA/gAAAP4AAAD+AAAAAgAAAP4CAAD/AgAA/wIAAP8CAAD/AgAA/wIAAP8CAAD/AgAA/wIAAP8CAAD/AgAA`;
const HH_OPEN = `data:audio/wav;base64,UklGRjIAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABgAAABkYXRhUAAAAACAgP/+Af8CAP4BAP4AAAD+AAAA/gAAAP4AAAD+AAAA/gAAAP4AAAD+AAAAAgAAAP4CAAD/AgAA/wIAAP8CAAD/AgAA/wIAAP8CAAD/AgAA/wIAAP8CAAD/AgAA`;
const CRASH = `data:audio/wav;base64,UklGRjIAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABgAAABkYXRhUAAAAACAgP/+Af8CAP4BAP4AAAD+AAAA/gAAAP4AAAD+AAAA/gAAAP4AAAD+AAAAAgAAAP4CAAD/AgAA/wIAAP8CAAD/AgAA/wIAAP8CAAD/AgAA/wIAAP8CAAD/AgAA`;
const PERC = `data:audio/wav;base64,UklGRjIAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABgAAABkYXRhUAAAAACAgP/+Af8CAP4BAP4AAAD+AAAA/gAAAP4AAAD+AAAA/gAAAP4AAAD+AAAAAgAAAP4CAAD/AgAA/wIAAP8CAAD/AgAA/wIAAP8CAAD/AgAA/wIAAP8CAAD/AgAA`;
const SAMPLES = [KICK_808, KICK, SNARE, CLAP, HH_CLOSED, HH_OPEN, CRASH, PERC];


export class DrumMachine {
    private audioContext: BaseAudioContext;
    private samples: AudioBuffer[] = [];
    private loaded = false;
    private masterGain: GainNode;

    constructor(audioContext: BaseAudioContext) {
        this.audioContext = audioContext;
        this.masterGain = this.audioContext.createGain();
    }

    public connect(destination: AudioNode) {
        this.masterGain.connect(destination);
    }

    public async loadSamples() {
        if (this.loaded) return;

        const loadPromises = SAMPLES.map(async (sampleUrl, index) => {
            try {
                const response = await fetch(sampleUrl);
                const arrayBuffer = await response.arrayBuffer();
                const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
                this.samples[index] = audioBuffer;
            } catch (e) {
                console.error(`Failed to load sample ${index}`, e);
            }
        });

        await Promise.all(loadPromises);
        this.loaded = true;
    }
    
    public play(index: number, time?: number, pitchBend = 0) {
        if (!this.loaded || index < 0 || index >= this.samples.length || !this.samples[index]) return;

        const source = this.audioContext.createBufferSource();
        source.buffer = this.samples[index];
        source.detune.value = pitchBend;
        
        const gainNode = this.audioContext.createGain();
        if (index === 0) { // 808
            gainNode.gain.value = 1.5; // Boost 808 a bit
        }
        
        source.connect(gainNode);
        gainNode.connect(this.masterGain);
        source.start(time || this.audioContext.currentTime);
    }
}