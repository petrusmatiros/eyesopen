var { Timer } = require("./timer");
class Game {
  constructor() {
    // DAY & NIGHT count
    this.cycleCount = 0;
    // Name of current cycle
    this.cycle = "";
    // Phase
    this.phase = "";
    // Timer
    this.timer = new Timer()
    // Keeping track of evil players
    this.evil = [];
    // Keeping track of total players for voting
    this.alive = [];
    // Array for current dead players
    this.dead = [];
    // Array for cemetery
    this.cemetery = [];
    // Booleans for inProgress and finished
    this.inProgress = false;
    this.isDone = false;
  }

  reset() {
    // DAY & NIGHT count
    this.cycleCount = 0;
    // Name of current cycle
    this.cycle = "";
    // Phase
    this.phase = "";
    // Timer
    this.timer = new Timer()
    // Keeping track of evil players
    this.evil = [];
    // Keeping track of total players for voting
    this.alive = [];
    // Array for current dead players
    this.dead = [];
    // Array for cemetery
    this.cemetery = [];
    // Booleans for inProgress and finished
    this.inProgress = false;
    this.isDone = false;
  }

  getCycleCount() {
    return this.cycleCount;
  }

  setCycleCount(cycleCount) {
    this.cycleCount = cycleCount;
  }
  
  getCycle() {
    return this.cycle;
  }

  setCycle(cycle) {
    this.cycle = cycle;
  }

  getPhase() {
    return this.phase;
  }

  setPhase(phase) {
    this.phase = phase;
  }

  getEvil() {
    return this.evil;
  }

  addEvil(evilPlayer) {
    this.evil.push(evilPlayer);
  }

  removeEvil(evilPlayer) {
    this.evil.splice(this.evil.indexOf(evilPlayer), 1);
  }

  getAlive() {
    return this.alive;
  }

  addAlive(player) {
    this.alive.push(player);
  }

  removeAlive(player) {
    this.alive.splice(this.alive.indexOf(player), 1);
  }

  getDead() {
    return this.dead;
  }

  addDead(player) {
    this.dead.push(player);
  }

  removeDead(player) {
    this.dead.splice(this.dead.indexOf(player), 1);
  }
  getCemetery() {
    return this.cemetery;
  }

  addCemetery(player) {
    this.cemetery.push(player);
  }

  removeCemetery(player) {
    this.cemetery.splice(this.cemetery.indexOf(player), 1);
  }

  getProgress() {
    return this.inProgress;
  }

  setProgress(progress) {
    this.inProgress = progress;
  }

  getDone() {
    return this.isDone;
  }

  setDone(done) {
    this.isDone = done;
  }
}

module.exports = {
  Game,
};
