export const FILM_SCENE_IDS = ["coast", "forest", "rain", "stars"];
export const FILM_DEFAULT_SCENE = "stars";
export const DANDELION_SEED_VARIANTS = 3;

export function parseFilmOptions(search) {
  const params = new URLSearchParams(search);
  if (params.get("mode") !== "film") return { enabled: false, scene: null };
  const requested = params.get("scene");
  return {
    enabled: true,
    scene: FILM_SCENE_IDS.includes(requested) ? requested : FILM_DEFAULT_SCENE,
  };
}

function seededRandom(seed) {
  let state = (seed + 1) * 2654435761 % 4294967296;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

const round = (value) => Math.round(value * 100) / 100;

// Side view of a single seed: a parasol of fine bristles above a long beak and a small achene.
export function dandelionSeedSvg(variant = 0) {
  const random = seededRandom(variant);
  const cx = 32;
  const cy = 22;
  const bristles = 26 + variant * 3;
  const strands = [];
  const tips = [];

  for (let index = 0; index < bristles; index += 1) {
    const spread = (index + 0.5) / bristles;
    const angle = (-172 + spread * 164 + (random() - 0.5) * 7) * (Math.PI / 180);
    const length = 13.5 + random() * 4.5 - Math.abs(spread - 0.5) * 3;
    const tipX = cx + Math.cos(angle) * length;
    const tipY = cy + Math.sin(angle) * length;
    const bendX = cx + Math.cos(angle) * length * 0.55;
    const bendY = cy + Math.sin(angle) * length * 0.55 - 1.4;
    const opacity = round(0.5 + random() * 0.45);
    strands.push(`<path d="M${cx} ${cy}Q${round(bendX)} ${round(bendY)} ${round(tipX)} ${round(tipY)}" stroke-opacity="${opacity}"/>`);
    tips.push(`<circle cx="${round(tipX)}" cy="${round(tipY)}" r="${round(0.45 + random() * 0.4)}" fill-opacity="${opacity}"/>`);
  }

  return [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 72">',
    '<defs><radialGradient id="h" cx="50%" cy="60%" r="50%"><stop offset="0" stop-color="#fffdf4" stop-opacity=".42"/><stop offset="1" stop-color="#fffdf4" stop-opacity="0"/></radialGradient></defs>',
    `<ellipse cx="${cx}" cy="${cy - 5}" rx="19" ry="13" fill="url(#h)"/>`,
    `<g fill="none" stroke="#fffdf4" stroke-width=".55" stroke-linecap="round">${strands.join("")}</g>`,
    `<g fill="#fffdf4">${tips.join("")}</g>`,
    `<path d="M${cx} ${cy}C${cx + 0.6} 34 ${cx - 0.5} 42 ${cx} 52" fill="none" stroke="#f6eedb" stroke-width=".8" stroke-linecap="round"/>`,
    `<circle cx="${cx}" cy="${cy}" r="1.1" fill="#fffdf4"/>`,
    `<ellipse cx="${cx}" cy="57" rx="1.7" ry="5.2" fill="#d9c49a"/>`,
    "</svg>",
  ].join("");
}

export function dandelionSeedDataUri(variant = 0) {
  return `url("data:image/svg+xml,${encodeURIComponent(dandelionSeedSvg(variant))}")`;
}
