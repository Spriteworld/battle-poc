import BallItem from './BallItem.js';

export default class Pokeball extends BallItem {
  constructor() {
    super({
      name: 'Poké Ball',
      description: 'A device for catching wild Pokémon.',
      multiplier: 1,
    });
  }
}
