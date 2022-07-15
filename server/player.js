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
  Serial_Killer: "serial_killer",
  Executioner: "executioner",
  Lawyer: "lawyer",
};

class Player {
  constructor(
    playerName,
    role,
  ) {
    this.playerName = playerName;
    this.role = role;
    this.isKilled = false;
    this.isLynched = false;
    this.killedBy = [];
    this.isProtected = false;
    this.isTargeted = false;
    this.isBlocked = false;
    this.isDisguised = false;
    this.fakeTeam = "";
    this.abilityTarget = null;
    this.voteTarget = null;
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

  vote(player, target) {}

  kill(player, target) {
    if (player.isBlocked == false) {
      if (target.isProtected == false) {
        if (player.role.type == roleTypes.Serial_Killer) {
          console.log("You kill", target.playerName);
          target.isKilled = true;
          console.log(target.isKilled);
        }
      }
    }
  }
}

module.exports = {
  Player,
};


// function Player(
//   playerName,
//   role,
//   isKilled = false,
//   isLynched = false,
//   killedBy = false,
//   isProtected = false,
//   isTargeted = false,
//   isBlocked = false,
//   isDisguised = false
// ) {
//   this.playerName = playerName;
//   this.role = role;
//   this.isKilled = isKilled;
//   this.isLynched = isLynched;
//   this.killedBy = killedBy;
//   this.isProtected = isProtected;
//   this.isTargeted = isTargeted;
//   this.isBlocked = isBlocked;
//   this.isDisguised = isDisguised;
//   this.fakeTeam = "";
//   this.abilityTarget = null;
//   this.voteTarget = null;
// }

// /**
//  * use ability of player
//  * @param {Player} player
//  * @param {Player} target
//  */
// Player.useAbility = function (player, target) {
//   if (player.role.hasNightAbility) {
//     if (player.isBlocked == false) {
//       if (player.role.type == roleTypes.Investigator) {
//         if (target.isDisguised) {
//           console.log(target.playerName, "is:", target.fakeTeam);
//         } else {
//           console.log(target.playerName, "is:", target.role.team);
//         }
//       } else if (player.role.type == roleTypes.Doctor) {
//         if (player == target && player.role.selfUsage == 1) {
//           player.role.selfUsage = 0;
//           console.log("Your self uses:", player.role.selfUsage);
//         }
//         console.log("You protect", target.playerName);
//         target.isProtected = true;
//         console.log(target.isProtected);
//       } else if (player.role.type == roleTypes.Trapper) {
//         console.log("You trap", target.playerName);
//         target.isBlocked = true;
//         console.log(target.isBlocked);
//       } else if (player.role.type == roleTypes.Surgeon) {
//         if (target.team == "evil") {
//           if (player == target && player.role.selfUsage == 1) {
//             player.role.selfUsage = 0;
//             console.log("Your self uses:", player.role.selfUsage);
//           }
//           console.log("You disguise", target.playerName);
//           target.isDisguised = true;
//           console.log(target.isDisguised);
//         }
//       } else if (player.role.type == roleTypes.Witch) {
//         if (target.team != "evil") {
//           console.log("You cast a freeze spell on", target.playerName);
//           target.isBlocked = true;
//           console.log(target.isBlocked);
//         }
//       } else if (player.role.type == roleTypes.Framer) {
//         if (target.team != "evil") {
//           console.log("You plant evidence on", target.playerName);
//           target.isDisguised = true;
//           console.log(target.isDisguised);
//           disguiseChecker();
//         }
//       }
//     }
//   }
// };

// Player.vote = function (player, target) {};

// Player.kill = function (player, target) {
//   if (player.isBlocked == false) {
//     if (target.isProtected == false) {
//       if (player.role.type == roleTypes.Serial_Killer) {
//         console.log("You kill", target.playerName);
//         target.isKilled = true;
//         console.log(target.isKilled);
//       }
//     }
//   }
// };

