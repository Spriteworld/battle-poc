import TypeBadge from '@Objects/ui/TypeBadge.js';
import { TEXT_STYLE_SM } from './layout.js';

/** Returns slot bg/border colors for a given interaction state. */
export function slotColors(state) {
  switch (state) {
    case 'selected': return { bg: 0xfff5cc, border: 0xffcc00, lw: 3 };
    case 'cursor':   return { bg: 0xdce8f0, border: 0x3399ff, lw: 3 };
    case 'target':   return { bg: 0xd4f0d4, border: 0x44aa44, lw: 3 };
    default:         return { bg: 0xdce8f0, border: 0x181818, lw: 2 };
  }
}

/** Draw an HP bar row into the menu container. */
export function drawHpRow(menu, x, y, width, currentHp, maxHp, hpRatio) {
  const { scene, reg } = menu;
  const labelW  = 20;
  const hpColor = hpRatio > 0.5 ? 0x48c050 : hpRatio > 0.25 ? 0xf0c040 : 0xe04040;

  const barMidY = y + 3 + 4; // vertical centre of the 8px bar

  const hpLabel = scene.add.text(x, barMidY, 'HP', { ...TEXT_STYLE_SM, color: '#444444' });
  hpLabel.setOrigin(0, 0.5);
  reg(hpLabel);

  const barX = x + labelW + 2;
  const barW = width - labelW - 2 - 52;
  const track = scene.add.graphics();
  track.fillStyle(0xaaaaaa, 1);
  track.fillRoundedRect(barX, y + 3, barW, 8, 3);
  track.fillStyle(hpColor, 1);
  track.fillRoundedRect(barX, y + 3, Math.max(2, barW * hpRatio), 8, 3);
  reg(track);

  const hpNums = scene.add.text(x + width, barMidY, `${currentHp}/${maxHp}`, { ...TEXT_STYLE_SM, align: 'right' });
  hpNums.setOrigin(1, 0.5);
  reg(hpNums);
}

/** Draw type badge(s) into the menu container. */
export function drawTypeBadges(menu, x, y, types) {
  (types ?? []).slice(0, 2).forEach((type, ti) => {
    menu.reg(new TypeBadge(menu.scene, x + ti * (TypeBadge.WIDTH + 4), y, type));
  });
}
