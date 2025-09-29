/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { css, html, LitElement, svg } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';

@customElement('audio-editor')
// FIX: The `AudioEditor` class must extend `LitElement` to be a valid custom element.
// Fix: Added 'extends LitElement' to the class definition.
export class AudioEditor extends LitElement {
    static override styles = css`
    :host {
        --bg-color: #212121;
        --primary-color: #3dffab;
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
    .editor-container {
        width: clamp(300px, 90vw, 1200px);
        height: clamp(200px, 60vh, 500px);
        background: var(--bg-color);
        border-radius: 20px;
        box-shadow: var(--neumorph-shadow-outset);
        padding: 20px;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        gap: 20px;
        position: relative;
    }
    .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        color: #fff;
    }
    .header h2 {
        margin: 0;
        font-weight: 500;
    }
    .waveform-container {
        flex-grow: 1;
        position: relative;
        background: #111;
        border-radius: 10px;
        box-shadow: var(--neumorph-shadow-inset);
    }
    #waveform-canvas {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        cursor: text;
    }
    .controls {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 15px;
    }
    .controls button {
        width: 50px;
        height: 50px;
        border-radius: 50%;
        border: none;
        background: var(--bg-color);
        box-shadow: var(--neumorph-shadow-outset);
        cursor: pointer;
        transition: box-shadow 0.1s ease-in-out;
        color: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    .controls button:hover {
        color: var(--primary-color);
    }
    .controls button:active {
        box-shadow: var(--neumorph-shadow-inset);
    }
    .controls button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        box-shadow: var(--neumorph-shadow-inset);
    }
    .controls button svg {
        width: 24px;
        height: 24px;
        fill: currentColor;
    }
    .stem-modal-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1001; /* Higher than editor content */
        border-radius: 20px; /* Match parent */
    }
    .stem-modal-container {
        background: var(--bg-color);
        padding: 25px;
        border-radius: 15px;
        box-shadow: var(--neumorph-shadow-outset);
        text-align: center;
        color: #fff;
    }
    .stem-modal-container h2 {
        margin-top: 0;
    }
    .stem-modal-container p {
        opacity: 0.8;
        max-width: 250px;
        margin-bottom: 20px;
        font-size: 14px;
    }
    .stem-modal-buttons {
        display: flex;
        gap: 15px;
        justify-content: center;
    }
    .stem-modal-buttons button {
        min-width: 80px;
        height: 40px;
        border-radius: 10px;
        border: none;
        background: var(--bg-color);
        box-shadow: var(--neumorph-shadow-outset);
        cursor: pointer;
        transition: box-shadow 0.1s ease-in-out;
        color: #fff;
        font-size: 16px;
        font-weight: 500;
    }
    .stem-modal-buttons button:hover {
        color: var(--primary-color);
    }
    .stem-modal-buttons button:active {
        box-shadow: var(--neumorph-shadow-inset);
    }
    `;

    @property({ type: Object }) audioBlob: Blob | null = null;
    @query('#waveform-canvas') private canvas!: HTMLCanvasElement;
    
    @state() private audioBuffer: AudioBuffer | null = null;
    @state() private isPlaying = false;
    @state() private selectionStart: number | null = null;
    @state() private selectionEnd: number | null = null;
    @state() private isLoading = true;
    @state() private isStemModalOpen = false;

    private audioContext!: AudioContext;
    private sourceNode: AudioBufferSourceNode | null = null;
    private playbackStartTime = 0;
    private playbackTime = 0;
    private playheadPosition = 0;
    private animationFrameId: number | null = null;

    private isDragging = false;

    override connectedCallback(): void {
        super.connectedCallback();
        this.audioContext = new AudioContext();
    }
    
    override disconnectedCallback(): void {
        super.disconnectedCallback();
        this.audioContext.close();
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
    }

    override async updated(changedProperties: Map<string, unknown>) {
        if (changedProperties.has('audioBlob') && this.audioBlob) {
            this.isLoading = true;
            const arrayBuffer = await this.audioBlob.arrayBuffer();
            this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            this.isLoading = false;
            this.resetPlayback();
            this.requestUpdate();
            // Timeout to allow canvas to be rendered
            setTimeout(() => this.draw(), 0);
        }
    }

    private handleClose() {
        this.dispatchEvent(new CustomEvent('close'));
    }

    private draw() {
        if (!this.canvas || !this.audioContext) return;
        const ctx = this.canvas.getContext('2d');
        if (!ctx) return;

        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = this.canvas.clientHeight;
        
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (!this.audioBuffer) return;

        this.drawWaveform(ctx, this.audioBuffer);
        this.drawSelection(ctx);
        this.drawPlayhead(ctx);
    }

    private drawWaveform(ctx: CanvasRenderingContext2D, buffer: AudioBuffer) {
        const width = this.canvas.width;
        const height = this.canvas.height;
        const halfHeight = height / 2;
        const data = buffer.getChannelData(0);
        const step = Math.ceil(data.length / width);
        const amp = height / 2;

        ctx.strokeStyle = getComputedStyle(this).getPropertyValue('--primary-color').trim();
        ctx.lineWidth = 1;
        ctx.beginPath();
        
        for (let i = 0; i < width; i++) {
            let min = 1.0;
            let max = -1.0;
            for (let j = 0; j < step; j++) {
                const datum = data[(i * step) + j];
                if (datum < min) min = datum;
                if (datum > max) max = datum;
            }
            ctx.moveTo(i + 0.5, halfHeight + min * amp);
            ctx.lineTo(i + 0.5, halfHeight + max * amp);
        }
        ctx.stroke();
    }
    
    private drawSelection(ctx: CanvasRenderingContext2D) {
        if (this.selectionStart === null || this.selectionEnd === null || !this.audioBuffer) return;
        
        const startX = (this.selectionStart / this.audioBuffer.duration) * this.canvas.width;
        const endX = (this.selectionEnd / this.audioBuffer.duration) * this.canvas.width;
        
        ctx.fillStyle = 'rgba(61, 255, 171, 0.3)';
        ctx.fillRect(Math.min(startX, endX), 0, Math.abs(endX - startX), this.canvas.height);
    }

    private drawPlayhead(ctx: CanvasRenderingContext2D) {
        if (!this.audioBuffer) return;
        const x = (this.playheadPosition / this.audioBuffer.duration) * this.canvas.width;
        ctx.fillStyle = '#fff';
        ctx.fillRect(x, 0, 1, this.canvas.height);
    }
    
    private loop() {
        if (this.isPlaying && this.audioBuffer) {
            const elapsedTime = this.audioContext.currentTime - this.playbackStartTime;
            this.playheadPosition = this.playbackTime + elapsedTime;
            if (this.playheadPosition >= this.audioBuffer.duration) {
                this.stop();
            }
        }
        this.draw();
        this.animationFrameId = requestAnimationFrame(() => this.loop());
    }

    // Playback controls
    private async playPause() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }
    
    private play() {
        if (!this.audioBuffer || this.isPlaying) return;
        this.sourceNode = this.audioContext.createBufferSource();
        this.sourceNode.buffer = this.audioBuffer;
        this.sourceNode.connect(this.audioContext.destination);
        
        this.playbackStartTime = this.audioContext.currentTime;
        this.sourceNode.start(0, this.playbackTime % this.audioBuffer.duration);
        this.isPlaying = true;

        this.sourceNode.onended = () => {
            if (this.isPlaying) { // Ended naturally
                this.stop();
            }
        };
        this.loop();
    }

    private pause() {
        if (!this.isPlaying || !this.sourceNode) return;
        this.playbackTime += this.audioContext.currentTime - this.playbackStartTime;
        this.sourceNode.stop();
        this.sourceNode = null;
        this.isPlaying = false;
        if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    }

    private stop() {
        this.sourceNode?.stop();
        this.sourceNode = null;
        this.isPlaying = false;
        this.playbackTime = 0;
        this.playheadPosition = 0;
        this.requestUpdate();
        if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
        this.draw();
    }
    
    private rewind() {
        if (this.isPlaying) {
            this.pause();
            this.playbackTime = 0;
            this.playheadPosition = 0;
            this.play();
        } else {
            this.playbackTime = 0;
            this.playheadPosition = 0;
        }
        this.draw();
    }

    private resetPlayback() {
        this.stop();
        this.selectionStart = null;
        this.selectionEnd = null;
    }
    
    // Selection and Editing
    private handleCanvasDown(e: PointerEvent) {
        if (!this.audioBuffer) return;
        this.isDragging = true;
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const time = (x / this.canvas.width) * this.audioBuffer.duration;
        this.selectionStart = time;
        this.selectionEnd = time;
        this.requestUpdate();
    }

    private handleCanvasMove(e: PointerEvent) {
        if (!this.isDragging || !this.audioBuffer) return;
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        this.selectionEnd = (x / this.canvas.width) * this.audioBuffer.duration;
        this.requestUpdate();
    }

    private handleCanvasUp() {
        this.isDragging = false;
    }
    
    private cutSelection() {
        if (!this.audioBuffer || this.selectionStart === null || this.selectionEnd === null) return;
        
        this.stop();

        const start = Math.min(this.selectionStart, this.selectionEnd);
        const end = Math.max(this.selectionEnd, this.selectionEnd);

        const originalBuffer = this.audioBuffer;
        const { sampleRate, numberOfChannels, length } = originalBuffer;
        
        const startSample = Math.floor(start * sampleRate);
        const endSample = Math.floor(end * sampleRate);

        const newLength = length - (endSample - startSample);
        if (newLength <= 0) {
            this.audioBuffer = null;
        } else {
            const newBuffer = this.audioContext.createBuffer(numberOfChannels, newLength, sampleRate);
            for (let i = 0; i < numberOfChannels; i++) {
                const oldChannelData = originalBuffer.getChannelData(i);
                const newChannelData = newBuffer.getChannelData(i);
                newChannelData.set(oldChannelData.subarray(0, startSample), 0);
                newChannelData.set(oldChannelData.subarray(endSample), startSample);
            }
            this.audioBuffer = newBuffer;
        }
        
        this.resetPlayback();
        this.requestUpdate();
        setTimeout(() => this.draw(), 0);
    }
    
    // Download Modal
    private openStemModal() {
        if (this.audioBuffer) {
            this.isStemModalOpen = true;
        }
    }

    private handleStemSplitChoice(shouldSplit: boolean) {
        this.isStemModalOpen = false;
        if (shouldSplit) {
            this.dispatchEvent(new CustomEvent('error', {
                detail: 'Stem splitting is not yet supported.',
                bubbles: true,
                composed: true,
            }));
        } else {
            this.downloadWav();
        }
    }

    private downloadWav() {
        if (!this.audioBuffer) return;

        // Convert AudioBuffer to WAV
        const buffer = this.audioBuffer;
        const numOfChan = buffer.numberOfChannels,
            len = buffer.length * numOfChan * 2 + 44;
        const bufferWav = new ArrayBuffer(len);
        const view = new DataView(bufferWav);
        const channels = [];
        let i, sample, pos = 0;

        // write WAV header
        this.setUint32(view, pos, 0x46464952); // "RIFF"
        pos += 4;
        this.setUint32(view, pos, len - 8); // file length - 8
        pos += 4;
        this.setUint32(view, pos, 0x45564157); // "WAVE"
        pos += 4;
        this.setUint32(view, pos, 0x20746d66); // "fmt " chunk
        pos += 4;
        this.setUint32(view, pos, 16); // length of fmt chunk
        pos += 4;
        this.setUint16(view, pos, 1); // PCM format
        pos += 2;
        this.setUint16(view, pos, numOfChan);
        pos += 2;
        this.setUint32(view, pos, buffer.sampleRate);
        pos += 4;
        this.setUint32(view, pos, buffer.sampleRate * 2 * numOfChan); // byte rate
        pos += 4;
        this.setUint16(view, pos, numOfChan * 2); // block align
        pos += 2;
        this.setUint16(view, pos, 16); // bits per sample
        pos += 2;
        this.setUint32(view, pos, 0x61746164); // "data" chunk
        pos += 4;
        this.setUint32(view, pos, len - pos - 4); // data length
        pos += 4;

        // write interleaved data
        for (i = 0; i < buffer.numberOfChannels; i++)
            channels.push(buffer.getChannelData(i));

        for (i = 0; i < buffer.length; i++) {
            for (let ch = 0; ch < numOfChan; ch++) {
                sample = Math.max(-1, Math.min(1, channels[ch][i]));
                sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
                view.setInt16(pos, sample, true);
                pos += 2;
            }
        }
        
        const blob = new Blob([view], { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'prompt-dj-recording.wav';
        a.click();
        URL.revokeObjectURL(url);
    }
    
    private setUint16(view: DataView, offset: number, val: number) { view.setUint16(offset, val, true); }
    private setUint32(view: DataView, offset: number, val: number) { view.setUint32(offset, val, true); }

    // SVG Icons
    private rewindIcon = svg`<svg viewBox="0 0 24 24"><path d="M11 18V6l-8.5 6 8.5 6zm.5-6 8.5 6V6l-8.5 6z"/></svg>`;
    private playIcon = svg`<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>`;
    private pauseIcon = svg`<svg viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;
    private stopIcon = svg`<svg viewBox="0 0 24 24"><path d="M6 6h12v12H6z"/></svg>`;
    private cutIcon = svg`<svg viewBox="0 0 24 24"><path d="M6 17.59 7.41 19 12 14.42 16.59 19 18 17.59 13.42 13 18 8.41 16.59 7 12 11.58 7.41 7 6 8.41 10.58 13z"/></svg>`;
    private downloadIcon = svg`<svg viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>`;

    private renderStemModal() {
        return html`
            <div class="stem-modal-overlay">
                <div class="stem-modal-container">
                    <h2>Split Stems?</h2>
                    <p>This would export the track as separate audio files (e.g., drums, bass, melody).</p>
                    <div class="stem-modal-buttons">
                        <button @click=${() => this.handleStemSplitChoice(true)}>Yes</button>
                        <button @click=${() => this.handleStemSplitChoice(false)}>No, just the mix</button>
                    </div>
                </div>
            </div>
        `;
    }

    override render() {
        return html`
            <div class="modal-overlay">
                <div class="editor-container">
                    <div class="header">
                        <h2>Audio Editor</h2>
                        <button @click=${this.handleClose} style="width: 30px; height: 30px; font-size: 16px;">✕</button>
                    </div>
                    <div class="waveform-container" 
                        @pointerdown=${this.handleCanvasDown}
                        @pointermove=${this.handleCanvasMove}
                        @pointerup=${this.handleCanvasUp}
                        @pointerleave=${this.handleCanvasUp}>
                        <canvas id="waveform-canvas"></canvas>
                        ${this.isLoading ? html`<div style="position:absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: #fff;">Loading Audio...</div>` : ''}
                    </div>
                    <div class="controls">
                         <button @click=${this.rewind} title="Rewind to Start" .disabled=${!this.audioBuffer}>${this.rewindIcon}</button>
                         <button @click=${this.playPause} title=${this.isPlaying ? 'Pause' : 'Play'} .disabled=${!this.audioBuffer}>${this.isPlaying ? this.pauseIcon : this.playIcon}</button>
                         <button @click=${this.stop} title="Stop" .disabled=${!this.audioBuffer}>${this.stopIcon}</button>
                         <button @click=${this.cutSelection} title="Cut Selection" .disabled=${this.selectionStart === null}>${this.cutIcon}</button>
                         <button @click=${this.openStemModal} title="Download WAV" .disabled=${!this.audioBuffer}>${this.downloadIcon}</button>
                    </div>
                    ${this.isStemModalOpen ? this.renderStemModal() : ''}
                </div>
            </div>
        `;
    }
}

declare global {
  interface HTMLElementTagNameMap {
    'audio-editor': AudioEditor;
  }
}
