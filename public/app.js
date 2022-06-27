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
        jsonData = data
        var test = new Role(roleTypes.Doctor)

        console.log(test)
        var p1 = new Player("petos", new Role(roleTypes.Villager))
        var p2 = new Player("petos2", new Role(roleTypes.Investigator))
        var p3 = new Player("petos3", new Role(roleTypes.Doctor))
        players = []
        players.push(p1)
        players.push(p2)
        players.push(p3)
        console.log(p1)
        console.log(p2)
        console.log(p2.role.type)
        Player.useAbility(p2, p1)
        Player.useAbility(p3, p2)

    })
    .catch((err) => {
        // Do something for an error here
    });


function Role(type) {
    this.type = type
    if (type == roleTypes.Villager) {
        this.name = jsonData["roles"]["good"]["villager"]["name"]
        this.description = jsonData["roles"]["good"]["villager"]["description"]
        this.mission = jsonData["roles"]["good"]["villager"]["mission"]
        this.team = "good"
        this.hasNightAbility = jsonData["roles"]["good"]["villager"]["hasNightAbility"]
        this.voteCount = jsonData["roles"]["good"]["villager"]["voteCount"]
    }
    else if (type == roleTypes.Investigator) {
        this.name = jsonData["roles"]["good"]["investigator"]["name"]
        this.description = jsonData["roles"]["good"]["investigator"]["description"]
        this.mission = jsonData["roles"]["good"]["investigator"]["mission"]
        this.team = "good"
        this.hasNightAbility = jsonData["roles"]["good"]["investigator"]["hasNightAbility"]
        this.voteCount = jsonData["roles"]["good"]["investigator"]["voteCount"]
    }
    else if (type == roleTypes.Doctor) {
        this.name = jsonData["roles"]["good"]["doctor"]["name"]
        this.description = jsonData["roles"]["good"]["doctor"]["description"]
        this.mission = jsonData["roles"]["good"]["doctor"]["mission"]
        this.team = "good"
        this.hasNightAbility = jsonData["roles"]["good"]["doctor"]["hasNightAbility"]
        this.voteCount = jsonData["roles"]["good"]["doctor"]["voteCount"]
        this.selfUsage = jsonData["roles"]["good"]["doctor"]["selfUsage"]
    }
    else if (type == roleTypes.Mayor) {
        this.name = jsonData["roles"]["good"]["mayor"]["name"]
        this.description = jsonData["roles"]["good"]["mayor"]["description"]
        this.mission = jsonData["roles"]["good"]["mayor"]["mission"]
        this.team = "good"
        this.hasNightAbility = jsonData["roles"]["good"]["mayor"]["hasNightAbility"]
        this.voteCount = jsonData["roles"]["good"]["mayor"]["voteCount"]
    }
    else if (type == roleTypes.Trapper) {
        this.name = jsonData["roles"]["good"]["trapper"]["name"]
        this.description = jsonData["roles"]["good"]["trapper"]["description"]
        this.mission = jsonData["roles"]["good"]["trapper"]["mission"]
        this.team = "good"
        this.hasNightAbility = jsonData["roles"]["good"]["trapper"]["hasNightAbility"]
        this.voteCount = jsonData["roles"]["good"]["trapper"]["voteCount"]
    }
    else if (type == roleTypes.Godfather) {
        this.name = jsonData["roles"]["evil"]["godfather"]["name"]
        this.description = jsonData["roles"]["evil"]["godfather"]["description"]
        this.mission = jsonData["roles"]["evil"]["godfather"]["mission"]
        this.team = "evil"
        this.hasNightAbility = jsonData["roles"]["evil"]["godfather"]["hasNightAbility"]
        this.voteCount = jsonData["roles"]["evil"]["godfather"]["voteCount"]
        this.killVoteCount = jsonData["roles"]["evil"]["godfather"]["killVoteCount"]
    }
    else if (type == roleTypes.Mafioso) {
        this.name = jsonData["roles"]["evil"]["mafioso"]["name"]
        this.description = jsonData["roles"]["evil"]["mafioso"]["description"]
        this.mission = jsonData["roles"]["evil"]["mafioso"]["mission"]
        this.team = "evil"
        this.hasNightAbility = jsonData["roles"]["evil"]["mafioso"]["hasNightAbility"]
        this.voteCount = jsonData["roles"]["evil"]["mafioso"]["voteCount"]
        this.killVoteCount = jsonData["roles"]["evil"]["mafioso"]["killVoteCount"]
    }
    else if (type == roleTypes.Surgeon) {
        this.name = jsonData["roles"]["evil"]["surgeon"]["name"]
        this.description = jsonData["roles"]["evil"]["surgeon"]["description"]
        this.mission = jsonData["roles"]["evil"]["surgeon"]["mission"]
        this.team = "evil"
        this.hasNightAbility = jsonData["roles"]["evil"]["surgeon"]["hasNightAbility"]
        this.voteCount = jsonData["roles"]["evil"]["surgeon"]["voteCount"]
        this.killVoteCount = jsonData["roles"]["evil"]["surgeon"]["killVoteCount"]
        this.selfUsage = jsonData["roles"]["evil"]["surgeon"]["selfUsage"]
    }
    else if (type == roleTypes.Witch) {
        this.name = jsonData["roles"]["evil"]["witch"]["name"]
        this.description = jsonData["roles"]["evil"]["witch"]["description"]
        this.mission = jsonData["roles"]["evil"]["witch"]["mission"]
        this.team = "evil"
        this.hasNightAbility = jsonData["roles"]["evil"]["witch"]["hasNightAbility"]
        this.voteCount = jsonData["roles"]["evil"]["witch"]["voteCount"]
        this.killVoteCount = jsonData["roles"]["evil"]["witch"]["killVoteCount"]
    }
    else if (type == roleTypes.Framer) {
        this.name = jsonData["roles"]["evil"]["framer"]["name"]
        this.description = jsonData["roles"]["evil"]["framer"]["description"]
        this.mission = jsonData["roles"]["evil"]["framer"]["mission"]
        this.team = "evil"
        this.hasNightAbility = jsonData["roles"]["evil"]["framer"]["hasNightAbility"]
        this.voteCount = jsonData["roles"]["evil"]["framer"]["voteCount"]
        this.killVoteCount = jsonData["roles"]["evil"]["framer"]["killVoteCount"]
    }
    else if (type == roleTypes.Jester) {
        this.name = jsonData["roles"]["neutral"]["jester"]["name"]
        this.description = jsonData["roles"]["neutral"]["jester"]["description"]
        this.mission = jsonData["roles"]["neutral"]["jester"]["mission"]
        this.team = "neutral"
        this.hasNightAbility = jsonData["roles"]["neutral"]["jester"]["hasNightAbility"]
        this.voteCount = jsonData["roles"]["neutral"]["jester"]["voteCount"]
    }
    else if (type == roleTypes.Serial_Killer) {
        this.name = jsonData["roles"]["neutral"]["serial_killer"]["name"]
        this.description = jsonData["roles"]["neutral"]["serial_killer"]["description"]
        this.mission = jsonData["roles"]["neutral"]["serial_killer"]["mission"]
        this.team = "neutral"
        this.hasNightAbility = jsonData["roles"]["neutral"]["serial_killer"]["hasNightAbility"]
        this.voteCount = jsonData["roles"]["neutral"]["serial_killer"]["voteCount"]
        this.killVoteCount = jsonData["roles"]["neutral"]["serial_killer"]["killVoteCount"]
    }
    else if (type == roleTypes.Executioner) {
        this.name = jsonData["roles"]["neutral"]["executioner"]["name"]
        this.description = jsonData["roles"]["neutral"]["executioner"]["description"]
        this.mission = jsonData["roles"]["neutral"]["executioner"]["mission"]
        this.team = "neutral"
        this.hasNightAbility = jsonData["roles"]["neutral"]["executioner"]["hasNightAbility"]
        this.voteCount = jsonData["roles"]["neutral"]["executioner"]["voteCount"]
    }
    else if (type == roleTypes.Lawyer) {
        this.name = jsonData["roles"]["neutral"]["lawyer"]["name"]
        this.description = jsonData["roles"]["neutral"]["lawyer"]["description"]
        this.mission = jsonData["roles"]["neutral"]["lawyer"]["mission"]
        this.team = "neutral"
        this.hasNightAbility = jsonData["roles"]["neutral"]["lawyer"]["hasNightAbility"]
        this.voteCount = jsonData["roles"]["neutral"]["lawyer"]["voteCount"]
    }
}

function Player(
    playerName,
    role,
    isKilled = false,
    isLynched = false,
    killedBy = false,
    isProtected = false,
    isTargeted = false,
    isBlocked = false,
    isDisguised = false
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
    this.fakeTeam = ""
}

/**
 * use ability of player
 * @param {Player} player 
 * @param {Player} target 
 */
Player.useAbility = function(player, target) {
    if (player.role.hasNightAbility) {
        if (player.isBlocked == false) {
            if (player.role.type == roleTypes.Investigator) {
                console.log(target.playerName, "is:", target.role.team)
            }
            else if (player.role.type == roleTypes.Doctor) {
                if (player == target && player.role.selfUsage == 1) {
                    player.role.selfUsage = 0
                    console.log("Your self uses:", player.role.selfUsage)
                }
                console.log("You protect", target.playerName)
                target.isProtected = true
                console.log(target.isProtected)
            }
            else if (player.role.type == roleTypes.Trapper) {
                console.log("You trap", target.playerName)
                target.isBlocked = true
                console.log(target.isBlocked)
            }
            else if (player.role.type == roleTypes.Surgeon) {
                if (target.team == "evil") {
                    if (player == target && player.role.selfUsage == 1) {
                        player.role.selfUsage = 0
                        console.log("Your self uses:", player.role.selfUsage)
                    }
                    console.log("You disguise", target.playerName)
                    target.isDisguised = true
                    console.log(target.isDisguised)
                }
            }
            else if (player.role.type == roleTypes.Witch) {
                if (target.team != "evil") {
                    console.log("You cast a freeze spell on", target.playerName)
                    target.isBlocked = true
                    console.log(target.isBlocked)
                }
            }
            else if (player.role.type == roleTypes.Framer) {
                if (target.team != "evil") {
                    console.log("You plant evidence on", target.playerName)
                    target.isDisguised = true
                    console.log(target.isDisguised)
                }
            }
        }
        
    }
}

Player.vote = function(player, target) {

}

Player.kill = function(player, target) {

}

function disguiseChecker() {
    players.forEach(player => {
        if (player.isDisguised) {
            if (player.role.team == "good") {
                player.fakeTeam = "evil"
            }
            else if (player.role.team == "evil") {
                player.fakeTeam = "good"
            }
        }
    })
}