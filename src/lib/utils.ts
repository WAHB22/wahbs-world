import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ['2xs', 'hero'],
      color: [
        'paper', 'paper-2', 'surface', 'hero-bg', 'hero-ink', 'hero-soft', 'ink', 'ink-strong', 'ink-soft', 'ink-mute', 'rule', 'rule-soft',
        'cobalt', 'cobalt-press', 'on-cobalt', 'cobalt-wash', 'aegean', 'aegean-wash', 'kiln', 'kiln-wash',
        'laurel', 'laurel-wash', 'vase', 'vase-wash', 'bar-track', 'bar-none', 'fill-green', 'fill-orange',
        'fill-red', 'scrim',
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
