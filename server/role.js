var jsonData = require("./roles.json");

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

  class Role {
    constructor(type) {
        this.type = type;
        if (type == roleTypes.Villager) {
          this.name = jsonData["roles"]["villager"]["name"];
          this.description = jsonData["roles"]["villager"]["description"];
          this.mission = jsonData["roles"]["villager"]["mission"];
          this.team = jsonData["roles"]["villager"]["team"];
          this.hasNightAbility = jsonData["roles"]["villager"]["hasNightAbility"];
          this.hasDayAbility = jsonData["roles"]["villager"]["hasDayAbility"];
          this.voteCount = jsonData["roles"]["villager"]["voteCount"];
        } else if (type == roleTypes.Investigator) {
          this.name = jsonData["roles"]["investigator"]["name"];
          this.description = jsonData["roles"]["investigator"]["description"];
          this.mission = jsonData["roles"]["investigator"]["mission"];
          this.team = jsonData["roles"]["investigator"]["team"];
          this.hasNightAbility = jsonData["roles"]["investigator"]["hasNightAbility"];
          this.hasDayAbility = jsonData["roles"]["investigator"]["hasDayAbility"];
          this.voteCount = jsonData["roles"]["investigator"]["voteCount"];
        } else if (type == roleTypes.Doctor) {
          this.name = jsonData["roles"]["doctor"]["name"];
          this.description = jsonData["roles"]["doctor"]["description"];
          this.mission = jsonData["roles"]["doctor"]["mission"];
          this.team = jsonData["roles"]["doctor"]["team"];
          this.hasNightAbility = jsonData["roles"]["doctor"]["hasNightAbility"];
          this.hasDayAbility = jsonData["roles"]["doctor"]["hasDayAbility"];
          this.voteCount = jsonData["roles"]["doctor"]["voteCount"];
          this.selfUsage = jsonData["roles"]["doctor"]["selfUsage"];
        } else if (type == roleTypes.Mayor) {
          this.name = jsonData["roles"]["mayor"]["name"];
          this.description = jsonData["roles"]["mayor"]["description"];
          this.mission = jsonData["roles"]["mayor"]["mission"];
          this.team = jsonData["roles"]["mayor"]["team"];
          this.hasNightAbility = jsonData["roles"]["mayor"]["hasNightAbility"];
          this.hasDayAbility = jsonData["roles"]["mayor"]["hasDayAbility"];
          this.revealed = jsonData["roles"]["mayor"]["revealed"];
          this.voteCount = jsonData["roles"]["mayor"]["voteCount"];
        } else if (type == roleTypes.Trapper) {
          this.name = jsonData["roles"]["trapper"]["name"];
          this.description = jsonData["roles"]["trapper"]["description"];
          this.mission = jsonData["roles"]["trapper"]["mission"];
          this.team = jsonData["roles"]["trapper"]["team"];
          this.hasNightAbility = jsonData["roles"]["trapper"]["hasNightAbility"];
          this.hasDayAbility = jsonData["roles"]["trapper"]["hasDayAbility"];
          this.voteCount = jsonData["roles"]["trapper"]["voteCount"];
        } else if (type == roleTypes.Godfather) {
          this.name = jsonData["roles"]["godfather"]["name"];
          this.description = jsonData["roles"]["godfather"]["description"];
          this.mission = jsonData["roles"]["godfather"]["mission"];
          this.team = jsonData["roles"]["godfather"]["team"];
          this.hasNightAbility = jsonData["roles"]["godfather"]["hasNightAbility"];
          this.hasDayAbility = jsonData["roles"]["godfather"]["hasDayAbility"];
          this.voteCount = jsonData["roles"]["godfather"]["voteCount"];
          this.killVoteCount = jsonData["roles"]["godfather"]["killVoteCount"];
        } else if (type == roleTypes.Mafioso) {
          this.name = jsonData["roles"]["mafioso"]["name"];
          this.description = jsonData["roles"]["mafioso"]["description"];
          this.mission = jsonData["roles"]["mafioso"]["mission"];
          this.team = jsonData["roles"]["mafioso"]["team"];
          this.hasNightAbility = jsonData["roles"]["mafioso"]["hasNightAbility"];
          this.hasDayAbility = jsonData["roles"]["mafioso"]["hasDayAbility"];
          this.voteCount = jsonData["roles"]["mafioso"]["voteCount"];
          this.killVoteCount = jsonData["roles"]["mafioso"]["killVoteCount"];
        } else if (type == roleTypes.Surgeon) {
          this.name = jsonData["roles"]["surgeon"]["name"];
          this.description = jsonData["roles"]["surgeon"]["description"];
          this.mission = jsonData["roles"]["surgeon"]["mission"];
          this.team = jsonData["roles"]["surgeon"]["team"];
          this.hasNightAbility = jsonData["roles"]["surgeon"]["hasNightAbility"];
          this.hasDayAbility = jsonData["roles"]["surgeon"]["hasDayAbility"];
          this.voteCount = jsonData["roles"]["surgeon"]["voteCount"];
          this.killVoteCount = jsonData["roles"]["surgeon"]["killVoteCount"];
          this.selfUsage = jsonData["roles"]["surgeon"]["selfUsage"];
        } else if (type == roleTypes.Witch) {
          this.name = jsonData["roles"]["witch"]["name"];
          this.description = jsonData["roles"]["witch"]["description"];
          this.mission = jsonData["roles"]["witch"]["mission"];
          this.team = jsonData["roles"]["witch"]["team"];
          this.hasNightAbility = jsonData["roles"]["witch"]["hasNightAbility"];
          this.hasDayAbility = jsonData["roles"]["witch"]["hasDayAbility"];
          this.voteCount = jsonData["roles"]["witch"]["voteCount"];
          this.killVoteCount = jsonData["roles"]["witch"]["killVoteCount"];
        } else if (type == roleTypes.Framer) {
          this.name = jsonData["roles"]["framer"]["name"];
          this.description = jsonData["roles"]["framer"]["description"];
          this.mission = jsonData["roles"]["framer"]["mission"];
          this.team = jsonData["roles"]["framer"]["team"];
          this.hasNightAbility = jsonData["roles"]["framer"]["hasNightAbility"];
          this.hasDayAbility = jsonData["roles"]["framer"]["hasDayAbility"];
          this.voteCount = jsonData["roles"]["framer"]["voteCount"];
          this.killVoteCount = jsonData["roles"]["framer"]["killVoteCount"];
        } else if (type == roleTypes.Jester) {
          this.name = jsonData["roles"]["jester"]["name"];
          this.description = jsonData["roles"]["jester"]["description"];
          this.mission = jsonData["roles"]["jester"]["mission"];
          this.team = jsonData["roles"]["jester"]["team"];
          this.hasNightAbility = jsonData["roles"]["jester"]["hasNightAbility"];
          this.hasDayAbility = jsonData["roles"]["jester"]["hasDayAbility"];
          this.voteCount = jsonData["roles"]["jester"]["voteCount"];
        } else if (type == roleTypes.SerialKiller) {
          this.name = jsonData["roles"]["serial killer"]["name"];
          this.description = jsonData["roles"]["serial killer"]["description"];
          this.mission = jsonData["roles"]["serial killer"]["mission"];
          this.team = jsonData["roles"]["serial killer"]["team"];
          this.hasNightAbility = jsonData["roles"]["serial killer"]["hasNightAbility"];
          this.hasDayAbility = jsonData["roles"]["serial killer"]["hasDayAbility"];
          this.voteCount = jsonData["roles"]["serial killer"]["voteCount"];
          this.killVoteCount = jsonData["roles"]["serial killer"]["killVoteCount"];
        } else if (type == roleTypes.Executioner) {
          this.name = jsonData["roles"]["executioner"]["name"];
          this.description = jsonData["roles"]["executioner"]["description"];
          this.mission = jsonData["roles"]["executioner"]["mission"];
          this.team = jsonData["roles"]["executioner"]["team"];
          this.hasNightAbility = jsonData["roles"]["executioner"]["hasNightAbility"];
          this.hasDayAbility = jsonData["roles"]["executioner"]["hasDayAbility"];
          this.voteCount = jsonData["roles"]["executioner"]["voteCount"];
          // executioner target (set to null)
          this.target = jsonData["roles"]["executioner"]["target"];
        } else if (type == roleTypes.Lawyer) {
          this.name = jsonData["roles"]["lawyer"]["name"];
          this.description = jsonData["roles"]["lawyer"]["description"];
          this.mission = jsonData["roles"]["lawyer"]["mission"];
          this.team = jsonData["roles"]["lawyer"]["team"];
          this.hasNightAbility = jsonData["roles"]["lawyer"]["hasNightAbility"];
          this.hasDayAbility = jsonData["roles"]["lawyer"]["hasDayAbility"];
          this.voteCount = jsonData["roles"]["lawyer"]["voteCount"];
          // lawyer client (set to null)
          this.client = jsonData["roles"]["lawyer"]["client"];
        }
    }
  }

  module.exports = {
    Role,
  };