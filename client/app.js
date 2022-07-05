const socket = io("http://localhost:3000/")


socket.on("connect", () => {
    console.log("You connect with id", socket.id)
});

socket.on('counter', function(count) {
    var display = document.querySelector('#time')
    display.innerText = count
})

function displayJoin() {
    document.getElementById("join-room-overlay").style.display = "block";
    document.getElementById("join-room").style.display = "flex";
}

function hideJoin() {
    document.getElementById("join-room-overlay").style.display = "none";
    document.getElementById("join-room").style.display = "none";
    document.getElementById("join-help").style.display = "none";
    document.getElementById("code").value = "";
    document.getElementById("code").style.border = "2px solid #b1b1b1";
}

function checkRoomCode() {
    var inputVal = document.getElementById("code").value;
    if (inputVal.length !== 5) {
        document.getElementById("join-help").style.display = "flex";
        document.getElementById("code").style.border = "2px solid #b1b1b1";
        document.getElementById("join-help").innerText = "Code needs to be 5 characters long";
    } else {
        document.getElementById("join-help").style.display = "none";
        document.getElementById("code").style.border = "2px solid hsl(123, 100%, 45%)";
    }
    // check if room exists (has been created)
}

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
        var theVillager = new Player("petos", new Role(roleTypes.Villager))
        var theInvestigator = new Player("petos2", new Role(roleTypes.Investigator))
        var theDoctor = new Player("petos3", new Role(roleTypes.Doctor))
        var theTrapper = new Player("petos4", new Role(roleTypes.Trapper))
        var theFramer = new Player("petos5", new Role(roleTypes.Framer))
        players = []
        players.push(theVillager)
        players.push(theInvestigator)
        players.push(theDoctor)
        players.push(theTrapper)
        players.push(theFramer)
        // console.log(p1)
        // console.log(p2)
        // console.log(p2.role.type)
        Player.useAbility(theInvestigator, theVillager)
        Player.useAbility(theFramer, theDoctor)
        Player.useAbility(theInvestigator, theFramer)
        Player.useAbility(theInvestigator, theDoctor)
        Player.useAbility(theTrapper, theFramer)
        Player.useAbility(theFramer, Villager)

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
    this.abilityTarget = null;
    this.voteTarget = null;
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
                if (target.isDisguised) {
                    console.log(target.playerName, "is:", target.fakeTeam)
                    
                } else {
                    console.log(target.playerName, "is:", target.role.team)
                }
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
                    disguiseChecker()
                }
            }
        }
        
    }
}

Player.vote = function(player, target) {

}

Player.kill = function(player, target) {
    if (player.isBlocked == false) {
        if (target.isProtected == false) {
            if (player.role.type == roleTypes.Serial_Killer) {
                console.log("You kill", target.playerName)
                target.isKilled = true
                console.log(target.isKilled)
            }
        }

    }
}

function disguiseChecker() {
    console.log("it is working")
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

function newCycle() {
    // reset player values if player is NOT lynched or NOT killed
    // exception for executioner where they will be alive, but their target can be dead (they turn into jester)
}