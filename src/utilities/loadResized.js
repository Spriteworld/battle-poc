/**
 * Loads an image, downscales it onto a canvas at the target dimensions using
 * high-quality smoothing, and registers the canvas as a Phaser texture under
 * `key`.  The temporary source texture is removed after processing.
 *
 * Safe to call from both a scene's `preload()` and `create()` phases — in
 * preload the callback fires before `create()` runs; at runtime, caller must
 * ensure the scene is still alive when the callback fires.
 *
 * @param {Phaser.Scene} scene
 * @param {string}       key   - Final texture key.
 * @param {string}       url   - Source image URL.
 * @param {number}       w     - Target canvas width in px.
 * @param {number}       h     - Target canvas height in px.
 */
export function loadResized(scene, key, url, w, h) {
  if (scene.textures.exists(key)) return;
  const tmpKey = `__resize_src_${key}`;
  scene.load.image(tmpKey, url);
  scene.load.once(`filecomplete-image-${tmpKey}`, () => {
    if (!scene.textures || !scene.textures.exists(tmpKey)) return;
    const src = scene.textures.get(tmpKey).getSourceImage();
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(src, 0, 0, w, h);
    scene.textures.addCanvas(key, canvas);
    scene.textures.remove(tmpKey);
  });
}
