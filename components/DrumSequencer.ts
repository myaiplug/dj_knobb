/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { css, html, LitElement } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { styleMap } from 'lit/directives/style-map.js';

import type { LiveMusicHelper } from '../utils/LiveMusicHelper';
import { DrumMachine } from '../utils/DrumMachine';

const PREMADE_LOOPS = [
    {
        name: 'House',
        bpm: 140,
        pattern: [
            Array(16).fill(null), // 808
            [0, null, null, null, 0, null, null, null, 0, null, null, null, 0, null, null, null], // Kick
            Array(16).fill(null), // Snare
            [null, null, null, null, 0, null, null, null, null, null, null, null, 0, null, null, null], // Clap
            [null, null, 0, null, null, null, 0, null, null, null, 0, null, null, null, 0, null], // Closed Hat
            Array(16).fill(null), // Open Hat
            Array(16).fill(null), // Crash
            Array(16).fill(null), // Perc
        ],
    },
    {
        name: 'Trap',
        bpm: 150,
        pattern: [
            [0, null, null, null, null, null, null, 0, null, null, 0, null, null, null, null, null], // 808
            [0, null, null, null, null, null, null, 0, null, null, 0, null, null, null, null, null], // Kick
            [null, null, null, null, 0, null, null, null, null, null, null, null, 0, null, null, null], // Snare
            Array(16).fill(null), // Clap
            [0, 0, 0, null, 0, 0, 0, null, 0, 0, null, null, 0, 0, 0, null], // Closed Hat
            Array(16).fill(null), // Open Hat
            Array(16).fill(null), // Crash
            Array(16).fill(null), // Perc
        ],
    },
    {
        name: 'Boom Bap',
        bpm: 90,
        pattern: [
            Array(16).fill(null), // 808
            [0, null, 0, null, null, null, null, null, 0, null, null, 0, null, null, null, null], // Kick
            [null, null, null, null, 0, null, null, null, null, null, null, null, 0, null, null, null], // Snare
            Array(16).fill(null), // Clap
            [0, null, 0, null, 0, null, 0, null, 0, null, 0, null, 0, null, 0, null], // Closed Hat
            Array(16).fill(null), // Open Hat
            Array(16).fill(null), // Crash
            Array(16).fill(null), // Perc
        ]
    }
];


@customElement('drum-sequencer')
// FIX: The `DrumSequencer` class must extend `LitElement` to be a valid custom element.
// Fix: Added 'extends LitElement' to the class definition.
export class DrumSequencer extends LitElement {
  static override styles = css`
    :host {
        --bg-color: #212121;
        --primary-color: #3dffab;
        --primary-hue: 158;
        --shadow-light: rgba(255, 255, 255, 0.08);
        --shadow-dark: rgba(0, 0, 0, 0.5);
        --neumorph-shadow-outset: 
            -5px -5px 10px var(--shadow-light),
            5px 5px 10px var(--shadow-dark);
        --neumorph-shadow-inset: 
            inset -5px -5px 10px var(--shadow-light),
            inset 5px 5px 10px var(--shadow-dark);
    }
    .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
    }
    .sequencer-container {
        width: clamp(300px, 95vw, 1200px);
        background: var(--bg-color);
        border-radius: 20px;
        box-shadow: var(--neumorph-shadow-outset);
        padding: 20px;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        gap: 15px;
        position: relative;
        color: #fff;
    }
    .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    .header h2 {
        margin: 0;
        font-weight: 500;
    }
    .close-button {
        width: 30px; height: 30px;
        border-radius: 50%; border: none;
        background: var(--bg-color);
        box-shadow: var(--neumorph-shadow-outset);
        color: #fff; cursor: pointer;
        transition: box-shadow 0.1s ease-in-out;
    }
    .close-button:active {
        box-shadow: var(--neumorph-shadow-inset);
    }
    .main-grid {
        display: grid;
        grid-template-columns: 120px 1fr;
        gap: 10px;
        flex-grow: 1;
    }
    .track-labels {
        display: flex;
        flex-direction: column;
        gap: 5px;
        justify-content: space-around;
    }
    .track-label {
        background: #333;
        border-radius: 5px;
        padding: 5px;
        text-align: center;
        font-size: 12px;
        box-shadow: var(--neumorph-shadow-inset);
    }
    .beat-grid {
        display: grid;
        grid-template-columns: repeat(16, 1fr);
        grid-template-rows: repeat(8, 1fr);
        gap: 5px;
        background: #111;
        padding: 10px;
        border-radius: 10px;
        box-shadow: var(--neumorph-shadow-inset);
        position: relative;
        touch-action: none;
    }
    .step {
        border-radius: 3px;
        background: #333;
        cursor: pointer;
        transition: background-color 0.1s;
    }
    .step.active {
        background: var(--primary-color);
    }
    .step.q-beat {
        background: #444;
    }
    .playhead {
        position: absolute;
        top: 0;
        bottom: 0;
        width: calc(100% / 16);
        background: rgba(255, 255, 255, 0.2);
        pointer-events: none;
        transition: left 0.05s linear;
    }
    .controls {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 15px;
        flex-wrap: wrap;
    }
    .controls-left {
        display: flex;
        align-items: center;
        gap: 15px;
        flex-wrap: wrap;
    }
    .controls-right {
        display: flex;
        align-items: center;
        gap: 10px;
    }
    .transport, .patterns, .melody-controls, .export-controls {
        display: flex;
        align-items: center;
        gap: 10px;
    }
    .controls button {
        height: 40px;
        padding: 0 15px;
        border-radius: 20px;
        border: none;
        background: var(--bg-color);
        box-shadow: var(--neumorph-shadow-outset);
        cursor: pointer;
        transition: all 0.1s ease-in-out;
        color: #fff;
        font-size: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    .controls button:hover {
        color: var(--primary-color);
    }
    .controls button:active, .controls button.active {
        box-shadow: var(--neumorph-shadow-inset);
    }
    .controls button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        box-shadow: var(--neumorph-shadow-inset);
    }
    .bpm-dragger {
        width: 120px;
        height: 40px;
        border-radius: 20px;
        background: var(--bg-color);
        box-shadow: var(--neumorph-shadow-outset);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        font-weight: 500;
        user-select: none;
        cursor: ns-resize;
    }
    .loop-selector select {
        height: 40px;
        padding: 0 15px;
        border-radius: 20px;
        border: none;
        background: var(--bg-color);
        box-shadow: var(--neumorph-shadow-outset);
        color: #fff;
        font-size: 14px;
        cursor: pointer;
        -webkit-appearance: none;
        -moz-appearance: none;
        appearance: none;
    }
  `;

    @property({ type: Object }) liveMusicHelper!: LiveMusicHelper;
    
    private drumMachine!: DrumMachine;
    private audioContext!: AudioContext;
    
    @state() private patterns: (number | null)[][][] = Array(4).fill(0).map(() => Array(8).fill(0).map(() => Array(16).fill(null)));
    @state() private currentPattern = 0;
    @state() private bpm = 140;
    @state() private isPlaying = false;
    @state() private currentStep = 0;
    @state() private melodyBuffer: AudioBuffer | null = null;
    @state() private isRecording = false;
    @state() private soundsLoaded = false;

    private nextNoteTime = 0.0;
    private scheduleAheadTime = 0.1;
    private timerID: number | null = null;

    private melodySource: AudioBufferSourceNode | null = null;
    private bpmDragStartY = 0;
    private bpmDragStartBpm = 0;

    private activeEditingStep: { track: number, step: number } | null = null;
    private stepDragStartY = 0;
    private stepDragStartPitch = 0;

    override async connectedCallback() {
        super.connectedCallback();
        
        this.audioContext = this.liveMusicHelper.audioContext;
        this.drumMachine = new DrumMachine(this.audioContext);
        this.drumMachine.connect(this.liveMusicHelper.masterBus);
        
        await this.drumMachine.loadSamples();
        this.soundsLoaded = true;
        this.requestUpdate();

        this.liveMusicHelper.addEventListener('recording-finished', this.handleRecordingFinished);
        this.liveMusicHelper.addEventListener('recording-state-changed', this.handleRecordingStateChanged);
    }

    override disconnectedCallback() {
        super.disconnectedCallback();
        this.stopPlayback();
        this.liveMusicHelper.removeEventListener('recording-finished', this.handleRecordingFinished);
        this.liveMusicHelper.removeEventListener('recording-state-changed', this.handleRecordingStateChanged);
    }
    
    private handleRecordingFinished = async (e: Event) => {
        const blob = (e as CustomEvent<Blob>).detail;
        const arrayBuffer = await blob.arrayBuffer();
        this.melodyBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
    }

    private handleRecordingStateChanged = (e: Event) => {
        const state = (e as CustomEvent<string>).detail;
        this.isRecording = state === 'recording';
    }

    private scheduler = () => {
        while (this.nextNoteTime < this.audioContext.currentTime + this.scheduleAheadTime) {
            this.scheduleNote(this.currentStep, this.nextNoteTime);
            this.nextNoteTime += (60.0 / this.bpm) / 4; // 16th notes

            // Advance the playhead
            this.currentStep = (this.currentStep + 1) % 16;
        }
        this.timerID = window.setTimeout(this.scheduler, 25.0);
    }

    private scheduleNote(beatNumber: number, time: number) {
        // Schedule drum sounds
        for (let i = 0; i < 8; i++) {
            const pitch = this.patterns[this.currentPattern][i][beatNumber];
            if (pitch !== null) {
                this.drumMachine.play(i, time, pitch);
            }
        }

        // Schedule melody loop
        if (beatNumber === 0 && this.melodyBuffer) {
            this.melodySource = this.audioContext.createBufferSource();
            this.melodySource.buffer = this.melodyBuffer;
            this.melodySource.connect(this.liveMusicHelper.masterBus);
            this.melodySource.start(time);
        }
    }

    private handleStepPointerDown(e: PointerEvent, track: number, step: number) {
        e.preventDefault();
        e.stopPropagation();

        if (e.button === 2) { // right click to delete
            const newPatterns = this.patterns.map(p => p.map(t => [...t]));
            newPatterns[this.currentPattern][track][step] = null;
            this.patterns = newPatterns;
            return;
        }

        this.activeEditingStep = { track, step };
        this.stepDragStartY = e.clientY;
        const currentPitch = this.patterns[this.currentPattern][track][step];
        
        if (currentPitch === null) {
            this.stepDragStartPitch = 0;
            const newPatterns = this.patterns.map(p => p.map(t => [...t]));
            newPatterns[this.currentPattern][track][step] = 0; // set to default pitch
            this.patterns = newPatterns;
        } else {
            this.stepDragStartPitch = currentPitch;
        }
        
        let dragged = false;
        const moveHandler = (moveEvent: PointerEvent) => {
            if (!this.activeEditingStep) return;
            dragged = true;
            
            const delta = this.stepDragStartY - moveEvent.clientY;
            const newPitch = this.stepDragStartPitch + delta * 12; // 12 cents per pixel
            const clampedPitch = Math.max(-2400, Math.min(2400, newPitch));

            const newPatterns = this.patterns.map(p => p.map(t => [...t]));
            newPatterns[this.currentPattern][track][step] = Math.round(clampedPitch);
            this.patterns = newPatterns;
        };

        const upHandler = () => {
            if (!dragged && currentPitch !== null) {
                // It was a simple click on an existing note, so toggle it off
                const newPatterns = this.patterns.map(p => p.map(t => [...t]));
                newPatterns[this.currentPattern][track][step] = null;
                this.patterns = newPatterns;

            }
            this.activeEditingStep = null;
            window.removeEventListener('pointermove', moveHandler);
            window.removeEventListener('pointerup', upHandler);
        };
        
        window.addEventListener('pointermove', moveHandler);
        window.addEventListener('pointerup', upHandler);
    }


    private changePattern(patternIndex: number) {
        this.currentPattern = patternIndex;
    }

    private togglePlayback() {
        if (!this.soundsLoaded) return;
        this.isPlaying = !this.isPlaying;
        if (this.isPlaying) {
            this.startPlayback();
        } else {
            this.stopPlayback();
        }
    }

    private startPlayback() {
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
        this.currentStep = 0;
        this.nextNoteTime = this.audioContext.currentTime;
        this.scheduler();
    }

    private stopPlayback() {
        if (this.timerID) {
            window.clearTimeout(this.timerID);
            this.timerID = null;
        }
        this.melodySource?.stop();
        this.currentStep = 0;
        this.requestUpdate(); // To reset playhead position visually
    }
    
    private handleBpmDragStart = (e: PointerEvent) => {
        e.preventDefault();
        this.bpmDragStartY = e.clientY;
        this.bpmDragStartBpm = this.bpm;
        document.body.classList.add('dragging');
        window.addEventListener('pointermove', this.handleBpmDragMove);
        window.addEventListener('pointerup', this.handleBpmDragEnd);
    }

    private handleBpmDragMove = (e: PointerEvent) => {
        const delta = this.bpmDragStartY - e.clientY;
        const newBpm = this.bpmDragStartBpm + delta;
        this.bpm = Math.round(Math.max(60, Math.min(200, newBpm)));
    };

    private handleBpmDragEnd = () => {
        document.body.classList.remove('dragging');
        window.removeEventListener('pointermove', this.handleBpmDragMove);
        window.removeEventListener('pointerup', this.handleBpmDragEnd);
    };

    private handleLoopChange(e: Event) {
        const loopName = (e.target as HTMLSelectElement).value;
        if (loopName) {
            this.loadLoop(loopName);
        }
    }

    private loadLoop(loopName: string) {
        const loop = PREMADE_LOOPS.find(l => l.name === loopName);
        if (!loop) return;

        const newPatterns = [...this.patterns];
        newPatterns[this.currentPattern] = loop.pattern.map(track => [...track]);
        this.patterns = newPatterns;
        this.bpm = loop.bpm;
        this.requestUpdate();
    }
    
    private recordMelody() {
        if (!this.liveMusicHelper) return;
        const barDuration = (60 / this.bpm) * 4; // 4 beats per bar
        const recordingDuration = barDuration * 4 * 1000; // 4 bars in ms
        this.liveMusicHelper.startRecording(recordingDuration);
    }

    private async exportAudio(drumsOnly: boolean, melodyOnly: boolean) {
        this.stopPlayback();
        const loopDuration = (16 * (60 / this.bpm)) / 4;
        const offlineContext = new OfflineAudioContext(2, this.audioContext.sampleRate * loopDuration, this.audioContext.sampleRate);
        const offlineDrumMachine = new DrumMachine(offlineContext);
        await offlineDrumMachine.loadSamples();

        // Schedule drums
        if (!melodyOnly) {
            for (let step = 0; step < 16; step++) {
                const time = (step * (60 / this.bpm)) / 4;
                for (let track = 0; track < 8; track++) {
                    const pitch = this.patterns[this.currentPattern][track][step];
                    if (pitch !== null) {
                        offlineDrumMachine.play(track, time, pitch);
                    }
                }
            }
        }

        // Schedule melody
        if (!drumsOnly && this.melodyBuffer) {
            const bufferSource = offlineContext.createBufferSource();
            bufferSource.buffer = this.melodyBuffer;
            bufferSource.connect(offlineContext.destination);
            bufferSource.start(0);
        }

        const renderedBuffer = await offlineContext.startRendering();
        this.downloadWav(renderedBuffer);
    }

    private downloadWav(buffer: AudioBuffer) {
        // WAV conversion logic from AudioEditor
        const numOfChan = buffer.numberOfChannels,
            len = buffer.length * numOfChan * 2 + 44;
        const bufferWav = new ArrayBuffer(len);
        const view = new DataView(bufferWav);
        let pos = 0;

        const setUint16 = (val: number) => { view.setUint16(pos, val, true); pos += 2; };
        const setUint32 = (val: number) => { view.setUint32(pos, val, true); pos += 4; };
        
        setUint32(0x46464952); // "RIFF"
        setUint32(len - 8);
        setUint32(0x45564157); // "WAVE"
        setUint32(0x20746d66); // "fmt "
        setUint32(16);
        setUint16(1);
        setUint16(numOfChan);
        setUint32(buffer.sampleRate);
        setUint32(buffer.sampleRate * 2 * numOfChan);
        setUint16(numOfChan * 2);
        setUint16(16);
        setUint32(0x61746164); // "data"
        setUint32(len - pos - 4);

        const channels = Array.from({length: numOfChan}, (_, i) => buffer.getChannelData(i));
        for (let i = 0; i < buffer.length; i++) {
            for (let ch = 0; ch < numOfChan; ch++) {
                const sample = Math.max(-1, Math.min(1, channels[ch][i]));
                view.setInt16(pos, sample < 0 ? sample * 32768 : sample * 32767, true);
                pos += 2;
            }
        }
        
        const blob = new Blob([view], { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sequencer-export-${this.bpm}bpm.wav`;
        a.click();
        URL.revokeObjectURL(url);
    }
    
    private handleClose() {
        this.dispatchEvent(new CustomEvent('close'));
    }

    override render() {
        const trackLabels = ['808', 'Kick', 'Snare', 'Clap', 'Closed Hat', 'Open Hat', 'Crash', 'Perc'];
        const playheadStyle = styleMap({
            left: this.isPlaying ? `${(this.currentStep / 16) * 100}%` : '-100%',
        });
        
        return html`
            <div class="modal-overlay">
                <div class="sequencer-container">
                    <div class="header">
                        <h2>Beatgrid</h2>
                        <button class="close-button" @click=${this.handleClose}>✕</button>
                    </div>
                    <div class="main-grid">
                        <div class="track-labels">
                            ${trackLabels.map(label => html`<div class="track-label">${label}</div>`)}
                        </div>
                        <div class="beat-grid" @contextmenu=${(e: Event) => e.preventDefault()}>
                            ${this.patterns[this.currentPattern].map((track, trackIndex) => 
                                track.map((stepValue, stepIndex) => {
                                    const stepClasses = classMap({
                                        step: true,
                                        active: stepValue !== null,
                                        'q-beat': stepIndex % 4 === 0,
                                    });
                                    
                                    let stepStyle = {};
                                    if (stepValue !== null) {
                                        // Map pitch from [-2400, 2400] to a lightness from [20, 100]
                                        const lightness = 60 + (stepValue / 2400) * 40;
                                        stepStyle = { background: `hsl(var(--primary-hue), 100%, ${lightness}%)`};
                                    }

                                    return html`
                                    <div 
                                        class=${stepClasses}
                                        style=${styleMap(stepStyle)}
                                        @pointerdown=${(e: PointerEvent) => this.handleStepPointerDown(e, trackIndex, stepIndex)}>
                                    </div>`
                                })
                            )}
                            ${this.isPlaying ? html`<div class="playhead" style=${playheadStyle}></div>` : ''}
                        </div>
                    </div>
                    <div class="controls">
                        <div class="controls-left">
                            <div class="transport">
                                <button @click=${this.togglePlayback} .disabled=${!this.soundsLoaded}>${this.isPlaying ? 'Stop' : 'Play'}</button>
                            </div>
                            <div class="patterns">
                                ${[...Array(4)].map((_, i) => html`
                                    <button 
                                        class=${classMap({active: this.currentPattern === i})}
                                        @click=${() => this.changePattern(i)}>P${i + 1}</button>
                                `)}
                            </div>
                            <div class="melody-controls">
                                <button 
                                    @click=${this.recordMelody} 
                                    .disabled=${this.isRecording || this.liveMusicHelper?.playbackState !== 'playing'}>
                                    ${this.isRecording ? 'Recording...' : 'Record Melody'}
                                </button>
                            </div>
                            <div class="export-controls">
                                <button @click=${() => this.exportAudio(false, false)} .disabled=${!this.melodyBuffer}>Export Mix</button>
                                <button @click=${() => this.exportAudio(true, false)}>Export Drums</button>
                                <button @click=${() => this.exportAudio(false, true)} .disabled=${!this.melodyBuffer}>Export Melody</button>
                            </div>
                        </div>
                        <div class="controls-right">
                             <div class="loop-selector">
                                <select @change=${this.handleLoopChange}>
                                    <option value="">Drum Loops</option>
                                    ${PREMADE_LOOPS.map(loop => html`<option value=${loop.name}>${loop.name}</option>`)}
                                </select>
                            </div>
                            <div class="bpm-dragger" @pointerdown=${this.handleBpmDragStart}>
                                ${this.bpm} BPM
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

declare global {
  interface HTMLElementTagNameMap {
    'drum-sequencer': DrumSequencer;
  }
}
