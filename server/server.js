// server set up
const express = require("express");
const app = express();
const port = 3000;
const server = require("http").createServer(app);
const io = require("socket.io")(server, {});

server.listen(port, () => {
  console.log("Server listening at port %d", port);
});

var __dirname = "/mnt/c/Users/petru/Documents/Code/eyesopen/public/";

// // random string generator
var randomstring = require("randomstring");

var { Room } = require("./room");
var { Game } = require("./game");
var { Player } = require("./player");
var { User } = require("./user");

const minPlayers = 3;
const maxPlayers = 14;

var rooms = new Map();
var connectedUsers = new Map();

// static folder
app.use(express.static("public"));

app.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});
// app.use(express.urlencoded({ extended: true }));

// serving public file
app.get("/", (req, res) => {
  res.sendFile(__dirname + "index.html");
});
app.get("/lobby/", (req, res) => {
  res.sendFile(__dirname + "404.html");
});
app.get("/lobby/:id", (req, res) => {
  if (rooms.has(req.params.id)) {
    res.sendFile(__dirname + "lobby.html");
  } else {
    res.sendFile(__dirname + "404.html");
  }
});

app.get("/lobby/:id/join", (req, res) => {
  if (rooms.has(req.params.id)) {
    res.sendFile(__dirname + "join.html");
  } else {
    res.sendFile(__dirname + "404.html");
  }
});

var timeDurations = {
  discussion: 45,
  voting: 25,
  night: 30,
  test: 5,
};
var counter = timeDurations.voting;
var jsonData = require('./roles.json');

test();
function test() {
// var test = new Role(roleTypes.Doctor);
//     console.log(test);
//     var theVillager = new Player("petos", new Role(roleTypes.Villager));
//     var theInvestigator = new Player(
//       "petos2",
//       new Role(roleTypes.Investigator)
//     );
//     var theDoctor = new Player("petos3", new Role(roleTypes.Doctor));
//     var theTrapper = new Player("petos4", new Role(roleTypes.Trapper));
//     var theFramer = new Player("petos5", new Role(roleTypes.Framer));
//     players = [];
//     players.push(theVillager);
//     players.push(theInvestigator);
//     players.push(theDoctor);
//     players.push(theTrapper);
//     players.push(theFramer);
//     // console.log(p1)
//     // console.log(p2)
//     // console.log(p2.role.type)
//     Player.useAbility(theInvestigator, theVillager);
//     Player.useAbility(theFramer, theDoctor);
//     Player.useAbility(theInvestigator, theFramer);
//     Player.useAbility(theInvestigator, theDoctor);
//     Player.useAbility(theTrapper, theFramer);
//     Player.useAbility(theFramer, Villager);
}

// establish server connection with socket
io.on("connection", async (socket) => {
  console.log("a user connected, with socket id:", socket.id);
  // reassign sockets to their playerID rooms (if they have a playerID)
  socket.on("setRoom", (playerID) => {
    console.log(`player ${playerID} is joining their own room`);
    socket.join(playerID);

    for (var [key, value] of rooms) {
      if (value.getHost() == playerID) {
        console.log(`player ${playerID} is joining their created room`);
        socket.join(key);
      }
    }
    console.log("setting rooms");
    console.log(socket.rooms);
  });

  socket.on("disconnect", () => {
    let playerID = socket.data.playerID;
    if (checkUserExist(playerID)) {
      var targetRoom = connectedUsers.get(playerID).getCurrentRoom();
      console.log("targetroom", targetRoom);
      if (targetRoom !== null) {
        connectedUsers.get(playerID).setReady(false);
        io.to(connectedUsers.get(playerID).getCurrentRoom()).emit(
          "ready-status",
          rooms.get(targetRoom).getUsers()
        );
        clearPlayerSlot(playerID);
        // remove user from room
        rooms.get(targetRoom).removeUser(connectedUsers.get(playerID));
        updatePlayerCount(playerID);
        io.to(connectedUsers.get(playerID).getCurrentRoom()).emit(
          "rolePickConditionDisconnect",
          false
        );
        // TODO: check for requirement instead???
        updateRoles();
        // socket leaves room
        socket.leave(targetRoom);
        console.log("leaving room", targetRoom);
        console.log(socket.rooms);
      }
    }
  });

  socket.on("fetchRoles", (playerID, state) => {
    if (checkUserExist(playerID)) {
      if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
        var roomCode = connectedUsers.get(playerID).getCurrentRoom();
        var emitTo = "";
        if (state.includes("connect")) {
          emitTo = "fetchedRolesConnect";
        } else if (state.includes("after")) {
          emitTo = "fetchedRolesAfter";
        } else if (state.includes("disconnect")) {
          emitTo = "fetchedRolesDisconnect";
        }
        io.to(connectedUsers.get(playerID).getCurrentRoom()).emit(
          emitTo,
          rooms.get(roomCode).getRoles()
        );
      }
    }
  });

  socket.on("checkUser", (playerID) => {
    if (checkUserExist(playerID)) {
      socket.emit("userExists", true);
    } else {
      socket.emit("userExists", false);
    }
  });

  // generate playerID for sockets that request one
  socket.on("requestID", (socketID, playerID) => {
    if (!checkUserExist(playerID)) {
      console.log(socketID, "requesting player ID");
      var playerID = randomstring.generate(6);
      socket.emit("playerID", playerID);
    }
  });

  // log if player has created an ID
  socket.on("completedID", (playerID) => {
    console.log("player", playerID, "has created an ID");
  });

  function checkUserExist(playerID) {
    if (connectedUsers.has(playerID)) {
      return true;
    } else {
      return false;
    }
  }

  // log if a host has just input their name and is about to generate a room
  socket.on("createUser", (name, playerID) => {
    if (!checkUserExist(playerID)) {
      console.log("name:", name, ", playerID:", playerID);
      connectedUsers.set(playerID, new User(playerID, name));
      console.log("Users:", connectedUsers);
    }
  });

  function hostInLobby(roomCode) {
    var room = rooms.get(roomCode);
    if (room.getUsers().includes(connectedUsers.get(room.getHost()))) {
      return true;
    } else {
      return false;
    }
  }

  function amountUnready(roomCode) {
    var room = rooms.get(roomCode);
    var ready = 0;
    for (var i = 0; i < room.getUsers().length; i++) {
      if (room.getUsers()[i].getReady() == true) {
        ready++;
      }
    }
    return room.getUsers().length - ready;
  }

  function checkForAlreadyExistingUser(roomCode, playerID) {
    var room = rooms.get(roomCode);
    if (checkUserExist(playerID)) {
      if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
        if (!room.getUsers().includes(connectedUsers.get(playerID))) {
          room.addUser(connectedUsers.get(playerID));
        }
      }
    }
  }

  socket.on("refreshReady", (playerID) => {
    if (checkUserExist(playerID)) {
      if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
        var roomCode = connectedUsers.get(playerID).getCurrentRoom();
        var notReady = false;
        connectedUsers.get(playerID).setReady(notReady);
        io.to(connectedUsers.get(playerID).getCurrentRoom()).emit(
          "ready-status",
          rooms.get(roomCode).getUsers()
        );
      }
    }
  });

  socket.on("player-unready", (playerID) => {
    if (checkUserExist(playerID)) {
      if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
        var roomCode = connectedUsers.get(playerID).getCurrentRoom();
        var notReady = false;
        connectedUsers.get(playerID).setReady(notReady);
        updatePlayerCount(playerID);
        io.to(connectedUsers.get(playerID).getCurrentRoom()).emit(
          "ready-status",
          rooms.get(roomCode).getUsers()
        );
      }
    }
  });

  function checkAllReady(roomCode, playerID) {
    var count = 0;
    if (checkUserExist(playerID)) {
      if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
        for (var i = 0; i < rooms.get(roomCode).getUsers().length; i++) {
          if (rooms.get(roomCode).getUsers()[i].getReady()) {
            count++;
          }
        }
        if (count == rooms.get(roomCode).getUsers().length) {
          return true;
        } else {
          return false;
        }
      }
    }
  }

  socket.on("player-ready", (playerID) => {
    if (checkUserExist(playerID)) {
      if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
        var roomCode = connectedUsers.get(playerID).getCurrentRoom();
        var ready = true;
        connectedUsers.get(playerID).setReady(ready);
        updatePlayerCount(playerID);
        io.to(connectedUsers.get(playerID).getCurrentRoom()).emit(
          "ready-status",
          rooms.get(roomCode).getUsers()
        );
      }
    }
  });

  socket.on("joinedLobby", (playerID) => {
    if (checkUserExist(playerID)) {
      if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
        var roomCode = connectedUsers.get(playerID).getCurrentRoom();
        socket.join(connectedUsers.get(playerID).getCurrentRoom());

        socket.emit("viewRoom", roomCode);
        socket.emit(
          "viewPlayerCount",
          amountUnready(roomCode),
          hostInLobby(roomCode),
          connectedUsers.get(rooms.get(roomCode).getHost()).getName(),
          checkAllReady(roomCode, playerID),
          rooms.get(roomCode).getUsers().length,
          rooms.get(roomCode).getRoles().length
        );
        console.log(socket.rooms);
        console.log(connectedUsers.get(playerID));
        socket.emit("joinPlayerSlot");
      }
    }
    socket.data.playerID = playerID;
  });

  function updatePlayerCount(playerID) {
    if (checkUserExist(playerID)) {
      if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
        var roomCode = connectedUsers.get(playerID).getCurrentRoom();
        io.to(connectedUsers.get(playerID).getCurrentRoom()).emit(
          "viewPlayerCount",
          amountUnready(roomCode),
          hostInLobby(roomCode),
          connectedUsers.get(rooms.get(roomCode).getHost()).getName(),
          checkAllReady(roomCode, playerID),
          rooms.get(roomCode).getUsers().length,
          rooms.get(roomCode).getRoles().length
        );
      }
    }
  }

  socket.on("directJoin", (playerID, directRoom) => {
    if (checkUserExist(playerID)) {
      if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
        connectedUsers.get(playerID).setCurrentRoom(directRoom);
        var roomCode = connectedUsers.get(playerID).getCurrentRoom();
        socket.join(connectedUsers.get(playerID).getCurrentRoom());
        checkForAlreadyExistingUser(roomCode, playerID);
        socket.emit("viewRoom", roomCode);
        io.to(connectedUsers.get(playerID).getCurrentRoom()).emit(
          "viewPlayerCount",
          amountUnready(roomCode),
          hostInLobby(roomCode),
          connectedUsers.get(rooms.get(roomCode).getHost()).getName(),
          checkAllReady(roomCode, playerID),
          rooms.get(roomCode).getUsers().length,
          rooms.get(roomCode).getRoles().length
        );
        console.log(socket.rooms);
        console.log(connectedUsers.get(playerID));
        socket.emit("joinPlayerSlot");
      }
    }
    socket.data.playerID = playerID;
  });

  socket.on("requestPlayerSlot", (playerID) => {
    if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
      var roomCode = connectedUsers.get(playerID).getCurrentRoom();
      var room = rooms.get(roomCode);
      var slotAlreadyExist = false;
      for (var [key, value] of Object.entries(room.slots)) {
        if (value.userID == playerID) {
          slotAlreadyExist = true;
        }
      }
      if (!slotAlreadyExist) {
        for (var [key, value] of Object.entries(room.slots)) {
          if (value.taken == false) {
            room.slots[key]["taken"] = true;
            room.slots[key]["userID"] = playerID;
            room.slots[key]["userName"] = connectedUsers
              .get(playerID)
              .getName();
            io.to(connectedUsers.get(playerID).getCurrentRoom()).emit(
              "playerSlots",
              room.getHost(),
              room.slots
            );
            break;
          }
        }
      }
    }
  });

  function clearPlayerSlot(playerID) {
    if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
      var roomCode = connectedUsers.get(playerID).getCurrentRoom();
      var room = rooms.get(roomCode);
      for (var [key, value] of Object.entries(room.slots)) {
        if (value.userID == playerID) {
          room.slots[key]["taken"] = false;
          room.slots[key]["userID"] = undefined;
          room.slots[key]["userName"] = "";
          io.to(connectedUsers.get(playerID).getCurrentRoom()).emit(
            "playerSlots",
            room.getHost(),
            room.slots
          );
          break;
        }
      }
    }
  }

  socket.on("checkIfHost", (playerID, emission) => {
    if (checkUserExist(playerID)) {
      if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
        var roomCode = connectedUsers.get(playerID).getCurrentRoom();
        if (rooms.get(roomCode).getHost() == playerID) {
          var emitTo = "";
          if (emission.includes("visibility")) {
            emitTo = "isHost";
          } else if (emission.includes("roles")) {
            emitTo = "isHostRoles";
          } else if (emission.includes("start")) {
            emitTo = "isHostStart";
          }
          socket.emit(emitTo, true);
        } else {
          var emitTo = "";
          if (emission.includes("visibility")) {
            emitTo = "isHost";
          } else if (emission.includes("roles")) {
            emitTo = "isHostRoles";
          } else if (emission.includes("start")) {
            emitTo = "isHostStart";
          }
          socket.emit(emitTo, false);
        }
      }
    }
  });

  function checkAlreadyHost(rooms, playerID) {
    for (var [key, value] of rooms) {
      console.log("room:", key, "host", value.getHost());
      if (value.getHost() == playerID) {
        return true;
      }
    }
    console.log(`${playerID} is not a host yet`);
    return false;
  }

  function getHostRoom(rooms, playerID) {
    for (var [key, value] of rooms) {
      console.log("room:", key, "host", value.getHost());
      if (value.getHost() == playerID) {
        return key;
      }
    }
    console.log(`${playerID} did not find the host room`);
    return null;
  }

  function getRoom(rooms, playerID) {
    for (var [key, value] of rooms) {
      console.log("room:", key, "users", value.getUsers());
      if (value.getUsers().includes(playerID)) {
        return key;
      }
    }
    console.log(`${playerID} did not find the room`);
    return null;
  }

  socket.on("fetchHostRoom", (playerID) => {
    if (checkUserExist(playerID)) {
      socket.emit("hostRoom", getHostRoom(rooms, playerID));
    }
  });

  // handle room creation
  socket.on("createRoom", (playerID) => {
    var temp = Array.from(rooms.entries());
    var count = 0;
    if (checkUserExist(playerID)) {
      if (temp.length > 0) {
        if (checkAlreadyHost(rooms, playerID) == false) {
          var roomCode = randomstring.generate({
            length: 5,
            charset: "alphanumeric",
            capitalization: "uppercase",
          });
          // Setting up room
          connectedUsers.get(playerID).setCurrentRoom(roomCode);
          rooms.set(roomCode, new Room(playerID));
          checkForAlreadyExistingUser(roomCode, playerID);

          console.log("room", roomCode, "created");
          console.log(socket.id, "joined", roomCode);

          // Log rooms that socket is in
          console.log(rooms);
        } else {
          var hostRoom = getHostRoom(rooms, playerID);
          if (hostRoom !== null) {
            connectedUsers.get(playerID).setCurrentRoom(hostRoom);
          }
        }
      } else {
        var roomCode = randomstring.generate({
          length: 5,
          charset: "alphanumeric",
          capitalization: "uppercase",
        });
        // Setting up room
        connectedUsers.get(playerID).setCurrentRoom(roomCode);
        rooms.set(roomCode, new Room(playerID));
        checkForAlreadyExistingUser(roomCode, playerID);

        console.log("room", roomCode, "created");
        console.log(socket.id, "joined", roomCode);

        // Log rooms that socket is in
        console.log(rooms);
      }
      console.log("room in:", socket.rooms);
    }
  });

  // handling room joining
  socket.on("checkRoomCode", (roomCode, playerID) => {
    console.log("this player", playerID);
    if (checkUserExist(playerID)) {
      console.log(playerID, "trying roomcode", roomCode);
      if (rooms.has(roomCode)) {
        if (rooms.get(roomCode).userCount() == maxPlayers) {
          socket.emit("roomCodeResponse", "full");
        } else {
          console.log("room code", roomCode, "is valid");
          console.log(socket.rooms);
          socket.emit("roomCodeResponse", "valid");
          if (connectedUsers.get(playerID).getCurrentRoom() !== roomCode) {
            if (rooms.get(roomCode).getUsers().includes(playerID)) {
              console.log("user already in room");
            } else {
              connectedUsers.get(playerID).setCurrentRoom(roomCode);
            }
          }
        }
      } else {
        socket.emit("roomCodeResponse", "invalid");
      }
      console.log(rooms.get(roomCode));
    }
  });

  function checkRolePick(roomCode, playerID, totalRoles, emitTo) {
    // ONLY GOOD IS NOT ALLOWED
    // ONLY EVIL IS NOT ALLOWED
    // ONLY EVIL + LAWYER is NOT ALLOWED
    var goodRoles = 0;
    var evilRoles = 0;
    var neutralRoles = 0;
    var lawyerPicked = false;
    for (var i = 0; i < totalRoles; i++) {
      var current = jsonData["roles"][rooms.get(roomCode).getRoles()[i]].team;
      var roleName = jsonData["roles"][rooms.get(roomCode).getRoles()[i]].name;
      if (roleName == "lawyer") {
        lawyerPicked = true;
      }
      if (current == "good") {
        goodRoles++;
      } else if (current == "evil") {
        evilRoles++;
      } else if (current == "neutral") {
        neutralRoles++;
      }
    }

    if (goodRoles !== totalRoles && evilRoles !== totalRoles && (evilRoles !== totalRoles - 1 || !lawyerPicked)) {
      console.log("wrong condition handling")
      io.to(connectedUsers.get(playerID).getCurrentRoom()).emit(
        emitTo,
        true
        );
      } else {
      io.to(connectedUsers.get(playerID).getCurrentRoom()).emit(
        emitTo,
        false
      );
    }
  }

  socket.on("checkRolePick", (playerID, state) => {
    if (checkUserExist(playerID)) {
      if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
        var roomCode = connectedUsers.get(playerID).getCurrentRoom();
        if (rooms.get(roomCode).getHost() == playerID) {
          var emitTo = "";
          if (state.includes("pick")) {
            emitTo = "rolePickCondition";
          } else if (state.includes("connect")) {
            emitTo = "rolePickConditionConnect";
          } else if (state.includes("disconnect")) {
            emitTo = "rolePickConditionDisconnect";
          }
          var totalRoles = rooms.get(roomCode).getRoles().length;
          var totalUsers = rooms.get(roomCode).getUsers().length;
          if (totalRoles < minPlayers || totalUsers < minPlayers) {
            io.to(connectedUsers.get(playerID).getCurrentRoom()).emit(
              emitTo,
              false
            );
          } else {
            checkRolePick(roomCode, playerID, totalRoles, emitTo);
          }
          
         
        }
      }
    }
  })

  socket.on("checkRoleCount", (playerID, state) => {
    if (checkUserExist(playerID)) {
      if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
        var roomCode = connectedUsers.get(playerID).getCurrentRoom();
        if (rooms.get(roomCode).getHost() == playerID) {
          var emitTo = "";
          if (state.includes("before")) {
            emitTo = "roleCountBefore";
          } else if (state.includes("after")) {
            emitTo = "roleCountAfter";

          }
          io.to(connectedUsers.get(playerID).getCurrentRoom()).emit(
            emitTo,
            rooms.get(roomCode).getRoles().length,
            rooms.get(roomCode).getUsers().length
          );
        }
      }
    }
  });

  function updateRoles(roomCode, playerID) {
    if (checkUserExist(playerID)) {
      if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
        var roomCode = connectedUsers.get(playerID).getCurrentRoom();
        io.to(connectedUsers.get(playerID).getCurrentRoom()).emit(
          "fetchedRolesDisconnect",
          rooms.get(roomCode).getRoles()
        );
        console.log(rooms.get(roomCode).getRoles());
      }
    }
  }

  // PLAYERS == ROLES - UPDATE REQUIREMENT WHEN
  // NOT OF SAME TEAM (EVIL AND GOOD) - RED BORDER
  // GREYED OUT BUTTONS WHEN have PICKED max
  socket.on("pickRole", (playerID, role, op) => {
    if (checkUserExist(playerID)) {
      if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
        var roomCode = connectedUsers.get(playerID).getCurrentRoom();
        if (rooms.get(roomCode).getHost() == playerID) {
          if (op.includes("add")) {
            if (!rooms.get(roomCode).getRoles().includes(role)) {
              rooms.get(roomCode).addRole(role);
            }
          } else if (op.includes("remove")) {
            if (rooms.get(roomCode).getRoles().includes(role)) {
              rooms.get(roomCode).removeRole(role);
            }
          }
          // io.to(connectedUsers.get(playerID).getCurrentRoom()).emit("updatedRoles", rooms.get(roomCode).getRoles());
          console.log(rooms.get(roomCode).getRoles());
        }
      }
    }
  });
});

var time = setInterval(function () {
  io.emit("counter", counter);
  // ! DEBUG TIME
  // console.log("counter from server:", counter);
  if (counter <= 0) {
    clearInterval(time);
    // next phase
  } else {
    counter--;
  }
}, 1000);

// var count = io.engine.clientsCount;
// // may or may not be similar to the count of Socket instances in the main namespace, depending on your usage
// var count2 = io.of("/").sockets.size;
// console.log(count);
// console.log(count2);

// Game related

function disguiseChecker() {
  console.log("it is working");
  // !! DO NOT USE FOR EACH HERE, THINK ABOUT IT FIRST
  players.forEach((player) => {
    if (player.isDisguised) {
      if (player.role.team == "good") {
        player.fakeTeam = "evil";
      } else if (player.role.team == "evil") {
        player.fakeTeam = "good";
      }
    }
  });
}

function newCycle() {
  // reset player values if player is NOT lynched or NOT killed
  // exception for executioner where they will be alive, but their target can be dead (they turn into jester)
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
  SerialKiller: "serial killer",
  Executioner: "executioner",
  Lawyer: "lawyer",
};



function Role(type) {
  this.type = type;
  if (type == roleTypes.Villager) {
    this.name = jsonData["roles"]["good"]["villager"]["name"];
    this.description = jsonData["roles"]["good"]["villager"]["description"];
    this.mission = jsonData["roles"]["good"]["villager"]["mission"];
    this.team = "good";
    this.hasNightAbility =
      jsonData["roles"]["good"]["villager"]["hasNightAbility"];
    this.voteCount = jsonData["roles"]["good"]["villager"]["voteCount"];
  } else if (type == roleTypes.Investigator) {
    this.name = jsonData["roles"]["good"]["investigator"]["name"];
    this.description = jsonData["roles"]["good"]["investigator"]["description"];
    this.mission = jsonData["roles"]["good"]["investigator"]["mission"];
    this.team = "good";
    this.hasNightAbility =
      jsonData["roles"]["good"]["investigator"]["hasNightAbility"];
    this.voteCount = jsonData["roles"]["good"]["investigator"]["voteCount"];
  } else if (type == roleTypes.Doctor) {
    this.name = jsonData["roles"]["good"]["doctor"]["name"];
    this.description = jsonData["roles"]["good"]["doctor"]["description"];
    this.mission = jsonData["roles"]["good"]["doctor"]["mission"];
    this.team = "good";
    this.hasNightAbility =
      jsonData["roles"]["good"]["doctor"]["hasNightAbility"];
    this.voteCount = jsonData["roles"]["good"]["doctor"]["voteCount"];
    this.selfUsage = jsonData["roles"]["good"]["doctor"]["selfUsage"];
  } else if (type == roleTypes.Mayor) {
    this.name = jsonData["roles"]["good"]["mayor"]["name"];
    this.description = jsonData["roles"]["good"]["mayor"]["description"];
    this.mission = jsonData["roles"]["good"]["mayor"]["mission"];
    this.team = "good";
    this.hasNightAbility =
      jsonData["roles"]["good"]["mayor"]["hasNightAbility"];
    this.voteCount = jsonData["roles"]["good"]["mayor"]["voteCount"];
  } else if (type == roleTypes.Trapper) {
    this.name = jsonData["roles"]["good"]["trapper"]["name"];
    this.description = jsonData["roles"]["good"]["trapper"]["description"];
    this.mission = jsonData["roles"]["good"]["trapper"]["mission"];
    this.team = "good";
    this.hasNightAbility =
      jsonData["roles"]["good"]["trapper"]["hasNightAbility"];
    this.voteCount = jsonData["roles"]["good"]["trapper"]["voteCount"];
  } else if (type == roleTypes.Godfather) {
    this.name = jsonData["roles"]["evil"]["godfather"]["name"];
    this.description = jsonData["roles"]["evil"]["godfather"]["description"];
    this.mission = jsonData["roles"]["evil"]["godfather"]["mission"];
    this.team = "evil";
    this.hasNightAbility =
      jsonData["roles"]["evil"]["godfather"]["hasNightAbility"];
    this.voteCount = jsonData["roles"]["evil"]["godfather"]["voteCount"];
    this.killVoteCount =
      jsonData["roles"]["evil"]["godfather"]["killVoteCount"];
  } else if (type == roleTypes.Mafioso) {
    this.name = jsonData["roles"]["evil"]["mafioso"]["name"];
    this.description = jsonData["roles"]["evil"]["mafioso"]["description"];
    this.mission = jsonData["roles"]["evil"]["mafioso"]["mission"];
    this.team = "evil";
    this.hasNightAbility =
      jsonData["roles"]["evil"]["mafioso"]["hasNightAbility"];
    this.voteCount = jsonData["roles"]["evil"]["mafioso"]["voteCount"];
    this.killVoteCount = jsonData["roles"]["evil"]["mafioso"]["killVoteCount"];
  } else if (type == roleTypes.Surgeon) {
    this.name = jsonData["roles"]["evil"]["surgeon"]["name"];
    this.description = jsonData["roles"]["evil"]["surgeon"]["description"];
    this.mission = jsonData["roles"]["evil"]["surgeon"]["mission"];
    this.team = "evil";
    this.hasNightAbility =
      jsonData["roles"]["evil"]["surgeon"]["hasNightAbility"];
    this.voteCount = jsonData["roles"]["evil"]["surgeon"]["voteCount"];
    this.killVoteCount = jsonData["roles"]["evil"]["surgeon"]["killVoteCount"];
    this.selfUsage = jsonData["roles"]["evil"]["surgeon"]["selfUsage"];
  } else if (type == roleTypes.Witch) {
    this.name = jsonData["roles"]["evil"]["witch"]["name"];
    this.description = jsonData["roles"]["evil"]["witch"]["description"];
    this.mission = jsonData["roles"]["evil"]["witch"]["mission"];
    this.team = "evil";
    this.hasNightAbility =
      jsonData["roles"]["evil"]["witch"]["hasNightAbility"];
    this.voteCount = jsonData["roles"]["evil"]["witch"]["voteCount"];
    this.killVoteCount = jsonData["roles"]["evil"]["witch"]["killVoteCount"];
  } else if (type == roleTypes.Framer) {
    this.name = jsonData["roles"]["evil"]["framer"]["name"];
    this.description = jsonData["roles"]["evil"]["framer"]["description"];
    this.mission = jsonData["roles"]["evil"]["framer"]["mission"];
    this.team = "evil";
    this.hasNightAbility =
      jsonData["roles"]["evil"]["framer"]["hasNightAbility"];
    this.voteCount = jsonData["roles"]["evil"]["framer"]["voteCount"];
    this.killVoteCount = jsonData["roles"]["evil"]["framer"]["killVoteCount"];
  } else if (type == roleTypes.Jester) {
    this.name = jsonData["roles"]["neutral"]["jester"]["name"];
    this.description = jsonData["roles"]["neutral"]["jester"]["description"];
    this.mission = jsonData["roles"]["neutral"]["jester"]["mission"];
    this.team = "neutral";
    this.hasNightAbility =
      jsonData["roles"]["neutral"]["jester"]["hasNightAbility"];
    this.voteCount = jsonData["roles"]["neutral"]["jester"]["voteCount"];
  } else if (type == roleTypes.SerialKiller) {
    this.name = jsonData["roles"]["neutral"]["serial killer"]["name"];
    this.description =
      jsonData["roles"]["neutral"]["serial killer"]["description"];
    this.mission = jsonData["roles"]["neutral"]["serial killer"]["mission"];
    this.team = "neutral";
    this.hasNightAbility =
      jsonData["roles"]["neutral"]["serial killer"]["hasNightAbility"];
    this.voteCount = jsonData["roles"]["neutral"]["serial killer"]["voteCount"];
    this.killVoteCount =
      jsonData["roles"]["neutral"]["serial killer"]["killVoteCount"];
  } else if (type == roleTypes.Executioner) {
    this.name = jsonData["roles"]["neutral"]["executioner"]["name"];
    this.description =
      jsonData["roles"]["neutral"]["executioner"]["description"];
    this.mission = jsonData["roles"]["neutral"]["executioner"]["mission"];
    this.team = "neutral";
    this.hasNightAbility =
      jsonData["roles"]["neutral"]["executioner"]["hasNightAbility"];
    this.voteCount = jsonData["roles"]["neutral"]["executioner"]["voteCount"];
  } else if (type == roleTypes.Lawyer) {
    this.name = jsonData["roles"]["neutral"]["lawyer"]["name"];
    this.description = jsonData["roles"]["neutral"]["lawyer"]["description"];
    this.mission = jsonData["roles"]["neutral"]["lawyer"]["mission"];
    this.team = "neutral";
    this.hasNightAbility =
      jsonData["roles"]["neutral"]["lawyer"]["hasNightAbility"];
    this.voteCount = jsonData["roles"]["neutral"]["lawyer"]["voteCount"];
  }
}
