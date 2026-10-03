// Browser-computed foreground/background checks, including translucent panels.
// Only rendered metric copy and shared actions are inspected; fixtures never
// contact production. Native canvas resolves Tailwind's OKLCH colour values.
export async function auditWorkspaceContrast(page) {
  return page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    function rgba(value) {
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = value;
      context.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = context.getImageData(0, 0, 1, 1).data;
      return [r, g, b, a / 255];
    }
    const blend = (front, back) => front.slice(0, 3).map((value, i) => value * front[3] + back[i] * (1 - front[3]));
    function background(element) {
      if (!element) return [255, 255, 255];
      return blend(rgba(getComputedStyle(element).backgroundColor), background(element.parentElement));
    }
    function luminance(rgb) {
      const c = rgb.map(value => { const n = value / 255; return n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4; });
      return c[0] * .2126 + c[1] * .7152 + c[2] * .0722;
    }
    const failures = [];
    let checked = 0;
    const selector = '.app-metric-grid :is(p,span,div,h2,h3), .app-metric-card :is(p,span,div), .app-button';
    for (const element of document.querySelectorAll(selector)) {
      if (!element.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) continue;
      if (element.closest('aside,nav,[aria-hidden="true"]') || element.matches(':disabled')) continue;
      if (![...element.childNodes].some(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim())) continue;
      const style = getComputedStyle(element);
      if (Number(style.opacity) < 1) continue; // Hover-only chart labels.
      const bg = background(element);
      const fg = blend(rgba(style.color), bg);
      const a = luminance(fg), b = luminance(bg);
      const ratio = (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
      const large = parseFloat(style.fontSize) >= 24 || (parseFloat(style.fontSize) >= 18.66 && Number(style.fontWeight) >= 700);
      checked++;
      if (ratio < (large ? 3 : 4.5)) failures.push({ text: element.textContent.trim().slice(0, 70), ratio: Number(ratio.toFixed(2)), color: style.color, background: bg.map(Math.round), className: element.className });
    }
    return { checked, failures };
  });
}
