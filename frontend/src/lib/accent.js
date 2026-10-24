const STYLE_ELEMENT_ID = 'site-accent-color';

/**
 * Parses `#rgb` or `#rrggbb` into an `r g b` triplet for the CSS custom
 * properties the Tailwind palette is built from. Returns `null` for anything
 * that is not a valid hex colour so the caller can keep the built-in palette.
 */
export function hexToRgbTriplet(hex) {
  const value = String(hex ?? '').trim().replace(/^#/, '');
  const expanded =
    value.length === 3
      ? value
          .split('')
          .map((character) => character + character)
          .join('')
      : value;

  if (!/^[0-9a-fA-F]{6}$/.test(expanded)) return null;

  const red = parseInt(expanded.slice(0, 2), 16);
  const green = parseInt(expanded.slice(2, 4), 16);
  const blue = parseInt(expanded.slice(4, 6), 16);
  return `${red} ${green} ${blue}`;
}

/** Mixes a colour towards white by `amount` (0-1). */
function lighten(triplet, amount) {
  const [red, green, blue] = triplet.split(' ').map(Number);
  const mix = (channel) => Math.round(channel + (255 - channel) * amount);
  return `${mix(red)} ${mix(green)} ${mix(blue)}`;
}

/**
 * Applies the operator-configured accent colour to the primary palette in both
 * themes. The value is written into a single managed `<style>` element so the
 * dark theme keeps its lighter tint without the React tree re-rendering on a
 * theme switch.
 */
export function applyAccentColor(hex) {
  if (typeof document === 'undefined') return;

  const triplet = hexToRgbTriplet(hex);
  let element = document.getElementById(STYLE_ELEMENT_ID);

  if (!triplet) {
    element?.remove();
    return;
  }

  if (!element) {
    element = document.createElement('style');
    element.id = STYLE_ELEMENT_ID;
    document.head.appendChild(element);
  }

  element.textContent = [
    `:root { --color-primary: ${triplet}; }`,
    `.dark { --color-primary: ${lighten(triplet, 0.35)}; }`,
  ].join('\n');
}

export default applyAccentColor;
