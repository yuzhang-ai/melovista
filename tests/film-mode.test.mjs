import assert from "node:assert/strict";
import test from "node:test";

import {
  DANDELION_SEED_VARIANTS,
  FILM_DEFAULT_SCENE,
  dandelionSeedDataUri,
  dandelionSeedSvg,
  parseFilmOptions,
} from "../app/film-mode.mjs";

test("film view only turns on with mode=film and falls back to the dusk window", () => {
  assert.deepEqual(parseFilmOptions(""), { enabled: false, scene: null });
  assert.deepEqual(parseFilmOptions("?lang=zh"), { enabled: false, scene: null });
  assert.deepEqual(parseFilmOptions("?mode=film"), { enabled: true, scene: FILM_DEFAULT_SCENE });
  assert.deepEqual(parseFilmOptions("?mode=film&scene=rain"), { enabled: true, scene: "rain" });
  assert.deepEqual(parseFilmOptions("?mode=film&scene=unknown"), { enabled: true, scene: FILM_DEFAULT_SCENE });
});

test("dandelion seed variants are deterministic, distinct and CSS-safe", () => {
  const variants = Array.from({ length: DANDELION_SEED_VARIANTS }, (_, index) => dandelionSeedSvg(index));
  assert.equal(new Set(variants).size, DANDELION_SEED_VARIANTS);
  assert.equal(dandelionSeedSvg(1), variants[1]);
  variants.forEach((svg) => {
    assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 64 72">/);
    assert.match(svg, /<\/svg>$/);
    assert.doesNotMatch(svg, /NaN|undefined/);
  });
  const uri = dandelionSeedDataUri(0);
  assert.match(uri, /^url\("data:image\/svg\+xml,/);
  assert.doesNotMatch(uri.slice(5, -2), /["\s]/);
});
