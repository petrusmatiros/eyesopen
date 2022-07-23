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
var jsonData = require("./roles.json");

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
        connectedUsers.get(playerID).setReadyLobby(false);
        io.to(connectedUsers.get(playerID).getCurrentRoom()).emit(
          "ready-status",
          rooms.get(targetRoom).getUsers()
        );
        io.to(connectedUsers.get(playerID).getCurrentRoom()).emit(
          "rolePickConditionDisconnect",
          false
        );
        clearPlayerSlot(playerID);
        // reqHandler(playerID);
        // remove user from room
        rooms.get(targetRoom).removeUser(connectedUsers.get(playerID));
        updatePlayerCount(playerID);
        // TODO: check for requirement instead???
        updateRoles();
        reqHandler(playerID);
        // socket leaves room
        socket.leave(targetRoom);
        console.log("leaving room", targetRoom);
        console.log(socket.rooms);
      }
    }
  });

  function checkReq(playerID) {
    if (checkUserExist(playerID)) {
      if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
        var roomCode = connectedUsers.get(playerID).getCurrentRoom();
        if(!connectedUsers.get(playerID).getInGame()) {
          var room = rooms.get(roomCode);
          var totalReq = Object.keys(room.requirements).length;
          console.log("totalReq", totalReq);
          var count = 0;
          for (var value of Object.values(room.requirements)) {
            if (value == true) {
              count++;
            }
          }
          console.log("count", count)
          console.log("requirements", room.requirements)
          if (count == totalReq) {
            console.log("everything satisfied")
            //!! should this emit to everybody?
            io.to(connectedUsers.get(playerID).getCurrentRoom()).emit("reqSatisfied", true);
          } else {
            io.to(connectedUsers.get(playerID).getCurrentRoom()).emit("reqSatisfied", false);
          }
        }
      }
    }
  }

  socket.on("reqHandler", (playerID, req, isValid=false) => {
    if (checkUserExist(playerID)) {
      if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
        var roomCode = connectedUsers.get(playerID).getCurrentRoom();
        if(!connectedUsers.get(playerID).getInGame()) {
          var room = rooms.get(roomCode);
          if (req.includes("rolesEqualUsers")) {
            rooms.get(roomCode).requirements.rolesEqualUsers = isValid;
          }
          checkReq(playerID);
        }
      }
    }
  });

  function reqHandler(playerID) {
    if (checkUserExist(playerID)) {
      if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
        var roomCode = connectedUsers.get(playerID).getCurrentRoom();
        if(!connectedUsers.get(playerID).getInGame()) {
          var room = rooms.get(roomCode);
          if (rooms.get(roomCode).getUsers().length >= minPlayers) {
            rooms.get(roomCode).requirements.minThree = true;
          } else {
            rooms.get(roomCode).requirements.minThree = false;
          }
          if (checkAllReady(roomCode, playerID)) {
            rooms.get(roomCode).requirements.allReady = true;
          } else {
            rooms.get(roomCode).requirements.allReady = false;
          }
          if (hostInLobby(roomCode)) {
            rooms.get(roomCode).requirements.hostExist = true;
          } else {
            rooms.get(roomCode).requirements.hostExist = false;
          }
          checkReq(playerID);
        }
      }
    }
  }


  socket.on("fetchRoles", (playerID, state) => {
    if (checkUserExist(playerID)) {
      if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
        var roomCode = connectedUsers.get(playerID).getCurrentRoom();
        if(!checkUserInGame(roomCode, playerID)) {
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
          reqHandler(playerID);
        }
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
      if (room.getUsers()[i].getReadyLobby() == true) {
        ready++;
      }
    }
    return room.getUsers().length - ready;
  }

  function checkUserInGame(roomCode, playerID) {
    if (checkUserExist(playerID)) {
      if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
        if (rooms.get(roomCode).getUsers().includes(playerID)) {
          if(connectedUsers.get(playerID).getInGame()) {
            return true;
          } else {
            return false;
          }
        }
      }
    }
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
        if(!checkUserInGame(roomCode, playerID)) {
          var notReady = false;
          connectedUsers.get(playerID).setReadyLobby(notReady);
          io.to(connectedUsers.get(playerID).getCurrentRoom()).emit(
            "ready-status-lobby",
            rooms.get(roomCode).getUsers()
          );
        }
      }
    }
  });

  socket.on("player-unready", (playerID, state) => {
    if (checkUserExist(playerID)) {
      if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
        var roomCode = connectedUsers.get(playerID).getCurrentRoom();
        var emitTo = "";
        var notReady = false;
        if (state.includes("lobby")) {
          emitTo = "ready-status-lobby";
          connectedUsers.get(playerID).setReadyLobby(notReady);
        } else if (state.includes("game")) {
          emitTo = "ready-status-game";
          connectedUsers.get(playerID).setReadyGame(notReady);
        }
          updatePlayerCount(playerID);
          io.to(connectedUsers.get(playerID).getCurrentRoom()).emit(
            emitTo,
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
          if (rooms.get(roomCode).getUsers()[i].getReadyLobby()) {
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

  socket.on("player-ready", (playerID, state) => {
    if (checkUserExist(playerID)) {
      if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
        var roomCode = connectedUsers.get(playerID).getCurrentRoom();
        var emitTo = "";
        var ready = true;
        if (state.includes("lobby")) {
          emitTo = "ready-status-lobby";
          connectedUsers.get(playerID).setReadyLobby(ready);
        } else if (state.includes("game")) {
          emitTo = "ready-status-game";
          connectedUsers.get(playerID).setReadyGame(ready);
        }
        updatePlayerCount(playerID);
        io.to(connectedUsers.get(playerID).getCurrentRoom()).emit(
          emitTo,
          rooms.get(roomCode).getUsers()
        );
        
      }
    }
  });

  socket.on("joinedLobby", (playerID) => {
    if (checkUserExist(playerID)) {
      if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
        var roomCode = connectedUsers.get(playerID).getCurrentRoom();
        if (!checkUserInGame(roomCode, playerID)) {
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
          reqHandler(playerID);
          console.log(socket.rooms);
          console.log(connectedUsers.get(playerID));
          socket.emit("joinPlayerSlot");
        }
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
        reqHandler(playerID);
      }
    }
  }

  socket.on("directJoin", (playerID, directRoom) => {
    if (checkUserExist(playerID)) {
      if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
        connectedUsers.get(playerID).setCurrentRoom(directRoom);
        var roomCode = connectedUsers.get(playerID).getCurrentRoom();
        if (!checkUserInGame(roomCode, playerID)) {
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
          reqHandler(playerID);
          console.log(socket.rooms);
          console.log(connectedUsers.get(playerID));
          socket.emit("joinPlayerSlot");
        }
      }
    }
    socket.data.playerID = playerID;
  });

  socket.on("requestPlayerSlot", (playerID) => {
    if (checkUserExist(playerID)) {
      if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
        var roomCode = connectedUsers.get(playerID).getCurrentRoom();
        if(!checkUserInGame(roomCode, playerID)) {
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
      }
    }
  });

  function clearPlayerSlot(playerID) {
    if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
      var roomCode = connectedUsers.get(playerID).getCurrentRoom();
      if(!checkUserInGame(roomCode, playerID)) {
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
  }

  socket.on("checkIfHost", (playerID, emission) => {
    if (checkUserExist(playerID)) {
      if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
        var roomCode = connectedUsers.get(playerID).getCurrentRoom();
        if(!checkUserInGame(roomCode, playerID)) {
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

    if (
      goodRoles !== totalRoles &&
      evilRoles !== totalRoles &&
      (evilRoles !== totalRoles - 1 || !lawyerPicked) &&
      (goodRoles !== totalRoles - 1 || !lawyerPicked)
    ) {
      io.to(connectedUsers.get(playerID).getCurrentRoom()).emit(emitTo, true);
      rooms.get(roomCode).requirements.validPick = true;
    } else {
      io.to(connectedUsers.get(playerID).getCurrentRoom()).emit(emitTo, false);
      rooms.get(roomCode).requirements.validPick = false;
    }
    reqHandler(playerID);
  }

  socket.on("checkRolePick", (playerID, state) => {
    if (checkUserExist(playerID)) {
      if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
        var roomCode = connectedUsers.get(playerID).getCurrentRoom();
        if(!checkUserInGame(roomCode, playerID)) {
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
          reqHandler(playerID);
        }
      }
    }
  });

  socket.on("checkRoleCount", (playerID, state) => {
    if (checkUserExist(playerID)) {
      if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
        var roomCode = connectedUsers.get(playerID).getCurrentRoom();
        if(!checkUserInGame(roomCode, playerID)) {
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
        if(!checkUserInGame(roomCode, playerID)) {
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
            console.log(rooms.get(roomCode).getRoles());
            reqHandler(playerID);
          }
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


// Game related
// #############

function disguiseChecker() {
  // REMAKE THIS
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
      this.name = jsonData["roles"]["villager"]["name"];
      this.description = jsonData["roles"]["villager"]["description"];
      this.mission = jsonData["roles"]["villager"]["mission"];
      this.team = jsonData["roles"]["villager"]["team"];
      this.hasNightAbility =
        jsonData["roles"]["villager"]["hasNightAbility"];
      this.voteCount = jsonData["roles"]["villager"]["voteCount"];
    } else if (type == roleTypes.Investigator) {
      this.name = jsonData["roles"]["investigator"]["name"];
      this.description =
        jsonData["roles"]["investigator"]["description"];
      this.mission = jsonData["roles"]["investigator"]["mission"];
      this.team = jsonData["roles"]["investigator"]["team"];
      this.hasNightAbility =
        jsonData["roles"]["investigator"]["hasNightAbility"];
      this.voteCount = jsonData["roles"]["investigator"]["voteCount"];
    } else if (type == roleTypes.Doctor) {
      this.name = jsonData["roles"]["doctor"]["name"];
      this.description = jsonData["roles"]["doctor"]["description"];
      this.mission = jsonData["roles"]["doctor"]["mission"];
      this.team = jsonData["roles"]["doctor"]["team"];
      this.hasNightAbility =
        jsonData["roles"]["doctor"]["hasNightAbility"];
      this.voteCount = jsonData["roles"]["doctor"]["voteCount"];
      this.selfUsage = jsonData["roles"]["doctor"]["selfUsage"];
    } else if (type == roleTypes.Mayor) {
      this.name = jsonData["roles"]["mayor"]["name"];
      this.description = jsonData["roles"]["mayor"]["description"];
      this.mission = jsonData["roles"]["mayor"]["mission"];
      this.team = jsonData["roles"]["mayor"]["team"];
      this.hasNightAbility =
        jsonData["roles"]["mayor"]["hasNightAbility"];
      this.voteCount = jsonData["roles"]["mayor"]["voteCount"];
    } else if (type == roleTypes.Trapper) {
      this.name = jsonData["roles"]["trapper"]["name"];
      this.description = jsonData["roles"]["trapper"]["description"];
      this.mission = jsonData["roles"]["trapper"]["mission"];
      this.team = jsonData["roles"]["trapper"]["team"];
      this.hasNightAbility =
        jsonData["roles"]["trapper"]["hasNightAbility"];
      this.voteCount = jsonData["roles"]["trapper"]["voteCount"];
    } else if (type == roleTypes.Godfather) {
      this.name = jsonData["roles"]["godfather"]["name"];
      this.description = jsonData["roles"]["godfather"]["description"];
      this.mission = jsonData["roles"]["godfather"]["mission"];
      this.team = jsonData["roles"]["godfather"]["team"];
      this.hasNightAbility =
        jsonData["roles"]["godfather"]["hasNightAbility"];
      this.voteCount = jsonData["roles"]["godfather"]["voteCount"];
      this.killVoteCount =
        jsonData["roles"]["godfather"]["killVoteCount"];
    } else if (type == roleTypes.Mafioso) {
      this.name = jsonData["roles"]["mafioso"]["name"];
      this.description = jsonData["roles"]["mafioso"]["description"];
      this.mission = jsonData["roles"]["mafioso"]["mission"];
      this.team = jsonData["roles"]["mafioso"]["team"];
      this.hasNightAbility =
        jsonData["roles"]["mafioso"]["hasNightAbility"];
      this.voteCount = jsonData["roles"]["mafioso"]["voteCount"];
      this.killVoteCount =
        jsonData["roles"]["mafioso"]["killVoteCount"];
    } else if (type == roleTypes.Surgeon) {
      this.name = jsonData["roles"]["surgeon"]["name"];
      this.description = jsonData["roles"]["surgeon"]["description"];
      this.mission = jsonData["roles"]["surgeon"]["mission"];
      this.team = jsonData["roles"]["surgeon"]["team"];
      this.hasNightAbility =
        jsonData["roles"]["surgeon"]["hasNightAbility"];
      this.voteCount = jsonData["roles"]["surgeon"]["voteCount"];
      this.killVoteCount =
        jsonData["roles"]["surgeon"]["killVoteCount"];
      this.selfUsage = jsonData["roles"]["surgeon"]["selfUsage"];
    } else if (type == roleTypes.Witch) {
      this.name = jsonData["roles"]["witch"]["name"];
      this.description = jsonData["roles"]["witch"]["description"];
      this.mission = jsonData["roles"]["witch"]["mission"];
      this.team = jsonData["roles"]["witch"]["team"];
      this.hasNightAbility =
        jsonData["roles"]["witch"]["hasNightAbility"];
      this.voteCount = jsonData["roles"]["witch"]["voteCount"];
      this.killVoteCount = jsonData["roles"]["witch"]["killVoteCount"];
    } else if (type == roleTypes.Framer) {
      this.name = jsonData["roles"]["framer"]["name"];
      this.description = jsonData["roles"]["framer"]["description"];
      this.mission = jsonData["roles"]["framer"]["mission"];
      this.team = jsonData["roles"]["framer"]["team"];
      this.hasNightAbility =
        jsonData["roles"]["framer"]["hasNightAbility"];
      this.voteCount = jsonData["roles"]["framer"]["voteCount"];
      this.killVoteCount = jsonData["roles"]["framer"]["killVoteCount"];
    } else if (type == roleTypes.Jester) {
      this.name = jsonData["roles"]["jester"]["name"];
      this.description = jsonData["roles"]["jester"]["description"];
      this.mission = jsonData["roles"]["jester"]["mission"];
      this.team = jsonData["roles"]["jester"]["team"];
      this.hasNightAbility =
        jsonData["roles"]["jester"]["hasNightAbility"];
      this.voteCount = jsonData["roles"]["jester"]["voteCount"];
    } else if (type == roleTypes.SerialKiller) {
      this.name = jsonData["roles"]["serial killer"]["name"];
      this.description =
        jsonData["roles"]["serial killer"]["description"];
      this.mission = jsonData["roles"]["serial killer"]["mission"];
      this.team = jsonData["roles"]["serial killer"]["team"];
      this.hasNightAbility =
        jsonData["roles"]["serial killer"]["hasNightAbility"];
      this.voteCount =
        jsonData["roles"]["serial killer"]["voteCount"];
      this.killVoteCount =
        jsonData["roles"]["serial killer"]["killVoteCount"];
    } else if (type == roleTypes.Executioner) {
      this.name = jsonData["roles"]["executioner"]["name"];
      this.description =
        jsonData["roles"]["executioner"]["description"];
      this.mission = jsonData["roles"]["executioner"]["mission"];
      this.team = jsonData["roles"]["executioner"]["team"];
      this.hasNightAbility =
        jsonData["roles"]["executioner"]["hasNightAbility"];
      this.voteCount = jsonData["roles"]["executioner"]["voteCount"];
    } else if (type == roleTypes.Lawyer) {
      this.name = jsonData["roles"]["lawyer"]["name"];
      this.description = jsonData["roles"]["lawyer"]["description"];
      this.mission = jsonData["roles"]["lawyer"]["mission"];
      this.team = jsonData["roles"]["lawyer"]["team"];
      this.hasNightAbility =
        jsonData["roles"]["lawyer"]["hasNightAbility"];
      this.voteCount = jsonData["roles"]["lawyer"]["voteCount"];
    }
  }

