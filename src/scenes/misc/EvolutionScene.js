import Phaser from 'phaser';
import { getInputManager, Action } from '@Utilities/InputManager.js';

const W = 800;
const H = 600;

/**
 * Full-screen overlay scene that plays the Gen 3-style evolution animation.
 *
 * Launched by Evolution.js (battle state) and OverworldUI.js (post-battle / item use).
 * Stops itself then calls onComplete(didEvolve) when finished.
 *
 * Init data shape:
 *   fromSpecies    {number}   – nat_dex_id of current form
 *   toSpecies      {number}   – nat_dex_id of evolved form
 *   fromName       {string}   – display name of current form
 *   toName         {string}   – display name of evolved form
 *   shiny          {boolean}  – use shiny sprites (default false)
 *   gender         {string|null}
 *   tilesetBaseUrl {string}   – base URL for pokemon sprite directory
 *   canCancel      {boolean}  – allow B/X to cancel (default false)
 *   onComplete     {function} – called with (didEvolve: boolean) after scene ends
 */
export default class EvolutionScene extends Phaser.Scene {
  constructor() {
    super({ key: 'EvolutionScene' });
  }

  init(data) {
    this._from       = data.fromSpecies;
    this._to         = data.toSpecies;
    this._fromName   = data.fromName;
    this._toName     = data.toName;
    this._shiny      = data.shiny          ?? false;
    this._gender     = data.gender         ?? null;
    this._baseUrl    = data.tilesetBaseUrl ?? '';
    this._canCancel  = data.canCancel      ?? false;
    this._onComplete = data.onComplete     ?? (() => {});

    this._cancelled     = false;
    this._transformDone = false;
    this._waitingInput  = false;
  }

  /**
   * Preload both sprite images so they are guaranteed to be in the texture
   * cache when create() runs.
   */
  preload() {
    const suffix = this._shiny ? '-shiny' : '';
    const dir    = this._shiny ? 'shiny/' : '';

    this._fromKey = `pkmn-battle-front-${this._from}${suffix}`;
    this._toKey   = `pkmn-battle-front-${this._to}${suffix}`;

    if (!this.textures.exists(this._fromKey)) {
      this.load.image(this._fromKey, `${this._baseUrl}tileset/pokemon/front/${dir}${this._from}.png`);
    }
    if (!this.textures.exists(this._toKey)) {
      this.load.image(this._toKey, `${this._baseUrl}tileset/pokemon/front/${dir}${this._to}.png`);
    }
  }

  create() {
    // ── Black background ──────────────────────────────────────────────────────
    this.add.rectangle(0, 0, W, H, 0x000000).setOrigin(0).setDepth(0);

    // ── "What? X is evolving!" label ─────────────────────────────────────────
    this._msg = this.add.text(W / 2, H - 60, `What? ${this._fromName} is evolving!`, {
      fontFamily: 'Gen3',
      fontSize:   '18px',
      color:      '#f8f8f8',
    }).setOrigin(0.5).setDepth(10);

    // ── Sprites (textures guaranteed present from preload) ────────────────────
    this._fromSprite = this.add.image(W / 2, H / 2 - 30, this._fromKey)
      .setOrigin(0.5, 1).setDisplaySize(192, 192).setDepth(5);

    this._toSprite = this.add.image(W / 2, H / 2 - 30, this._toKey)
      .setOrigin(0.5, 1).setDisplaySize(192, 192).setDepth(5).setAlpha(0);

    // ── White flash overlay ───────────────────────────────────────────────────
    this._flash = this.add.rectangle(0, 0, W, H, 0xffffff)
      .setOrigin(0).setAlpha(0).setDepth(8);

    // ── Start flash ───────────────────────────────────────────────────────────
    this.time.delayedCall(350, () => this._beginFlash());

    // ── Input ─────────────────────────────────────────────────────────────────
    this._onConfirm = () => {
      if (!this._waitingInput) return;
      this._waitingInput = false;
      getInputManager()?.off(Action.CONFIRM, this._onConfirm);
      getInputManager()?.off(Action.CANCEL,  this._onCancel);
      this._finish(true);
    };
    this._onCancel = () => {
      if (this._transformDone || this._cancelled || !this._canCancel) return;
      this._cancel();
    };
    getInputManager()?.on(Action.CONFIRM, this._onConfirm);
    getInputManager()?.on(Action.CANCEL,  this._onCancel);
  }

  // ─── Flash animation ────────────────────────────────────────────────────────

  _beginFlash() {
    let count = 0;
    const total = 30;

    const step = () => {
      if (this._cancelled || this._transformDone) return;
      if (count >= total) {
        this._transform();
        return;
      }
      count++;
      const progress = count / total;
      const halfDuration = Math.round(Math.max(18, 90 * (1 - progress * 0.8)));
      const showFlash    = count % 2 === 1;

      this.tweens.add({
        targets:  this._flash,
        alpha:    showFlash ? 0.85 : 0,
        duration: halfDuration,
        ease:     'Linear',
        onComplete: step,
      });
    };

    step();
  }

  // ─── Transform ─────────────────────────────────────────────────────────────

  _transform() {
    this._transformDone = true;

    // Final full-white flash, then swap forms
    this.tweens.add({
      targets:  this._flash,
      alpha:    1,
      duration: 100,
      onComplete: () => {
        this._fromSprite.setAlpha(0);
        this._toSprite.setAlpha(1);

        this.tweens.add({
          targets:  this._flash,
          alpha:    0,
          duration: 450,
          onComplete: () => {
            this._msg.setText(
              `Congratulations!\n${this._fromName} evolved\ninto ${this._toName}!`
            );
            this._waitingInput = true;
          },
        });
      },
    });
  }

  // ─── Cancel ────────────────────────────────────────────────────────────────

  _cancel() {
    this._cancelled = true;
    this.tweens.killAll();
    this._flash.setAlpha(0);
    this._fromSprite.setAlpha(1);
    this._msg.setText(`${this._fromName} stopped evolving.`);
    this.time.delayedCall(1600, () => this._finish(false));
  }

  // ─── Finish ────────────────────────────────────────────────────────────────

  _finish(didEvolve) {
    // Deregister input handlers before stopping the scene
    const im = getInputManager();
    im?.off(Action.CONFIRM, this._onConfirm);
    im?.off(Action.CANCEL,  this._onCancel);

    // Fade to white, stop self, then notify caller
    this.tweens.add({
      targets:  this._flash,
      alpha:    1,
      duration: 280,
      onComplete: () => {
        const cb = this._onComplete;
        this.scene.stop();
        cb(didEvolve);
      },
    });
  }
}
