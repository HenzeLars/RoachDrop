// 7-bag randomizer — guarantees fair distribution, no long droughts. 🪳

const TYPES = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];

export class Bag {
  constructor() {
    this.queue = [];
    this.refill();
  }

  refill() {
    const bag = TYPES.slice();
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
    this.queue.push(...bag);
  }

  next() {
    if (this.queue.length < 7) this.refill();
    return this.queue.shift();
  }

  peek(n) {
    while (this.queue.length < n + 1) this.refill();
    return this.queue.slice(0, n);
  }
}