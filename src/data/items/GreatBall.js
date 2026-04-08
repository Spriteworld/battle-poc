import BallItem from './BallItem.js';

export default class GreatBall extends BallItem {
  constructor() {
    super({
      name: 'Great Ball',
      description: 'A good-quality Ball with a higher catch rate than a standard Poké Ball.',
      multiplier: 1.5,
    });
  }
}
