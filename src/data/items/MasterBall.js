import BallItem from './BallItem.js';

export default class MasterBall extends BallItem {
  constructor() {
    super({
      name: 'Master Ball',
      description: 'The best Poké Ball with a perfect catch rate. It will never fail.',
      multiplier: 1,
      guaranteed: true,
    });
  }
}
