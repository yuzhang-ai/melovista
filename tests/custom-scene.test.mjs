import assert from "node:assert/strict";
import test from "node:test";

import {
  CUSTOM_SCENE_MAX_IMAGE_BYTES,
  CUSTOM_SCENE_MAX_VIDEO_BYTES,
  customSceneKind,
  validateCustomSceneFile,
} from "../app/custom-scene.mjs";

function file(name, type, size) {
  return { name, type, size };
}

test("recognizes supported local image and video window files", () => {
  assert.equal(customSceneKind(file("window.jpg", "image/jpeg", 10)), "image");
  assert.equal(customSceneKind(file("window.avif", "image/avif", 10)), "image");
  assert.equal(customSceneKind(file("window.mp4", "video/mp4", 10)), "video");
  assert.equal(customSceneKind(file("window.mov", "video/quicktime", 10)), "video");
  assert.equal(customSceneKind(file("window.webm", "", 10)), "video");
  assert.equal(customSceneKind(file("window.svg", "image/svg+xml", 10)), null);
});

test("rejects empty, unsupported and oversized custom window files", () => {
  assert.deepEqual(validateCustomSceneFile(file("window.txt", "text/plain", 10)), { ok: false, code: "unsupported-type" });
  assert.deepEqual(validateCustomSceneFile(file("window.jpg", "image/jpeg", 0)), { ok: false, code: "empty-file" });
  assert.deepEqual(
    validateCustomSceneFile(file("window.jpg", "image/jpeg", CUSTOM_SCENE_MAX_IMAGE_BYTES + 1)),
    { ok: false, code: "image-too-large" },
  );
  assert.deepEqual(
    validateCustomSceneFile(file("window.mp4", "video/mp4", CUSTOM_SCENE_MAX_VIDEO_BYTES + 1)),
    { ok: false, code: "video-too-large" },
  );
});

test("accepts custom window files at the documented size limits", () => {
  assert.deepEqual(
    validateCustomSceneFile(file("window.webp", "image/webp", CUSTOM_SCENE_MAX_IMAGE_BYTES)),
    { ok: true, kind: "image" },
  );
  assert.deepEqual(
    validateCustomSceneFile(file("window.mp4", "video/mp4", CUSTOM_SCENE_MAX_VIDEO_BYTES)),
    { ok: true, kind: "video" },
  );
});
