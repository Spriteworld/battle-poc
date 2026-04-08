import BallItem from './BallItem.js';

export default class UltraBall extends BallItem {
  constructor() {
    super({
      name: 'Ultra Ball',
      description: 'An ultra-performance Ball with a much higher catch rate.',
      multiplier: 2,
    });
  }
}
