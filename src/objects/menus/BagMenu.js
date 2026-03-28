import Phaser from 'phaser';
import { Menu } from '@Objects';

const PANEL_W = 800;
const PANEL_H = 600;
const PAD_X   = 24;
const TAB_H   = 32;          // height of the tab bar row
const PAD_Y   = TAB_H + 12; // items start below the tab bar
const CELL_H  = 36;
const MAX_VIS = Math.floor((PANEL_H - PAD_Y - 10) / CELL_H);

/**
 * Tab definitions: label shown in the UI and the item category it corresponds to.
 * Exported so PlayerBag can import the same array rather than duplicating it.
 */
export const BAG_TABS = [
  { label: 'Med',    category: 'medicine' },
  { label: 'Balls',  category: 'balls'    },
  { label: 'Battle', category: 'battle'   },
  { label: 'Berry',  category: 'berries'  },
  { label: 'Key',    category: 'key'      },
  { label: 'Other',  category: 'other'    },
];

/** Single-column item list with category tabs at the top. @extends Menu */
export default class BagMenu extends Menu {
  constructor(scene, x, y) {
    super(scene, x, y, {
      columns:    1,
      cellWidth:  PANEL_W - PAD_X * 2,
      cellHeight: CELL_H,
      padX:       PAD_X,
      padY:       PAD_Y,
      maxVisible: MAX_VIS,
    });
    this.name      = 'BagMenu';
    this._tabIndex = 0;
    this._tabTexts = [];
    this._drawPanel();
  }

  _drawPanel() {
    const bg = new Phaser.GameObjects.Graphics(this.scene);
    bg.fillStyle(0x1a1a3a);
    bg.fillRect(0, 0, PANEL_W, PANEL_H);
    bg.lineStyle(4, 0x181818);
    bg.strokeRect(0, 0, PANEL_W, PANEL_H);
    // Separator between tab bar and item list.
    bg.lineStyle(1, 0x3a3a5a);
    bg.lineBetween(0, TAB_H, PANEL_W, TAB_H);
    this.addAt(bg, 0);

    // Tab label text objects — one per tab, evenly distributed.
    const tabW = PANEL_W / BAG_TABS.length;
    BAG_TABS.forEach(({ label }, i) => {
      const tx = this.scene.add.text(
        tabW * i + tabW / 2,
        TAB_H / 2,
        label,
        { fontFamily: 'Gen3', fontSize: '10px', color: '#888899' },
      );
      tx.setOrigin(0.5, 0.5);
      this.add(tx);
      this._tabTexts.push(tx);
    });

    this._updateTabStyles();
    this._createScrollArrows(PANEL_W, PANEL_H);
  }

  _updateTabStyles() {
    this._tabTexts.forEach((tx, i) => {
      tx.setColor(i === this._tabIndex ? '#ffe88a' : '#888899');
    });
  }

  /**
   * Sets the active tab and refreshes its visual highlight.
   * Does NOT emit a tab-change event — call this when restoring state.
   * @param {number} index
   */
  setActiveTab(index) {
    this._tabIndex = index;
    this._updateTabStyles();
  }

  /** @override Left arrow cycles the tab bar instead of navigating items. */
  moveSelectionLeft() {
    if (this._tabIndex <= 0) return;
    this._tabIndex--;
    this._updateTabStyles();
    this.config.scene.events.emit('bagmenu-tab-change', this._tabIndex);
  }

  /** @override Right arrow cycles the tab bar instead of navigating items. */
  moveSelectionRight() {
    if (this._tabIndex >= BAG_TABS.length - 1) return;
    this._tabIndex++;
    this._updateTabStyles();
    this.config.scene.events.emit('bagmenu-tab-change', this._tabIndex);
  }
}
