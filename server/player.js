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
  
  /**
   * use ability of player
   * @param {Player} player
   * @param {Player} target
   */
  useAbility(player, target) {
    if (player.role.hasNightAbility) {
      if (player.isBlocked == false) {
        if (player.role.type == roleTypes.Investigator) {
          if (target.isDisguised) {
            console.log(target.playerName, "is:", target.fakeTeam);
          } else {
            console.log(target.playerName, "is:", target.role.team);
          }
        } else if (player.role.type == roleTypes.Doctor) {
          if (player == target && player.role.selfUsage == 1) {
            player.role.selfUsage = 0;
            console.log("Your self uses:", player.role.selfUsage);
          }
          console.log("You protect", target.playerName);
          target.isProtected = true;
          console.log(target.isProtected);
        } else if (player.role.type == roleTypes.Trapper) {
          console.log("You trap", target.playerName);
          target.isBlocked = true;
          console.log(target.isBlocked);
        } else if (player.role.type == roleTypes.Surgeon) {
          if (target.team == "evil") {
            if (player == target && player.role.selfUsage == 1) {
              player.role.selfUsage = 0;
              console.log("Your self uses:", player.role.selfUsage);
            }
            console.log("You disguise", target.playerName);
            target.isDisguised = true;
            console.log(target.isDisguised);
          }
        } else if (player.role.type == roleTypes.Witch) {
          if (target.team != "evil") {
            console.log("You cast a freeze spell on", target.playerName);
            target.isBlocked = true;
            console.log(target.isBlocked);
          }
        } else if (player.role.type == roleTypes.Framer) {
          if (target.team != "evil") {
            console.log("You plant evidence on", target.playerName);
            target.isDisguised = true;
            console.log(target.isDisguised);
            disguiseChecker();
          }
        }
      }
    }
  }

  
  
}

module.exports = {
  Player,
};
