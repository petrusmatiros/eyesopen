class Game {
  constructor() {
    // DAY & NIGHT count
    this.cycle = 0;
    // Keeping track of evil players
    this.evil = [];
    // Keeping track of total players for voting
    this.alive = [];
    // Array for cemetery
    this.dead = [];
    // Booleans for inProgress and finished
    this.inProgress = false;
    this.isDone = false;
  }

  reset() {
    // DAY & NIGHT count
    this.cycle = 0;
    // Keeping track of evil players
    this.evil = [];
    // Keeping track of total players for voting
    this.alive = [];
    // Array for cemetery
    this.dead = [];
    // Booleans for inProgress and finished
    this.inProgress = false;
    this.isDone = false;
  }

  getCycle() {
    return this.cycle;
  }

  setCycle(cycle) {
    this.cycle = cycle;
  }

  nextCycle() {
    // CLEAR ALL PLAYER VALUES, except the important ones
    // reset player values if player is NOT lynched or NOT killed
  // exception for executioner where they will be alive, but their target can be dead (they turn into jester)
    this.cycle++;
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
