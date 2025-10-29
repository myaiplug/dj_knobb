/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { css, html, LitElement } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';
import { classMap } from 'lit/directives/class-map.js';

import { throttle } from '../utils/throttle';

import './PromptController';
import './PlayPauseButton';
import './AudioEditor';
import './DrumSequencer';
import './ApiKeyModal';
import type { PlaybackState, Prompt, RecordingState } from '../types';
import { MidiDispatcher } from '../utils/MidiDispatcher';
import { AudioRecorder } from '../utils/AudioRecorder';
import { LiveMusicHelper } from '../utils/LiveMusicHelper';
import { ApiKeyStorage } from '../utils/ApiKeyStorage';

/** The grid of prompt inputs. */
@customElement('prompt-dj-midi')
// FIX: The `PromptDjMidi` class must extend `LitElement` to be a valid custom element.
// Fix: Added 'extends LitElement' to the class definition.
export class PromptDjMidi extends LitElement {
  static override styles = css`
    :host {
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      box-sizing: border-box;
      position: relative;
    }
    #background {
      will-change: background-image;
      position: absolute;
      height: 100%;
      width: 100%;
      z-index: -1;
      background: #111;
    }
    #grid {
      width: 80vmin;
      height: 80vmin;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 2.5vmin;
      margin-top: 4vmin;
    }
    prompt-controller {
      width: 100%;
    }
    play-pause-button {
      position: relative;
      width: 15vmin;
    }
    #buttons {
      position: absolute;
      top: 0;
      left: 0;
      padding: 5px;
      display: flex;
      gap: 5px;
    }
    button {
      font: inherit;
      font-weight: 600;
      cursor: pointer;
      color: #fff;
      background: #0002;
      -webkit-font-smoothing: antialiased;
      border: 1.5px solid #fff;
      border-radius: 4px;
      user-select: none;
      padding: 3px 6px;
      &.active {
        background-color: #fff;
        color: #000;
      }
    }
    select {
      font: inherit;
      padding: 5px;
      background: #fff;
      color: #000;
      border-radius: 4px;
      border: none;
      outline: none;
      cursor: pointer;
    }
    #bottom-controls {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 2vmin;
      margin-top: 1vmin;
      width: 80vmin;
    }
    #record-button {
      width: 7vmin;
      height: 7vmin;
      border-radius: 50%;
      padding: 0;
      border: none;
      cursor: pointer;
      background: #212121;
      box-shadow: 
        -5px -5px 10px rgba(255, 255, 255, 0.08),
        5px 5px 10px rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: box-shadow 0.1s ease-in-out;
    }
    #record-button:hover {
      box-shadow: 
        -2px -2px 5px rgba(255, 255, 255, 0.08),
        2px 2px 5px rgba(0, 0, 0, 0.5);
    }
    #record-button:active, #record-button:disabled {
      box-shadow: inset -5px -5px 10px rgba(255, 255, 255, 0.08),
                inset 5px 5px 10px rgba(0, 0, 0, 0.5);
    }
    #record-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    #record-button svg {
      width: 40%;
      height: 40%;
      fill: #fff;
      transition: fill 0.2s;
    }
    #record-button.recording svg {
      fill: #ff253a;
    }
    #recording-progress-container {
      width: 40vmin;
      height: 4px;
      background-color: rgba(0, 0, 0, 0.3);
      border-radius: 2px;
      margin-top: 2vmin;
      overflow: hidden;
      display: none;
    }
    :host([recordingstate="recording"]) #recording-progress-container {
      display: block;
    }
    #recording-progress-bar {
      height: 100%;
      background: #9900ff;
      border-radius: 2px;
      transition: width 0.1s linear;
    }
    #transition-controls {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 1vmin;
      margin-left: auto;
    }
    .transition-label {
        color: #fff;
        font-size: 1.5vmin;
        font-weight: 500;
        opacity: 0.8;
        user-select: none;
    }
    .transition-buttons {
        display: flex;
        gap: 0.5vmin;
    }
    .transition-buttons button {
        padding: 0.5vmin 1vmin;
        aspect-ratio: auto;
        min-width: 4vmin;
        height: 4vmin;
        font-size: 1.8vmin;
        line-height: 1;
    }
    #sequencer-button {
      height: 7vmin;
      padding: 0 2vmin;
      border-radius: 3.5vmin;
      border: none;
      cursor: pointer;
      background: #212121;
      color: #fff;
      font-size: 2vmin;
      box-shadow: 
        -5px -5px 10px rgba(255, 255, 255, 0.08),
        5px 5px 10px rgba(0, 0, 0, 0.5);
      transition: box-shadow 0.1s ease-in-out;
    }
    #sequencer-button:hover {
      box-shadow: 
        -2px -2px 5px rgba(255, 255, 255, 0.08),
        2px 2px 5px rgba(0, 0, 0, 0.5);
    }
    #sequencer-button:active {
      box-shadow: inset -5px -5px 10px rgba(255, 255, 255, 0.08),
                inset 5px 5px 10px rgba(0, 0, 0, 0.5);
    }
  `;

  private prompts: Map<string, Prompt>;
  private midiDispatcher: MidiDispatcher;
  private liveMusicHelper: LiveMusicHelper;

  @property({ type: Boolean }) private showMidi = false;
  @property({ type: String }) public playbackState: PlaybackState = 'stopped';
  @property({ type: String, reflect: true }) public recordingState: RecordingState = 'idle';

  @state() public audioLevel = 0;
  @state() private midiInputIds: string[] = [];
  @state() private activeMidiInputId: string | null = null;
  
  @state() private recordingTime = 0;
  private recordingTimerId: number | null = null;
  @state() private recordedAudioBlob: Blob | null = null;
  @state() private isEditorOpen = false;
  @state() private isSequencerOpen = false;
  @state() private transitionBars = 4;
  @state() private isApiModalOpen = false;

  @property({ type: Object })
  private filteredPrompts = new Set<string>();

  constructor(
    initialPrompts: Map<string, Prompt>,
    liveMusicHelper: LiveMusicHelper | null
  ) {
    super();
    this.prompts = initialPrompts;
    this.midiDispatcher = new MidiDispatcher();
    this.liveMusicHelper = liveMusicHelper!;
  }

  public setLiveMusicHelper(helper: LiveMusicHelper) {
    this.liveMusicHelper = helper;
  }

  override updated(changedProperties: Map<string, unknown>) {
    super.updated(changedProperties);
    if (changedProperties.has('recordingState')) {
        if (this.recordingState === 'recording') {
            const recordingStartTime = Date.now();
            const updateTimer = () => {
                const elapsed = Date.now() - recordingStartTime;
                this.recordingTime = elapsed;
                if (this.recordingState === 'recording') {
                    this.recordingTimerId = requestAnimationFrame(updateTimer);
                }
            };
            updateTimer();
        } else {
            if (this.recordingTimerId) {
                cancelAnimationFrame(this.recordingTimerId);
                this.recordingTimerId = null;
            }
            this.recordingTime = 0;
        }
    }
  }

  private handlePromptChanged(e: CustomEvent<Prompt>) {
    const { promptId, text, weight, cc } = e.detail;
    const prompt = this.prompts.get(promptId);

    if (!prompt) {
      console.error('prompt not found', promptId);
      return;
    }

    prompt.text = text;
    prompt.weight = weight;
    prompt.cc = cc;

    const newPrompts = new Map(this.prompts);
    newPrompts.set(promptId, prompt);

    this.prompts = newPrompts;
    this.requestUpdate();

    this.dispatchEvent(
      new CustomEvent('prompts-changed', {
        detail: {
          prompts: this.prompts,
          transitionBars: this.transitionBars,
        },
      }),
    );
  }

  /** Generates radial gradients for each prompt based on weight and color. */
  private readonly makeBackground = throttle(
    () => {
      const clamp01 = (v: number) => Math.min(Math.max(v, 0), 1);

      const MAX_WEIGHT = 0.5;
      const MAX_ALPHA = 0.6;

      const bg: string[] = [];

      [...this.prompts.values()].forEach((p, i) => {
        const alphaPct = clamp01(p.weight / MAX_WEIGHT) * MAX_ALPHA;
        const alpha = Math.round(alphaPct * 0xff)
          .toString(16)
          .padStart(2, '0');

        const stop = p.weight / 2;
        const x = (i % 4) / 3;
        const y = Math.floor(i / 4) / 3;
        const s = `radial-gradient(circle at ${x * 100}% ${y * 100}%, ${p.color}${alpha} 0px, ${p.color}00 ${stop * 100}%)`;

        bg.push(s);
      });

      return bg.join(', ');
    },
    30, // don't re-render more than once every XXms
  );

  private toggleShowMidi() {
    return this.setShowMidi(!this.showMidi);
  }

  public async setShowMidi(show: boolean) {
    this.showMidi = show;
    if (!this.showMidi) return;
    try {
      const inputIds = await this.midiDispatcher.getMidiAccess();
      this.midiInputIds = inputIds;
      this.activeMidiInputId = this.midiDispatcher.activeMidiInputId;
    } catch (e) {
      this.showMidi = false;
      this.dispatchEvent(new CustomEvent('error', {detail: (e as Error).message}));
    }
  }

  private handleMidiInputChange(event: Event) {
    const selectElement = event.target as HTMLSelectElement;
    const newMidiId = selectElement.value;
    this.activeMidiInputId = newMidiId;
    this.midiDispatcher.activeMidiInputId = newMidiId;
  }

  private playPause() {
    this.dispatchEvent(new CustomEvent('play-pause'));
  }

  public addFilteredPrompt(prompt: string) {
    this.filteredPrompts = new Set([...this.filteredPrompts, prompt]);
  }

  public showEditor(blob: Blob) {
    this.recordedAudioBlob = blob;
    this.isEditorOpen = true;
  }

  private closeEditor() {
      this.isEditorOpen = false;
      this.recordedAudioBlob = null;
  }

  private toggleRecording() {
      this.dispatchEvent(new CustomEvent('toggle-recording'));
  }

  private toggleSequencer() {
    this.isSequencerOpen = !this.isSequencerOpen;
  }

  private setTransitionBars(bars: number) {
    this.transitionBars = bars;
  }

  private toggleApiModal() {
    this.isApiModalOpen = !this.isApiModalOpen;
  }

  public showApiModal() {
    this.isApiModalOpen = true;
  }

  private handleApiModalSave(e: CustomEvent) {
    this.isApiModalOpen = false;
    // Dispatch event to notify parent that API key was saved
    this.dispatchEvent(new CustomEvent('api-key-saved', {
      detail: e.detail
    }));
  }

  private handleApiModalCancel() {
    this.isApiModalOpen = false;
  }

  override render() {
    const bg = styleMap({
      backgroundImage: this.makeBackground(),
    });
    const recordingProgress = this.recordingState === 'recording' ? 
        (this.recordingTime / AudioRecorder.MAX_DURATION) * 100 : 0;
    const progressBarStyle = styleMap({ width: `${recordingProgress}%` });

    return html`<div id="background" style=${bg}></div>
      <div id="buttons">
        <button
          @click=${this.toggleApiModal}
          class=${ApiKeyStorage.hasValidApiKey() ? 'active' : ''}
          >API</button
        >
        <button
          @click=${this.toggleShowMidi}
          class=${this.showMidi ? 'active' : ''}
          >MIDI</button
        >
        <select
          @change=${this.handleMidiInputChange}
          .value=${this.activeMidiInputId || ''}
          style=${this.showMidi ? '' : 'visibility: hidden'}>
          ${this.midiInputIds.length > 0
        ? this.midiInputIds.map(
          (id) =>
            html`<option value=${id}>
                    ${this.midiDispatcher.getDeviceName(id)}
                  </option>`,
        )
        : html`<option value="">No devices found</option>`}
        </select>
      </div>
      <div id="grid">${this.renderPrompts()}</div>
      <div id="recording-progress-container">
        <div id="recording-progress-bar" style=${progressBarStyle}></div>
      </div>
      <div id="bottom-controls">
        <button id="sequencer-button" @click=${this.toggleSequencer}>BEATGRID</button>
        <play-pause-button .playbackState=${this.playbackState} @click=${this.playPause}></play-pause-button>
        <button
          id="record-button"
          class=${this.recordingState === 'recording' ? 'recording' : ''}
          .disabled=${this.playbackState !== 'playing' && this.recordingState === 'idle'}
          @click=${this.toggleRecording}
          title="Record"
        >
          <svg viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="8"></circle>
          </svg>
        </button>
        <div id="transition-controls">
            <div class="transition-label">Transition:</div>
            <div class="transition-buttons">
                <button class=${classMap({active: this.transitionBars === 2})} @click=${() => this.setTransitionBars(2)}>2</button>
                <button class=${classMap({active: this.transitionBars === 4})} @click=${() => this.setTransitionBars(4)}>4</button>
                <button class=${classMap({active: this.transitionBars === 8})} @click=${() => this.setTransitionBars(8)}>8</button>
                <button class=${classMap({active: this.transitionBars === 16})} @click=${() => this.setTransitionBars(16)}>16</button>
            </div>
        </div>
      </div>
      ${this.isEditorOpen ? html`<audio-editor .audioBlob=${this.recordedAudioBlob} @close=${this.closeEditor}></audio-editor>`: ''}
      ${this.isSequencerOpen ? html`<drum-sequencer .liveMusicHelper=${this.liveMusicHelper} @close=${this.toggleSequencer}></drum-sequencer>`: ''}
      ${this.isApiModalOpen ? html`<api-key-modal @save=${this.handleApiModalSave} @cancel=${this.handleApiModalCancel}></api-key-modal>` : ''}
      `;
  }

  private renderPrompts() {
    return [...this.prompts.values()].map((prompt) => {
      return html`<prompt-controller
        promptId=${prompt.promptId}
        ?filtered=${this.filteredPrompts.has(prompt.text)}
        cc=${prompt.cc}
        text=${prompt.text}
        weight=${prompt.weight}
        color=${prompt.color}
        .midiDispatcher=${this.midiDispatcher}
        .showCC=${this.showMidi}
        audioLevel=${this.audioLevel}
        @prompt-changed=${this.handlePromptChanged}>
      </prompt-controller>`;
    });
  }
}
