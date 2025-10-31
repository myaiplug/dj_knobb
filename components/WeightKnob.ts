/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { css, html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';

/** Maps prompt weight to halo size. */
const MIN_HALO_SCALE = 1;
const MAX_HALO_SCALE = 2;

/** The amount of scale to add to the halo based on audio level. */
const HALO_LEVEL_MODIFIER = 1;

/** A knob for adjusting and visualizing prompt weight. */
@customElement('weight-knob')
// FIX: The `WeightKnob` class must extend `LitElement` to be a valid custom element.
// Fix: Added 'extends LitElement' to the class definition.
export class WeightKnob extends LitElement {
  static override styles = css`
    :host {
      cursor: grab;
      position: relative;
      width: 100%;
      aspect-ratio: 1;
      flex-shrink: 0;
      touch-action: none;
    }
    svg {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
    }
    #halo {
      position: absolute;
      z-index: -1;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      mix-blend-mode: lighten;
      transform: scale(2);
      will-change: transform;
      filter: blur(20px);
      opacity: 0.7;
    }
  `;

  @property({ type: Number }) value = 0;
  @property({ type: String }) color = '#000';
  @property({ type: Number }) audioLevel = 0;

  private dragStartPos = 0;
  private dragStartValue = 0;

  constructor() {
    super();
    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handlePointerUp = this.handlePointerUp.bind(this);
  }

  private handlePointerDown(e: PointerEvent) {
    e.preventDefault();
    this.dragStartPos = e.clientY;
    this.dragStartValue = this.value;
    document.body.classList.add('dragging');
    window.addEventListener('pointermove', this.handlePointerMove);
    window.addEventListener('pointerup', this.handlePointerUp);
  }

  private handlePointerMove(e: PointerEvent) {
    const delta = this.dragStartPos - e.clientY;
    this.value = this.dragStartValue + delta * 0.01;
    this.value = Math.max(0, Math.min(2, this.value));
    this.dispatchEvent(new CustomEvent<number>('input', { detail: this.value }));
  }

  private handlePointerUp() {
    window.removeEventListener('pointermove', this.handlePointerMove);
    window.removeEventListener('pointerup', this.handlePointerUp);
    document.body.classList.remove('dragging');
  }

  private handleWheel(e: WheelEvent) {
    const delta = e.deltaY;
    this.value = this.value + delta * -0.0025;
    this.value = Math.max(0, Math.min(2, this.value));
    this.dispatchEvent(new CustomEvent<number>('input', { detail: this.value }));
  }

  private describeArc(
    centerX: number,
    centerY: number,
    startAngle: number,
    endAngle: number,
    radius: number,
  ): string {
    const startX = centerX + radius * Math.cos(startAngle);
    const startY = centerY + radius * Math.sin(startAngle);
    const endX = centerX + radius * Math.cos(endAngle);
    const endY = centerY + radius * Math.sin(endAngle);

    const largeArcFlag = endAngle - startAngle <= Math.PI ? '0' : '1';

    return (
      `M ${startX} ${startY}` +
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`
    );
  }

  override render() {
    const rotationRange = Math.PI * 2 * 0.75;
    const minRot = -rotationRange / 2 - Math.PI / 2;
    const maxRot = rotationRange / 2 - Math.PI / 2;
    const rot = minRot + (this.value / 2) * (maxRot - minRot);
    const dotStyle = styleMap({
      transform: `translate(40px, 40px) rotate(${rot}rad)`,
    });

    let scale = (this.value / 2) * (MAX_HALO_SCALE - MIN_HALO_SCALE);
    scale += MIN_HALO_SCALE;
    scale += this.audioLevel * HALO_LEVEL_MODIFIER;

    const haloStyle = styleMap({
      display: this.value > 0 ? 'block' : 'none',
      background: this.color,
      transform: `scale(${scale})`,
    });

    return html`
      <div id="halo" style=${haloStyle}></div>
      <!-- Static SVG elements -->
      ${this.renderStaticSvg()}
      <!-- SVG elements that move, separated to limit redraws -->
      <svg
        viewBox="0 0 80 80"
        @pointerdown=${this.handlePointerDown}
        @wheel=${this.handleWheel}>
        <!-- Pointer indicator with 3D effect -->
        <g style=${dotStyle}>
          <!-- Shadow for pointer -->
          <ellipse cx="14" cy="1" rx="2.5" ry="2" fill="#00000066" />
          <!-- Main pointer body -->
          <circle cx="14" cy="0" r="2.2" fill="url(#pointerGradient)" />
          <!-- Highlight on pointer -->
          <ellipse cx="13.5" cy="-0.5" rx="1.2" ry="1" fill="#ffffff88" />
        </g>
        <!-- Track background arc with inset shadow -->
        <path
          d=${this.describeArc(40, 40, minRot, maxRot, 34.5)}
          fill="none"
          stroke="url(#trackBackground)"
          stroke-width="3.5"
          stroke-linecap="round" />
        <!-- Active value arc with gradient -->
        <path
          d=${this.describeArc(40, 40, minRot, rot, 34.5)}
          fill="none"
          stroke="url(#trackActive)"
          stroke-width="3.5"
          stroke-linecap="round"
          filter="url(#activeGlow)" />
        <defs>
          <!-- Pointer gradient -->
          <radialGradient id="pointerGradient">
            <stop offset="0%" stop-color="#ffffff" />
            <stop offset="70%" stop-color="#e0e0e0" />
            <stop offset="100%" stop-color="#b0b0b0" />
          </radialGradient>
          <!-- Track background gradient for depth -->
          <linearGradient id="trackBackground" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#1a1a1a" />
            <stop offset="50%" stop-color="#2a2a2a" />
            <stop offset="100%" stop-color="#1a1a1a" />
          </linearGradient>
          <!-- Active track gradient -->
          <linearGradient id="trackActive" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#ffffff" />
            <stop offset="50%" stop-color="#f0f0f0" />
            <stop offset="100%" stop-color="#e0e0e0" />
          </linearGradient>
          <!-- Glow effect for active arc -->
          <filter id="activeGlow">
            <feGaussianBlur stdDeviation="0.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
      </svg>
    `;
  }
  
  private renderStaticSvg() { 
    return html`<svg viewBox="0 0 80 80" style="pointer-events: none;">
        <!-- Outer shadow ring for depth -->
        <ellipse
          opacity="0.6"
          cx="40"
          cy="40"
          rx="40"
          ry="40"
          fill="url(#outerShadow)" />
        
        <!-- Base bezel with metallic gradient -->
        <g filter="url(#bezelShadow)">
          <ellipse cx="40" cy="40" rx="31" ry="31" fill="url(#bezelGradient)" />
        </g>
        
        <!-- Inner bezel ring with specular highlight -->
        <ellipse cx="40" cy="40" rx="29" ry="29" fill="url(#innerBezelGradient)" />
        
        <!-- Main knob body with deep shadows -->
        <g filter="url(#knobShadow)">
          <circle cx="40" cy="40" r="22" fill="url(#knobBody)" />
        </g>
        
        <!-- Knob highlight for 3D effect -->
        <ellipse cx="40" cy="35" rx="18" ry="16" fill="url(#knobHighlight)" opacity="0.8" />
        
        <!-- Top surface with metallic finish -->
        <circle cx="40" cy="40" r="18" fill="url(#topSurface)" />
        
        <!-- Edge highlight ring -->
        <circle cx="40" cy="40" r="18.5" fill="none" stroke="url(#edgeHighlight)" stroke-width="0.5" opacity="0.6" />
        
        <!-- Subtle texture overlay -->
        <circle cx="40" cy="40" r="17" fill="url(#textureOverlay)" opacity="0.15" />
        
        <defs>
          <!-- Outer shadow gradient -->
          <radialGradient id="outerShadow">
            <stop offset="0.7" stop-color="#000" stop-opacity="0" />
            <stop offset="0.85" stop-color="#000" stop-opacity="0.3" />
            <stop offset="1" stop-color="#000" stop-opacity="0.6" />
          </radialGradient>
          
          <!-- Bezel shadow filter -->
          <filter id="bezelShadow" x="5" y="7" width="70" height="70">
            <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
            <feOffset dx="0" dy="2" result="offsetblur" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.5" />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          
          <!-- Bezel metallic gradient -->
          <linearGradient id="bezelGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#3a3a3a" />
            <stop offset="30%" stop-color="#5a5a5a" />
            <stop offset="60%" stop-color="#2a2a2a" />
            <stop offset="100%" stop-color="#1a1a1a" />
          </linearGradient>
          
          <!-- Inner bezel with highlights -->
          <linearGradient id="innerBezelGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#4a4a4a" />
            <stop offset="50%" stop-color="#6a6a6a" />
            <stop offset="100%" stop-color="#3a3a3a" />
          </linearGradient>
          
          <!-- Knob shadow filter - deeper and more realistic -->
          <filter id="knobShadow" x="8" y="12" width="64" height="68">
            <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
            <feOffset dx="0" dy="4" result="offsetblur" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.6" />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          
          <!-- Main knob body gradient - metallic aluminum look -->
          <linearGradient id="knobBody" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#d0d0d0" />
            <stop offset="25%" stop-color="#f5f5f5" />
            <stop offset="50%" stop-color="#e8e8e8" />
            <stop offset="75%" stop-color="#c0c0c0" />
            <stop offset="100%" stop-color="#a8a8a8" />
          </linearGradient>
          
          <!-- Knob highlight for 3D depth -->
          <radialGradient id="knobHighlight">
            <stop offset="0%" stop-color="#ffffff" stop-opacity="0.9" />
            <stop offset="60%" stop-color="#ffffff" stop-opacity="0.3" />
            <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
          </radialGradient>
          
          <!-- Top surface with brushed metal effect -->
          <radialGradient id="topSurface" cx="45%" cy="40%">
            <stop offset="0%" stop-color="#f8f8f8" />
            <stop offset="40%" stop-color="#e5e5e5" />
            <stop offset="70%" stop-color="#d5d5d5" />
            <stop offset="100%" stop-color="#c5c5c5" />
          </radialGradient>
          
          <!-- Edge highlight -->
          <linearGradient id="edgeHighlight" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#ffffff" />
            <stop offset="50%" stop-color="#888888" />
            <stop offset="100%" stop-color="#ffffff" />
          </linearGradient>
          
          <!-- Subtle texture overlay -->
          <radialGradient id="textureOverlay">
            <stop offset="0%" stop-color="#ffffff" />
            <stop offset="100%" stop-color="#000000" />
          </radialGradient>
        </defs>
      </svg>`
  }

}

declare global {
  interface HTMLElementTagNameMap {
    'weight-knob': WeightKnob;
  }
}
