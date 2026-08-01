export const CUSTOM_SCENE_MAX_IMAGE_BYTES = 20 * 1024 * 1024;
export const CUSTOM_SCENE_MAX_VIDEO_BYTES = 200 * 1024 * 1024;

const IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

const VIDEO_MIME_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "avif"]);
const VIDEO_EXTENSIONS = new Set(["mp4", "webm", "mov"]);

function fileExtension(name) {
  const match = /\.([^.]+)$/.exec(name.toLowerCase());
  return match?.[1] ?? "";
}

export function customSceneKind(file) {
  const type = file.type.toLowerCase();
  const extension = fileExtension(file.name);
  if (IMAGE_MIME_TYPES.has(type) || (!type && IMAGE_EXTENSIONS.has(extension))) return "image";
  if (VIDEO_MIME_TYPES.has(type) || (!type && VIDEO_EXTENSIONS.has(extension))) return "video";
  return null;
}

export function validateCustomSceneFile(file) {
  const kind = customSceneKind(file);
  if (!kind) return { ok: false, code: "unsupported-type" };
  if (file.size <= 0) return { ok: false, code: "empty-file" };
  if (kind === "image" && file.size > CUSTOM_SCENE_MAX_IMAGE_BYTES) {
    return { ok: false, code: "image-too-large" };
  }
  if (kind === "video" && file.size > CUSTOM_SCENE_MAX_VIDEO_BYTES) {
    return { ok: false, code: "video-too-large" };
  }
  return { ok: true, kind };
}
