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
    this.timer = new Timer();
    // Keeping track of evil players
    this.evil = [];
    // Evil room code
    this.evilRoom = "";
    // in game users
    this.users = [];
    // Keeping track of total players for voting
    this.alive = [];
    // Array for current dead players
    this.dead = [];
    // Array for cemetery
    this.cemetery = [];
    // Win information
    this.jesterWin = false;
    this.executionerWin = false;
    this.goodWin = false;
    this.evilWin = false;
    this.neutralWin = false;
    this.serialKillerWin = false;
    this.lawyerWin = false;
    this.draw = false;
    this.winners = [];
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
    this.timer = new Timer();
    // Keeping track of evil players
    this.evil = [];
    // Evil room code
    this.evilRoom = "";
    // in game users
    this.users = [];
    // Keeping track of total players for voting
    this.alive = [];
    // Array for current dead players
    this.dead = [];
    // Array for cemetery
    this.cemetery = [];
    // Win information
    this.jesterWin = false;
    this.executionerWin = false;
    this.goodWin = false;
    this.evilWin = false;
    this.neutralWin = false;
    this.serialKillerWin = false;
    this.lawyerWin = false;
    this.draw = false;
    this.winners = [];
    // Passive game counter
    this.noDeaths = 0;
    // Booleans for inProgress and finished
    this.inProgress = false;
    this.isDone = false;
  }

  clearUser(user) {
    this.users.splice(this.users.indexOf(user), 1);
    this.alive.splice(this.alive.indexOf(user), 1);
    this.dead.splice(this.dead.indexOf(user), 1);
    this.evil.splice(this.evil.indexOf(user), 1);
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

  getTimer() {
    return this.timer;
  }

  setTimer(timer) {
    this.timer = timer;
  }

  getEvil() {
    return this.evil;
  }

  getEvilRoom() {
    return this.evilRoom;
  }

  setEvilRoom(evilRoom) {
    this.evilRoom = evilRoom;
  }

  addEvil(evilPlayer) {
    this.evil.push(evilPlayer);
  }

  removeEvil(evilPlayer) {
    this.evil.splice(this.evil.indexOf(evilPlayer), 1);
  }

  getUsers() {
    return this.users;
  }

  addUser(player) {
    this.users.push(player);
  }

  removeUser(player) {
    this.users.splice(this.users.indexOf(player), 1);
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

  getJesterWin() {
    return this.jesterWin;
  }
  getExecutionerWin() {
    return this.executionerWin;
  }
  getSerialKillerWin() {
    return this.serialKillerWin;
  }

  getLawyerWin() {
    return this.lawyerWin;
  }

  getGoodWin() {
    return this.goodWin;
  }

  getEvilWin() {
    return this.evilWin;
  }
  getNeutralWin() {
    return this.neutralWin;
  }
  getDraw() {
    return this.draw;
  }
  setDraw(draw) {
    this.draw = draw;
  }

  setJesterWin(jesterWin) {
    this.jesterWin = jesterWin;
  }
  setExecutionerWin(executionerWin) {
    this.executionerWin = executionerWin;
  }
  setSerialKillerWin(serialKillerWin) {
    this.serialKillerWin = serialKillerWin;
  }

  setLawyerWin(lawyerWin) {
    this.lawyerWin = lawyerWin;
  }

  setGoodWin(goodWin) {
    this.goodWin = goodWin;
  }

  setEvilWin(evilWin) {
    this.evilWin = evilWin;
  }
  setNeutralWin(neutralWin) {
    this.neutralWin = neutralWin;
  }

  getWinners() {
    return this.winners;
  }

  setWinners(winners) {
    this.winners = winners;
  }

  addWinner(winner) {
    this.winners.push(winner);
  }
  removeWinner(winner) {
    this.winners.splice(this.winners.indexOf(winner), 1);
  }
  getNoDeaths() {
    return this.noDeaths;
  }
  setNoDeaths(noDeaths) {
    this.noDeaths = noDeaths;
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
