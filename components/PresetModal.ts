/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { css, html, LitElement } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { ALL_PRESETS, type Preset } from '../utils/presets';

/**
 * Modal for selecting music presets
 */
@customElement('preset-modal')
export class PresetModal extends LitElement {
  static override styles = css`
    :host {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      backdrop-filter: blur(5px);
      animation: fadeIn 0.2s ease-out;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    .overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
    }

    .modal {
      position: relative;
      background: #1a1a1a;
      border-radius: 12px;
      padding: 30px;
      max-width: 600px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
      border: 1px solid #333;
      animation: slideUp 0.3s ease-out;
    }

    @keyframes slideUp {
      from {
        transform: translateY(30px);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    h2 {
      margin: 0;
      color: #fff;
      font-size: 24px;
      font-weight: 600;
    }

    .close-button {
      background: transparent;
      border: none;
      color: #999;
      font-size: 28px;
      cursor: pointer;
      padding: 0;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: all 0.2s;
    }

    .close-button:hover {
      background: #333;
      color: #fff;
    }

    .password-section {
      margin-bottom: 20px;
    }

    .password-input-container {
      display: flex;
      gap: 10px;
      margin-top: 10px;
    }

    input[type="password"] {
      flex: 1;
      padding: 12px;
      background: #222;
      border: 2px solid #444;
      border-radius: 6px;
      color: #fff;
      font-size: 16px;
      outline: none;
      transition: border-color 0.2s;
    }

    input[type="password"]:focus {
      border-color: #9900ff;
    }

    .unlock-button {
      padding: 12px 24px;
      background: #9900ff;
      border: none;
      border-radius: 6px;
      color: #fff;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .unlock-button:hover {
      background: #aa11ff;
    }

    .unlock-button:active {
      transform: scale(0.98);
    }

    .error-message {
      color: #ff4757;
      margin-top: 10px;
      font-size: 14px;
    }

    .preset-list {
      display: grid;
      gap: 12px;
    }

    .preset-item {
      background: #222;
      border: 2px solid #333;
      border-radius: 8px;
      padding: 16px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .preset-item:hover {
      border-color: #9900ff;
      background: #282828;
      transform: translateX(4px);
    }

    .preset-name {
      color: #fff;
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 6px;
    }

    .preset-description {
      color: #999;
      font-size: 14px;
      line-height: 1.4;
    }

    .locked-message {
      text-align: center;
      color: #999;
      padding: 40px 20px;
      font-size: 16px;
    }

    .locked-message p {
      margin: 0 0 20px 0;
    }

    .hint {
      color: #666;
      font-size: 14px;
      font-style: italic;
    }

    /* Custom scrollbar */
    .modal::-webkit-scrollbar {
      width: 8px;
    }

    .modal::-webkit-scrollbar-track {
      background: #1a1a1a;
    }

    .modal::-webkit-scrollbar-thumb {
      background: #444;
      border-radius: 4px;
    }

    .modal::-webkit-scrollbar-thumb:hover {
      background: #555;
    }
  `;

  @state() private isUnlocked = false;
  @state() private passwordError = '';
  @property({ type: Boolean }) private requirePassword = false;

  private readonly correctPassword = 'rubberbandman';

  private handleOverlayClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      this.close();
    }
  }

  private close() {
    this.dispatchEvent(new CustomEvent('close'));
  }

  private handlePasswordSubmit(e?: Event) {
    e?.preventDefault();
    const input = this.shadowRoot?.querySelector('input[type="password"]') as HTMLInputElement;
    const password = input?.value || '';

    if (password === this.correctPassword) {
      this.isUnlocked = true;
      this.passwordError = '';
    } else {
      this.passwordError = 'Incorrect password. Try again.';
      input.value = '';
    }
  }

  private handlePasswordKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      this.handlePasswordSubmit();
    }
  }

  private selectPreset(presetId: string) {
    const preset = ALL_PRESETS[presetId];
    if (preset) {
      this.dispatchEvent(new CustomEvent('preset-selected', {
        detail: { presetId, preset },
      }));
      this.close();
    }
  }

  override render() {
    const showPresets = !this.requirePassword || this.isUnlocked;

    return html`
      <div class="overlay" @click=${this.handleOverlayClick}>
        <div class="modal" @click=${(e: Event) => e.stopPropagation()}>
          <div class="modal-header">
            <h2>Regional Presets</h2>
            <button class="close-button" @click=${this.close}>&times;</button>
          </div>

          ${!showPresets ? this.renderPasswordSection() : this.renderPresetList()}
        </div>
      </div>
    `;
  }

  private renderPasswordSection() {
    return html`
      <div class="password-section">
        <div class="locked-message">
          <p>🔒 This section is password-protected</p>
          <p class="hint">Enter the password to access exclusive regional presets</p>
        </div>
        <div class="password-input-container">
          <input
            type="password"
            placeholder="Enter password..."
            @keydown=${this.handlePasswordKeydown}
            autofocus
          />
          <button class="unlock-button" @click=${this.handlePasswordSubmit}>
            Unlock
          </button>
        </div>
        ${this.passwordError ? html`<div class="error-message">${this.passwordError}</div>` : ''}
      </div>
    `;
  }

  private renderPresetList() {
    return html`
      <div class="preset-list">
        ${Object.entries(ALL_PRESETS).map(([id, preset]) => html`
          <div class="preset-item" @click=${() => this.selectPreset(id)}>
            <div class="preset-name">${preset.name}</div>
            <div class="preset-description">${preset.description}</div>
          </div>
        `)}
      </div>
    `;
  }
}
