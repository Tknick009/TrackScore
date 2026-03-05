/**
 * Logo effect definitions and helper utilities.
 * Used by display templates to animate the meet logo.
 */

import type { CSSProperties } from "react";

export const LOGO_EFFECTS = [
  { value: 'none', label: 'None', description: 'No animation' },
  { value: 'pulse', label: 'Pulse', description: 'Gentle scale pulse' },
  { value: 'glow', label: 'Glow', description: 'Glowing drop-shadow' },
  { value: 'shimmer', label: 'Shimmer', description: 'Shimmering highlight sweep' },
  { value: 'bounce', label: 'Bounce', description: 'Soft vertical bounce' },
  { value: 'spin', label: 'Spin', description: 'Slow continuous rotation' },
  { value: 'fade-in-out', label: 'Fade In/Out', description: 'Opacity fade cycle' },
] as const;

export type LogoEffect = (typeof LOGO_EFFECTS)[number]['value'];

/** CSS keyframes injected once into the document head */
const KEYFRAMES_CSS = `
@keyframes logo-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.06); }
}
@keyframes logo-glow {
  0%, 100% { filter: drop-shadow(0 0 4px rgba(255,215,0,0.3)); }
  50% { filter: drop-shadow(0 0 18px rgba(255,215,0,0.85)); }
}
@keyframes logo-shimmer {
  0% { filter: brightness(1); }
  50% { filter: brightness(1.35); }
  100% { filter: brightness(1); }
}
@keyframes logo-bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}
@keyframes logo-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
@keyframes logo-fade-in-out {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
`;

let injected = false;

function ensureKeyframes() {
  if (injected || typeof document === 'undefined') return;
  const style = document.createElement('style');
  style.textContent = KEYFRAMES_CSS;
  document.head.appendChild(style);
  injected = true;
}

/** Map effect name to its CSS animation value */
const ANIMATION_MAP: Record<string, string> = {
  pulse: 'logo-pulse 2s ease-in-out infinite',
  glow: 'logo-glow 2.5s ease-in-out infinite',
  shimmer: 'logo-shimmer 3s ease-in-out infinite',
  bounce: 'logo-bounce 2s ease-in-out infinite',
  spin: 'logo-spin 8s linear infinite',
  'fade-in-out': 'logo-fade-in-out 3s ease-in-out infinite',
};

/**
 * Returns an inline style object for the given logo effect.
 * Call this and spread onto the logo `<img>` element's `style` prop.
 *
 * Example:
 *   <img style={getLogoEffectStyle(meet?.logoEffect)} ... />
 */
export function getLogoEffectStyle(effect?: string | null): CSSProperties {
  if (!effect || effect === 'none') return {};
  ensureKeyframes();
  const animation = ANIMATION_MAP[effect];
  if (!animation) return {};
  return { animation };
}
