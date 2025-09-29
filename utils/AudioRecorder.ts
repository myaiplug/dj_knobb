/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
export class AudioRecorder extends EventTarget {
  private sourceNode: AudioNode;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private timeoutId: number | null = null;
  private destination: MediaStreamAudioDestinationNode | null = null;

  public static readonly MAX_DURATION = 210 * 1000; // 3:30 in milliseconds

  constructor(sourceNode: AudioNode) {
    super();
    this.sourceNode = sourceNode;
  }

  start(duration: number = AudioRecorder.MAX_DURATION) {
    if (this.mediaRecorder?.state === 'recording') {
      console.warn('Already recording.');
      return;
    }

    this.destination = (this.sourceNode.context as AudioContext).createMediaStreamDestination();
    this.sourceNode.connect(this.destination);
    
    // Choose a MIME type. 'audio/webm;codecs=opus' is widely supported and efficient.
    const options = { mimeType: 'audio/webm;codecs=opus' };
    this.mediaRecorder = new MediaRecorder(this.destination.stream, options);
    
    this.recordedChunks = [];

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.recordedChunks.push(event.data);
      }
    };

    this.mediaRecorder.onstop = () => {
      const audioBlob = new Blob(this.recordedChunks, { type: options.mimeType });
      this.dispatchEvent(new CustomEvent('finished', { detail: audioBlob }));
      // Disconnect to avoid memory leaks
      if (this.destination) {
        this.sourceNode.disconnect(this.destination);
      }
    };
    
    this.mediaRecorder.start();
    
    this.timeoutId = window.setTimeout(() => {
      this.stop();
    }, duration);
  }

  stop() {
    if (this.mediaRecorder?.state === 'recording') {
      this.mediaRecorder.stop();
    }
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }
}