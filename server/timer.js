export class Timer {
  constructor() {
    this.duration = 0;
    this.counter = 0;
    this.running = false;
  }

  getDuration() {
    return this.duration;
  }
  getCounter() {
    return this.counter;
  }

  getRunning() {
    return this.running;
  }

  setDuration(duration) {
    this.duration = duration;
  }
  setCounter(counter) {
    this.counter = counter;
  }

  setRunning(running) {
    this.running = running;
  }

  init(duration) {
    this.setRunning(true);
    this.setDuration(duration);
    this.setCounter(this.getDuration());
  }

  tick() {
    this.setCounter(this.getCounter() - 1);
  }
}