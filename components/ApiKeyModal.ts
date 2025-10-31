/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { css, html, LitElement } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { ApiKeyStorage } from '../utils/ApiKeyStorage';

const MIN_API_KEY_LENGTH = 20; // Minimum length for API key validation

/**
 * Modal for entering and managing Google Gemini API key
 */
@customElement('api-key-modal')
export class ApiKeyModal extends LitElement {
  static override styles = css`
    :host {
      display: block;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 1000;
    }

    #overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.85);
      backdrop-filter: blur(4px);
    }

    #modal {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #1a1a1a;
      border: 2px solid #333;
      border-radius: 12px;
      padding: 30px;
      min-width: 400px;
      max-width: 90vw;
      box-shadow: 
        0 20px 60px rgba(0, 0, 0, 0.5),
        inset 0 1px 0 rgba(255, 255, 255, 0.1);
    }

    h2 {
      margin: 0 0 20px 0;
      color: #fff;
      font-size: 24px;
      font-weight: 600;
    }

    p {
      margin: 0 0 20px 0;
      color: #aaa;
      font-size: 14px;
      line-height: 1.5;
    }

    a {
      color: #9900ff;
      text-decoration: none;
    }

    a:hover {
      text-decoration: underline;
    }

    #input-container {
      margin-bottom: 20px;
    }

    label {
      display: block;
      margin-bottom: 8px;
      color: #ccc;
      font-size: 14px;
      font-weight: 500;
    }

    input {
      width: 100%;
      padding: 12px;
      background: #111;
      border: 1.5px solid #444;
      border-radius: 6px;
      color: #fff;
      font-family: monospace;
      font-size: 14px;
      box-sizing: border-box;
      transition: border-color 0.2s;
    }

    input:focus {
      outline: none;
      border-color: #9900ff;
    }

    input::placeholder {
      color: #666;
    }

    #button-container {
      display: flex;
      gap: 10px;
      justify-content: flex-end;
    }

    button {
      padding: 10px 20px;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    #cancel-button {
      background: #333;
      color: #fff;
    }

    #cancel-button:hover {
      background: #444;
    }

    #save-button {
      background: #9900ff;
      color: #fff;
    }

    #save-button:hover {
      background: #aa11ff;
    }

    #save-button:disabled {
      background: #555;
      cursor: not-allowed;
      opacity: 0.5;
    }

    #error-message {
      color: #ff3355;
      font-size: 13px;
      margin-top: 10px;
      min-height: 20px;
    }

    .info-box {
      background: rgba(153, 0, 255, 0.1);
      border: 1px solid rgba(153, 0, 255, 0.3);
      border-radius: 6px;
      padding: 12px;
      margin-bottom: 20px;
      font-size: 13px;
      color: #ccc;
    }

    .info-box strong {
      color: #9900ff;
    }
  `;

  @state() private apiKey = '';
  @state() private errorMessage = '';
  @state() private isSaving = false;

  private handleOverlayClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      this.handleCancel();
    }
  }

  private handleCancel() {
    this.dispatchEvent(new CustomEvent('cancel'));
  }

  private async handleSave() {
    if (!this.apiKey.trim()) {
      this.errorMessage = 'Please enter an API key';
      return;
    }

    // Basic validation - check minimum length
    if (this.apiKey.trim().length < MIN_API_KEY_LENGTH) {
      this.errorMessage = 'API key seems too short. Please check and try again.';
      return;
    }

    this.isSaving = true;
    this.errorMessage = '';

    try {
      await ApiKeyStorage.storeApiKey(this.apiKey.trim());
      this.dispatchEvent(new CustomEvent('save', {
        detail: { apiKey: this.apiKey.trim() }
      }));
    } catch (e) {
      this.errorMessage = 'Failed to save API key: ' + (e as Error).message;
      this.isSaving = false;
    }
  }

  private handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !this.isSaving && this.apiKey.trim()) {
      this.handleSave();
    } else if (e.key === 'Escape') {
      this.handleCancel();
    }
  }

  override render() {
    return html`
      <div id="overlay" @click=${this.handleOverlayClick}>
        <div id="modal">
          <h2>Google Gemini API Key Required</h2>
          
          <p>
            This application requires a Google Gemini API key to generate music.
            Get your API key from the 
            <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">
              Google AI Studio
            </a>.
          </p>

          <div class="info-box">
            <strong>Security:</strong> Your API key will be encrypted and stored locally 
            in your browser. It will automatically expire after 24 hours.
          </div>

          <div id="input-container">
            <label for="api-key-input">API Key</label>
            <input
              id="api-key-input"
              type="password"
              placeholder="AIza..."
              .value=${this.apiKey}
              @input=${(e: Event) => {
                this.apiKey = (e.target as HTMLInputElement).value;
                this.errorMessage = '';
              }}
              @keydown=${this.handleKeyDown}
              ?disabled=${this.isSaving}
            />
            <div id="error-message">${this.errorMessage}</div>
          </div>

          <div id="button-container">
            <button
              id="cancel-button"
              @click=${this.handleCancel}
              ?disabled=${this.isSaving}
            >
              Cancel
            </button>
            <button
              id="save-button"
              @click=${this.handleSave}
              ?disabled=${this.isSaving || !this.apiKey.trim()}
            >
              ${this.isSaving ? 'Saving...' : 'Save & Continue'}
            </button>
          </div>
        </div>
      </div>
    `;
  }
}
