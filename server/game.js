var { Timer } = require("./timer");
require("./constants")
class Game {
  constructor() {
    // DAY & NIGHT count
    this.cycleCount = 0;
    // Name of current cycle
    this.cycle = "";
    // Interval counts
    this.currentCycle = 0;
    this.currentPhase = 0;
    this.theDurations = {
      night: {
        actions: ACTIONS,
        nightMessages: NIGHTMESSAGES,
      },
      day: {
        recap: RECAP,
        discussion: DISCUSSION,
        voting: VOTING,
        dayMessages: DAYMESSAGES,
      },
    };
    this.nightLength = 0;
    this.dayLength = 0;
    // Emit booleans
    this.emitPhaseOnce = true;
    this.emitCycleOnce = true;
    this.nightMessagesOnce = 0;
    this.recapOnce = 0;
    this.dayMessagesOnce = 0;

    // Game settings
    this.settings = {
      actions : {
        value: ACTIONS,
        isDefault: true
      },
      discussion: {
        value: DISCUSSION,
        isDefault: true
      },
      voting: {
        value: VOTING,
        isDefault: true
      },
      showRoles: {
        value: SHOWROLES,
        isDefault: true
      },
      voteMessages: {
        value: VOTEMESSAGES,
        isDefault: true
      }
    }


    // Phase
    this.phase = "";
    // Interval
    this.interval = null;
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
    // Vote skips
    this.skipVotes = 0;
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
    // Vote skips
    this.skipVotes = 0;
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
  }
  resetSkipVotes() {
    // Vote skips
    this.skipVotes = 0;
  }
  resetGameDone() {
    this.isDone = false;
  }
  resetGameInterval() {
    // Interval
    this.interval = null;
    // Interval counts
    this.currentCycle = 0;
    this.currentPhase = 0;
    this.theDurations = {
      night: {
        actions: ACTIONS,
        nightMessages: NIGHTMESSAGES,
      },
      day: {
        recap: RECAP,
        discussion: DISCUSSION,
        voting: VOTING,
        dayMessages: DAYMESSAGES,
      },
    };
    this.nightLength = 0;
    this.dayLength = 0;
    // Emit booleans
    this.emitPhaseOnce = true;
    this.emitCycleOnce = true;
    this.nightMessagesOnce = 0;
    this.recapOnce = 0;
    this.dayMessagesOnce = 0;
  }

  resetGameSettings() {
    // Game settings
    this.settings = {
      actions : {
        value: ACTIONS,
        isDefault: true
      },
      discussion: {
        value: DISCUSSION,
        isDefault: true
      },
      voting: {
        value: VOTING,
        isDefault: true
      },
      showRoles: {
        value: SHOWROLES,
        isDefault: true
      },
      voteMessages: {
        value: VOTEMESSAGES,
        isDefault: true
      }
    }
  }
  getSkipVotes() {
    return this.skipVotes;
  }
  setSkipVotes(skipVotes) {
    this.skipVotes = skipVotes;
  }
  getSettingsDefault() {
    return this.settingsDefault;
  }

  setSettingsDefault(settingsDefault) {
    this.settingsDefault = this.settingsDefault
  }

  getSettings() {
    return this.settings;
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

  getCurrentCycle() {
    return this.currentCycle;
  }
  setCurrentCycle(currentCycle) {
    this.currentCycle = currentCycle;
  }
  getCurrentPhase() {
    return this.currentPhase;
  }
  setCurrentPhase(currentPhase) {
    this.currentPhase = currentPhase;
  }
  getTheDurations() {
    return this.theDurations;
  }
  setTheDurations(theDurations) {
    this.theDurations = theDurations;
  }
  getNightLength() {
    return this.nightLength;
  }
  setNightLength(nightLength) {
    this.nightLength = nightLength;
  }
  getDayLength() {
    return this.dayLength;
  }
  setDayLength(dayLength) {
    this.dayLength = dayLength;
  }

  getEmitPhaseOnce() {
    return this.emitPhaseOnce;
  }
  setEmitPhaseOnce(emitPhaseOnce) {
    this.emitPhaseOnce = emitPhaseOnce;
  }
  getEmitCycleOnce() {
    return this.emitCycleOnce;
  }
  setEmitCycleOnce(emitCycleOnce) {
    this.emitCycleOnce = emitCycleOnce;
  }
  getNightMessagesOnce() {
    return this.nightMessagesOnce;
  }
  setNightMessagesOnce(nightMessagesOnce) {
    this.nightMessagesOnce = nightMessagesOnce;
  }
  getRecapOnce() {
    return this.recapOnce;
  }
  setRecapOnce(recapOnce) {
    this.recapOnce = recapOnce;
  }
  getDayMessagesOnce() {
    return this.dayMessagesOnce;
  }
  setDayMessagesOnce(dayMessagesOnce) {
    this.dayMessagesOnce = dayMessagesOnce;
  }

  getPhase() {
    return this.phase;
  }

  setPhase(phase) {
    this.phase = phase;
  }

  getGameInterval() {
    return this.interval;
  }

  setGameInterval(interval) {
    this.interval = interval;
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
