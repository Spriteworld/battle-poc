import Phaser from 'phaser';
import BattlePokemonSprite from '@Objects/battlescene/BattlePokemonSprite.js';

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

  create() {
    // ── Black background ──────────────────────────────────────────────────────
    this.add.rectangle(0, 0, W, H, 0x000000).setOrigin(0).setDepth(0);

    // ── "What? X is evolving!" label ─────────────────────────────────────────
    this._msg = this.add.text(W / 2, H - 60, `What? ${this._fromName} is evolving!`, {
      fontFamily: 'Gen3',
      fontSize:   '18px',
      color:      '#f8f8f8',
    }).setOrigin(0.5).setDepth(10);

    // ── Sprites ───────────────────────────────────────────────────────────────
    this._fromSprite = new BattlePokemonSprite(this, W / 2, H / 2 - 30, {
      species:        this._from,
      shiny:          this._shiny,
      gender:         this._gender,
      isBack:         false,
      size:           192,
      tilesetBaseUrl: this._baseUrl,
    });
    this._fromSprite.setDepth(5);

    // Evolved form — hidden until transform
    this._toSprite = new BattlePokemonSprite(this, W / 2, H / 2 - 30, {
      species:        this._to,
      shiny:          this._shiny,
      gender:         this._gender,
      isBack:         false,
      size:           192,
      tilesetBaseUrl: this._baseUrl,
    });
    this._toSprite.setDepth(5).setAlpha(0);

    // ── White flash overlay ───────────────────────────────────────────────────
    this._flash = this.add.rectangle(0, 0, W, H, 0xffffff)
      .setOrigin(0).setAlpha(0).setDepth(8);

    // ── Start flash after a brief pause (lets sprites begin loading) ──────────
    this.time.delayedCall(350, () => this._beginFlash());

    // ── Input ─────────────────────────────────────────────────────────────────
    this.input.keyboard.on('keydown', this._onKey, this);
  }

  // ─── Input ─────────────────────────────────────────────────────────────────

  _onKey(event) {
    if (this._waitingInput) {
      if (event.code === 'KeyZ' || event.code === 'Enter') {
        this._waitingInput = false;
        this.input.keyboard.off('keydown', this._onKey, this);
        this._finish(true);
      }
      return;
    }

    if (!this._transformDone && !this._cancelled && this._canCancel) {
      if (event.code === 'KeyX' || event.code === 'Escape') {
        this._cancel();
      }
    }
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
