var jsonData = require("./roles.json");
require("./constants")

  class Role {
    constructor(type) {
        this.type = type;
        this.name = jsonData["roles"][type]["name"];
        this.description = jsonData["roles"][type]["description"];
        this.mission = jsonData["roles"][type]["mission"];
        this.team = jsonData["roles"][type]["team"];
        this.hasNightAbility = jsonData["roles"][type]["hasNightAbility"];
        this.hasDayAbility = jsonData["roles"][type]["hasDayAbility"];
        this.voteCount = jsonData["roles"][type]["voteCount"];
        if (type == roleTypes.Doctor) {
          this.selfUsage = jsonData["roles"]["doctor"]["selfUsage"];
        } else if (type == roleTypes.Mayor) {
          this.revealed = jsonData["roles"]["mayor"]["revealed"];
        } else if (type == roleTypes.Godfather) {
          this.killVoteCount = jsonData["roles"]["godfather"]["killVoteCount"];
        } else if (type == roleTypes.Mafioso) {
          this.killVoteCount = jsonData["roles"]["mafioso"]["killVoteCount"];
        } else if (type == roleTypes.Surgeon) {
          this.killVoteCount = jsonData["roles"]["surgeon"]["killVoteCount"];
          this.selfUsage = jsonData["roles"]["surgeon"]["selfUsage"];
        } else if (type == roleTypes.Witch) {
          this.killVoteCount = jsonData["roles"]["witch"]["killVoteCount"];
        } else if (type == roleTypes.Framer) {
          this.killVoteCount = jsonData["roles"]["framer"]["killVoteCount"];
        } else if (type == roleTypes.SerialKiller) {
          this.killVoteCount = jsonData["roles"]["serial killer"]["killVoteCount"];
        } else if (type == roleTypes.Executioner) {
          // executioner target (set to null)
          this.target = jsonData["roles"]["executioner"]["target"];
        } else if (type == roleTypes.Lawyer) {
          // lawyer client (set to null)
          this.client = jsonData["roles"]["lawyer"]["client"];
        }
    }
  }

  module.exports = {
    Role,
  };