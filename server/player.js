const roleTypes = {
  Villager: "villager",
  Investigator: "investigator",
  Doctor: "doctor",
  Mayor: "mayor",
  Trapper: "trapper",
  Godfather: "godfather",
  Mafioso: "mafioso",
  Surgeon: "surgeon",
  Witch: "witch",
  Framer: "framer",
  Jester: "jester",
  SerialKiller: "serial killer",
  Executioner: "executioner",
  Lawyer: "lawyer",
};

var { Role } = require("./role");

class Player {
  constructor(
    playerName,
    role,
  ) {
    this.playerName = playerName;
    this.role = role;
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

  getRole() {
    return this.role;
  }

  setRole(role) {
    this.role = role;
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
