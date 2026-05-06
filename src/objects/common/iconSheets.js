/**
 * UI icon helpers — mirrors the character project's common/iconSheets.js so
 * the type/category/status icon look is consistent across both.
 *
 *   Types      — PNG per type at `{VITE_ASSETS_URL}tileset/ui/types/<name>.png`,
 *                preloaded as `type-<lowercase name>` (18 types, no NONE).
 *   Categories — PNG per category at `{VITE_ASSETS_URL}tileset/ui/categories/<name>.png`,
 *                preloaded as `category-<lowercase name>` (physical / special / status).
 *   Statuses   — spritesheet at src/assets/images/statuses.png, 44×16 per frame,
 *                7 frames. Preloaded as `statuses`.
 *                Frame order (top→bottom): SLP · PSN · BRN · PAR · FRZ · FNT · PKRS.
 */

export const STATUS_FRAMES = {
  SLEEP:     0,
  POISONED:  1,
  BURNED:    2,
  PARALYZED: 3,
  FROZEN:    4,
  FAINTED:   5,
  TOXIC:     1,   // no dedicated toxic icon — share PSN
  PKRS:      6,
};

const STATUS_SCALE = 0.8;

export const TYPE_ICON_W     = 24;
export const TYPE_ICON_H     = 24;
export const STATUS_ICON_W   = 44 * STATUS_SCALE;
export const STATUS_ICON_H   = 16 * STATUS_SCALE;
export const CATEGORY_ICON_W = 24;
export const CATEGORY_ICON_H = 24;

/** Make a type icon Image at (x, y). Top-left origin by default. */
export function makeTypeIcon(scene, x, y, typeKey, opts = {}) {
  const key = `type-${String(typeKey ?? '').toLowerCase()}`;
  if (!scene.textures.exists(key)) return null;
  return _makeIcon(scene, x, y, key, null, opts);
}

/** Make a status icon Image. Returns null if the status key isn't known. */
export function makeStatusIcon(scene, x, y, statusKey, opts = {}) {
  const frame = STATUS_FRAMES[String(statusKey ?? '').toUpperCase()];
  if (frame == null) return null;
  return _makeIcon(scene, x, y, 'statuses', frame, { scale: STATUS_SCALE, ...opts });
}

/** Make a move-category icon. categoryKey: 'PHYSICAL' | 'SPECIAL' | 'STATUS'. */
export function makeCategoryIcon(scene, x, y, categoryKey, opts = {}) {
  const key = `category-${String(categoryKey ?? '').toLowerCase()}`;
  if (!scene.textures.exists(key)) return null;
  return _makeIcon(scene, x, y, key, null, opts);
}

function _makeIcon(scene, x, y, key, frame, opts) {
  const { scale = 1, origin = [0, 0] } = opts;
  const img = frame == null ? scene.add.image(x, y, key) : scene.add.image(x, y, key, frame);
  img.setOrigin(origin[0], origin[1]);
  if (scale !== 1) img.setScale(scale);
  return img;
}
