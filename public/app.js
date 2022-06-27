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
}


fetch("./roles.json")
    .then((response) => {
        return response.json();
    })
    .then((data) => {
        // Work with JSON data here
        // getJson(data)
        var test = new Role(roleTypes.Doctor, data)
        console.log(test)
    })
    .catch((err) => {
        // Do something for an error here
    });

// var jsonData = JSON.parse(data)
// console.log(jsonData)


function Role(type, data) {
    if (type == roleTypes.Villager) {
        this.name = data["roles"]["good"]["villager"]["name"]
        this.description = data["roles"]["good"]["villager"]["description"]
        this.mission = data["roles"]["good"]["villager"]["mission"]
        this.team = "good"
        this.hasNightAbility = data["roles"]["good"]["villager"]["hasNightAbility"]
        this.voteCount = data["roles"]["good"]["villager"]["voteCount"]
    }
    else if (type == roleTypes.Investigator) {
        this.name = data["roles"]["good"]["investigator"]["name"]
        this.description = data["roles"]["good"]["investigator"]["description"]
        this.mission = data["roles"]["good"]["investigator"]["mission"]
        this.team = "good"
        this.hasNightAbility = data["roles"]["good"]["investigator"]["hasNightAbility"]
        this.voteCount = data["roles"]["good"]["investigator"]["voteCount"]
    }
    else if (type == roleTypes.Doctor) {
        this.name = data["roles"]["good"]["doctor"]["name"]
        this.description = data["roles"]["good"]["doctor"]["description"]
        this.mission = data["roles"]["good"]["doctor"]["mission"]
        this.team = "good"
        this.hasNightAbility = data["roles"]["good"]["doctor"]["hasNightAbility"]
        this.voteCount = data["roles"]["good"]["doctor"]["voteCount"]
        this.selfUsage = data["roles"]["good"]["doctor"]["selfUsage"]
    }
    else if (type == roleTypes.Mayor) {
        this.name = data["roles"]["good"]["mayor"]["name"]
        this.description = data["roles"]["good"]["mayor"]["description"]
        this.mission = data["roles"]["good"]["mayor"]["mission"]
        this.team = "good"
        this.hasNightAbility = data["roles"]["good"]["mayor"]["hasNightAbility"]
        this.voteCount = data["roles"]["good"]["mayor"]["voteCount"]
    }
    else if (type == roleTypes.Trapper) {
        this.name = data["roles"]["good"]["trapper"]["name"]
        this.description = data["roles"]["good"]["trapper"]["description"]
        this.mission = data["roles"]["good"]["trapper"]["mission"]
        this.team = "good"
        this.hasNightAbility = data["roles"]["good"]["trapper"]["hasNightAbility"]
        this.voteCount = data["roles"]["good"]["trapper"]["voteCount"]
    }
    else if (type == roleTypes.Godfather) {
        this.name = data["roles"]["evil"]["godfather"]["name"]
        this.description = data["roles"]["evil"]["godfather"]["description"]
        this.mission = data["roles"]["evil"]["godfather"]["mission"]
        this.team = "evil"
        this.hasNightAbility = data["roles"]["evil"]["godfather"]["hasNightAbility"]
        this.voteCount = data["roles"]["evil"]["godfather"]["voteCount"]
        this.killVoteCount = data["roles"]["evil"]["godfather"]["killVoteCount"]
    }
    else if (type == roleTypes.Mafioso) {
        this.name = data["roles"]["evil"]["mafioso"]["name"]
        this.description = data["roles"]["evil"]["mafioso"]["description"]
        this.mission = data["roles"]["evil"]["mafioso"]["mission"]
        this.team = "evil"
        this.hasNightAbility = data["roles"]["evil"]["mafioso"]["hasNightAbility"]
        this.voteCount = data["roles"]["evil"]["mafioso"]["voteCount"]
        this.killVoteCount = data["roles"]["evil"]["mafioso"]["killVoteCount"]
    }
    else if (type == roleTypes.Surgeon) {
        this.name = data["roles"]["evil"]["surgeon"]["name"]
        this.description = data["roles"]["evil"]["surgeon"]["description"]
        this.mission = data["roles"]["evil"]["surgeon"]["mission"]
        this.team = "evil"
        this.hasNightAbility = data["roles"]["evil"]["surgeon"]["hasNightAbility"]
        this.voteCount = data["roles"]["evil"]["surgeon"]["voteCount"]
        this.killVoteCount = data["roles"]["evil"]["surgeon"]["killVoteCount"]
        this.selfUsage = data["roles"]["evil"]["surgeon"]["selfUsage"]
    }
    else if (type == roleTypes.Witch) {
        this.name = data["roles"]["evil"]["witch"]["name"]
        this.description = data["roles"]["evil"]["witch"]["description"]
        this.mission = data["roles"]["evil"]["witch"]["mission"]
        this.team = "evil"
        this.hasNightAbility = data["roles"]["evil"]["witch"]["hasNightAbility"]
        this.voteCount = data["roles"]["evil"]["witch"]["voteCount"]
        this.killVoteCount = data["roles"]["evil"]["witch"]["killVoteCount"]
    }
    else if (type == roleTypes.Framer) {
        this.name = data["roles"]["evil"]["framer"]["name"]
        this.description = data["roles"]["evil"]["framer"]["description"]
        this.mission = data["roles"]["evil"]["framer"]["mission"]
        this.team = "evil"
        this.hasNightAbility = data["roles"]["evil"]["framer"]["hasNightAbility"]
        this.voteCount = data["roles"]["evil"]["framer"]["voteCount"]
        this.killVoteCount = data["roles"]["evil"]["framer"]["killVoteCount"]
    }
    else if (type == roleTypes.Jester) {
        this.name = data["roles"]["neutral"]["jester"]["name"]
        this.description = data["roles"]["neutral"]["jester"]["description"]
        this.mission = data["roles"]["neutral"]["jester"]["mission"]
        this.team = "neutral"
        this.hasNightAbility = data["roles"]["neutral"]["jester"]["hasNightAbility"]
        this.voteCount = data["roles"]["neutral"]["jester"]["voteCount"]
    }
    else if (type == roleTypes.Serial_Killer) {
        this.name = data["roles"]["neutral"]["serial_killer"]["name"]
        this.description = data["roles"]["neutral"]["serial_killer"]["description"]
        this.mission = data["roles"]["neutral"]["serial_killer"]["mission"]
        this.team = "neutral"
        this.hasNightAbility = data["roles"]["neutral"]["serial_killer"]["hasNightAbility"]
        this.voteCount = data["roles"]["neutral"]["serial_killer"]["voteCount"]
        this.killVoteCount = data["roles"]["neutral"]["serial_killer"]["killVoteCount"]
    }
    else if (type == roleTypes.Executioner) {
        this.name = data["roles"]["neutral"]["executioner"]["name"]
        this.description = data["roles"]["neutral"]["executioner"]["description"]
        this.mission = data["roles"]["neutral"]["executioner"]["mission"]
        this.team = "neutral"
        this.hasNightAbility = data["roles"]["neutral"]["executioner"]["hasNightAbility"]
        this.voteCount = data["roles"]["neutral"]["executioner"]["voteCount"]
    }
    else if (type == roleTypes.Lawyer) {
        this.name = data["roles"]["neutral"]["lawyer"]["name"]
        this.description = data["roles"]["neutral"]["lawyer"]["description"]
        this.mission = data["roles"]["neutral"]["lawyer"]["mission"]
        this.team = "neutral"
        this.hasNightAbility = data["roles"]["neutral"]["lawyer"]["hasNightAbility"]
        this.voteCount = data["roles"]["neutral"]["lawyer"]["voteCount"]
    }
}

function getJson(data) {
    console.log(data["roles"]["good"])
}



function Player(
    playerName,
    role,
    isKilled,
    isLynched,
    killedBy,
    isProtected,
    isTargeted,
    isBlocked,
    isDisguised
) {
    this.playerName = playerName;
    this.role = role;
    this.isKilled = isKilled;
    this.isLynched = isLynched;
    this.killedBy = killedBy;
    this.isProtected = isProtected;
    this.isTargeted = isTargeted;
    this.isBlocked = isBlocked;
    this.isDisguised = isDisguised;
}
