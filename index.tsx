/**
 * @fileoverview Control real time music with a MIDI controller
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { PlaybackState, Prompt, RecordingState, PromptsChangedEventDetail } from './types';
import { GoogleGenAI, LiveMusicFilteredPrompt } from '@google/genai';
import { PromptDjMidi } from './components/PromptDjMidi';
import { ToastMessage } from './components/ToastMessage';
import { LiveMusicHelper } from './utils/LiveMusicHelper';
import { AudioAnalyser } from './utils/AudioAnalyser';
import './components/AudioEditor';
import './components/DrumSequencer';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const model = 'lyria-realtime-exp';

function main() {
  const initialPrompts = buildInitialPrompts();

  const liveMusicHelper = new LiveMusicHelper(ai, model);

  const pdjMidi = new PromptDjMidi(initialPrompts, liveMusicHelper);
  document.body.appendChild(pdjMidi);

  const toastMessage = new ToastMessage();
  document.body.appendChild(toastMessage);

  liveMusicHelper.setWeightedPrompts(initialPrompts);

  const audioAnalyser = new AudioAnalyser(liveMusicHelper.audioContext);
  liveMusicHelper.extraDestination = audioAnalyser.node;

  pdjMidi.addEventListener('prompts-changed', ((e: Event) => {
    const customEvent = e as CustomEvent<PromptsChangedEventDetail>;
    const { prompts, transitionBars } = customEvent.detail;
    liveMusicHelper.setWeightedPrompts(prompts, transitionBars);
  }));

  pdjMidi.addEventListener('play-pause', () => {
    liveMusicHelper.playPause();
  });

  pdjMidi.addEventListener('toggle-recording', () => {
    if (liveMusicHelper.recordingState === 'idle') {
      liveMusicHelper.startRecording();
    } else {
      liveMusicHelper.stopRecording();
    }
  });

  liveMusicHelper.addEventListener('playback-state-changed', ((e: Event) => {
    const customEvent = e as CustomEvent<PlaybackState>;
    const playbackState = customEvent.detail;
    pdjMidi.playbackState = playbackState;
    playbackState === 'playing' ? audioAnalyser.start() : audioAnalyser.stop();
  }));

  liveMusicHelper.addEventListener('recording-state-changed', (e: Event) => {
    const customEvent = e as CustomEvent<RecordingState>;
    pdjMidi.recordingState = customEvent.detail;
  });
  
  liveMusicHelper.addEventListener('recording-finished', (e: Event) => {
      const customEvent = e as CustomEvent<Blob>;
      pdjMidi.showEditor(customEvent.detail);
  });

  liveMusicHelper.addEventListener('filtered-prompt', ((e: Event) => {
    const customEvent = e as CustomEvent<LiveMusicFilteredPrompt>;
    const filteredPrompt = customEvent.detail;
    toastMessage.show(filteredPrompt.filteredReason!)
    pdjMidi.addFilteredPrompt(filteredPrompt.text!);
  }));

  const errorToast = ((e: Event) => {
    const customEvent = e as CustomEvent<string>;
    const error = customEvent.detail;
    toastMessage.show(error);
  });

  liveMusicHelper.addEventListener('error', errorToast);
  pdjMidi.addEventListener('error', errorToast);

  audioAnalyser.addEventListener('audio-level-changed', ((e: Event) => {
    const customEvent = e as CustomEvent<number>;
    const level = customEvent.detail;
    pdjMidi.audioLevel = level;
  }));

}

function buildInitialPrompts() {
  // Pick 3 random prompts to start at weight = 1
  const startOn = [...DEFAULT_PROMPTS]
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);

  const prompts = new Map<string, Prompt>();

  for (let i = 0; i < DEFAULT_PROMPTS.length; i++) {
    const promptId = `prompt-${i}`;
    const prompt = DEFAULT_PROMPTS[i];
    const { text, color } = prompt;
    prompts.set(promptId, {
      promptId,
      text,
      weight: startOn.includes(prompt) ? 1 : 0,
      cc: i,
      color,
    });
  }

  return prompts;
}

const DEFAULT_PROMPTS = [
{ color: '#9900ff', text: 'Glass Bells' },
{ color: '#00ffd9', text: 'Analog Pads' },
{ color: '#ff3355', text: 'Dark Keys' },
{ color: '#ffaa00', text: 'Plucked Guitar ' },
{ color: '#33ff77', text: 'Reso Synth ' },
{ color: '#ff00aa', text: 'Vocal Chops' },
{ color: '#1affff', text: 'Dream Arps' },
{ color: '#d9b2ff', text: 'Muted Bells' },
{ color: '#ffcc00', text: 'Orchestral Hits' },
{ color: '#33ccff', text: 'FM Plucks' },
{ color: '#ff8844', text: 'Reversed Textures' },
{ color: '#66ff33', text: 'Synth Brass' },
{ color: '#cc00ff', text: 'Haunting Choirs' },
{ color: '#ff2277', text: 'Detuned Leads' },
{ color: '#00ff88', text: 'Filtered Strings' },
{ color: '#2222ff', text: 'Sub Pads' },
];

main();