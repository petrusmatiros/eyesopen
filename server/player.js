require("./constants")

var { Role } = require("./role");

class Player {
  constructor(playerName, role) {
    this.playerName = playerName;
    this.playerRoom = null;
    this.role = role;
    this.oldRole = null;
    this.oldTarget = null;
    this.disconnected = false;
    // Ready game
    this.readyGame = false;
    // clear after every game
    this.messages = [];
    // DO NOT RESET
    this.isKilled = false;
    this.isLynched = false;
    this.killedBy = [];
    // RESET AFTER EVERY NIGHT HAS ENDED
    this.isProtected = false;
    this.isTargeted = false;
    this.isBlocked = false;
    this.isDisguised = false;
    this.fakeTeam = "";
    // Voting count
    this.dayVotes = 0;
    this.nightVotes = 0;
    // RESET AFTER EVERY TIME PLAYER HAS TO TARGET SOME PLAYER (DAY/NIGHT VOTING AND ABILITY)
    this.abilityTarget = null;
    this.voteTarget = null;
  }

  reset() {
    // RESET AFTER EVERY NIGHT HAS ENDED
    this.isProtected = false;
    this.isTargeted = false;
    this.isBlocked = false;
    this.isDisguised = false;
    this.fakeTeam = "";
    // Voting count
    this.dayVotes = 0;
    this.nightVotes = 0;
    // RESET AFTER EVERY TIME PLAYER HAS TO TARGET SOME PLAYER (DAY/NIGHT VOTING AND ABILITY)
    this.abilityTarget = null;
    this.voteTarget = null;
  }

  getPlayerName() {
    return this.playerName;
  }

  setPlayerName(playerName) {
    this.playerName = playerName;
  }
  getPlayerRoom() {
    return this.playerRoom;
  }

  setPlayerRoom(playerRoom) {
    this.playerRoom = playerRoom;
  }

  getRole() {
    return this.role;
  }

  setRole(role) {
    this.role = role;
  }
  getOldRole() {
    return this.oldRole;
  }

  setOldRole(oldRole) {
    this.oldRole = oldRole;
  }
  getOldTarget() {
    return this.oldTarget;
  }

  setOldTarget(oldTarget) {
    this.oldTarget = oldTarget;
  }

  getDisconnected() {
    return this.disconnected;
  }

  setDisconnected(disconnected) {
    this.disconnected = disconnected;
  }

  getReadyGame() {
    return this.readyGame;
  }

  setReadyGame(readyGame) {
    this.readyGame = readyGame;
  }

  getMessages() {
    return this.messages;
  }
  addMessage(message) {
    this.messages.push(message);
  }
  removeMessage(message) {
    this.messages.splice(this.messages.indexOf(message), 1);
  }

  getIsKilled() {
    return this.isKilled;
  }

  setIsKilled(isKilled) {
    this.isKilled = isKilled;
  }
  getIsLynched() {
    return this.isLynched;
  }

  setIsLynched(isLynched) {
    this.isLynched = isLynched;
  }

  addKiller(killer) {
    this.killedBy.push(killer);
  }
}

module.exports = {
  Player,
};
