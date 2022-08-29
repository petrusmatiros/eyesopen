// server set up
const express = require("express");
const app = express();
const port = 3000;
const server = require("http").createServer(app);
const io = require("socket.io")(server, {});

server.listen(port, () => {
  console.log("Server listening at port %d", port);
});

// ? Change this
var __dirname = "/mnt/c/Users/petru/Documents/Code/eyesopen/public/";

// // random string generator
var randomstring = require("randomstring");

var { Room } = require("./room");
var { Game } = require("./game");
var { Role } = require("./role");
var { Player } = require("./player");
var { User } = require("./user");

const minPlayers = 3;
const maxPlayers = 14;

var rooms = new Map();
var connectedUsers = new Map();

// Clear data every day at 05:00:00
function checkClearData() {
  var current = new Date(Date.now());
  var whenToReset = new Date("2022-08-22T05:00:00");
  var currentTime = current.toLocaleTimeString();
  var whenToResetTime = whenToReset.toLocaleTimeString();
  if (currentTime == whenToResetTime) {
    console.log("clearing data");
    // Clear rooms
    rooms.clear();
    // Clear connected users
    connectedUsers.clear();
  }
}
setInterval(checkClearData, 1000);

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
app.get("/lobby/:id/game", (req, res) => {
  if (rooms.has(req.params.id)) {
    res.sendFile(__dirname + "app.html");
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


var jsonData = require("./roles.json");

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
          "ready-status-lobby",
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
        // connectedUsers.get(playerID).setCurrentRoom(null);
        socket.leave(targetRoom);
        console.log("leaving room", targetRoom);
        console.log(socket.rooms);
      }
    }
  });

  socket.on("checkUserApartOfGame", (playerID, state) => {
    if (checkUserExist(playerID)) {
      if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
        var roomCode = connectedUsers.get(playerID).getCurrentRoom();
        // if (!connectedUsers.get(playerID).getInGame()) {
        var room = rooms.get(roomCode);
        if (room.getGame().getUsers().includes(connectedUsers.get(playerID))) {
          if (state.includes("index")) {
            console.log(playerID, "(index) is apart of room", roomCode);
            socket.emit("apartOfGameIndex", true, room.getGame().getProgress());
          } else if (state.includes("join")) {
            console.log(playerID, "(join) is apart of room", roomCode);
            socket.emit("apartOfGameJoin", true, room.getGame().getProgress());
          } else if (state.includes("app")) {
            console.log(playerID, "(app) is apart of room", roomCode);
            socket.emit("apartOfGameApp", true, room.getGame().getProgress());
          }
        } else {
          if (state.includes("index")) {
            console.log(playerID, "(index) is NOT APART of room", roomCode);
            socket.emit(
              "apartOfGameIndex",
              false,
              room.getGame().getProgress()
            );
          } else if (state.includes("join")) {
            console.log(playerID, "(join) is NOT APART of room", roomCode);
            socket.emit("apartOfGameJoin", false, room.getGame().getProgress());
          } else if (state.includes("app")) {
            console.log(playerID, "(app) is NOT APART of room", roomCode);
            socket.emit("apartOfGameApp", false, room.getGame().getProgress());
          }
        }
        // }
      } else {
        socket.emit("resetURL");
      }
    }
  });

  function random(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  function setUp(roomCode) {
    var room = rooms.get(roomCode);
    var game = room.getGame();
    var roles = room.getRoles();
    // SHUFFLE ARRAY (ROLES)
    shuffle(roles);
    var users = room.getUsers();
    // reset game
    room.getGame().reset();
    // set all users ready
    for (var i = 0; i < users.length; i++) {
      users[i].setInGame(true);
    }
    if (roles.length >= 3) {
      let seen = [];
      var i = 0;
      // keeping track of lawyer, jester, executioner
      var theLawyer = null;
      var theJester = null;
      var theExecutioner = null;
      while (seen.length < roles.length) {
        var rand = random(0, roles.length - 1);
        if (!seen.includes(rand)) {
          // create new player for user, with one of the roles
          users[i].setPlayer(
            new Player(users[i].getName(), new Role(roles[rand]))
          );
          // have used up this role
          seen.push(rand);

          // add user to all in game users
          // add user to all alive players
          room.getGame().addUser(users[i]);
          room.getGame().addAlive(users[i]);
          // if user has an evil role, add them to evil
          if (users[i].getPlayer().role.team == "evil") {
            room.getGame().addEvil(users[i]);
            // if there is atleast one evil role, create evil room code
            game.setEvilRoom("evil-" + roomCode);
          }

          // assign which user is which neutral role
          if (roles[rand] == "lawyer") {
            theLawyer = users[i];
          } else if (roles[rand] == "jester") {
            theJester = users[i];
          } else if (roles[rand] == "executioner") {
            theExecutioner = users[i];
          }
          // counter for array of users
          i++;
        }
      }
      // assign lawyer client if lawyer is one of the roles
      // client must be evil or neutral
      if (roles.includes("lawyer")) {
        let seen = [];
        while (seen.length < 1) {
          var rand = random(0, users.length - 1);
          if (!seen.includes(rand)) {
            if (
              roles.length == 3 &&
              roles.includes("lawyer") &&
              roles.includes("executioner") &&
              roles.includes("jester")
            ) {
              if (users[rand] == theJester) {
                seen.push(rand);
                theLawyer.getPlayer().role.client = users[rand];
                // console.log("client", users[rand].getPlayer().role);
              }
            } else {
              if (
                users[rand] !== theLawyer &&
                (users[rand].getPlayer().role.team == "evil" ||
                  users[rand].getPlayer().role.team == "neutral")
              ) {
                seen.push(rand);
                theLawyer.getPlayer().role.client = users[rand];
                // console.log("client", users[rand].getPlayer().role);
              }
            }
          }
        }
      }

      // assign executioner target if executioner is one of the roles
      // target cannot be jester and cannot be lawyer, if the lawyer client is the executioner
      if (roles.includes("executioner")) {
        let seen = [];
        while (seen.length < 1) {
          var rand = random(0, users.length - 1);
          if (!seen.includes(rand)) {
            if (
              users[rand] !== theExecutioner &&
              users[rand] !== theJester &&
              (users[rand] !== theLawyer ||
                theLawyer.getPlayer().role.client !== theExecutioner)
            ) {
              seen.push(rand);
              theExecutioner.getPlayer().role.target = users[rand];
              // console.log("target", users[rand].getPlayer().role);
            }
          }
        }
      }
      // console.log("theLawyer", theLawyer);
      // console.log("theExcutioner", theExecutioner);
      // console.log("after game set up", users);
    }
  }

  socket.on("checkForRoleCard", (playerID) => {
    if (checkUserExist(playerID)) {
      if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
        var roomCode = connectedUsers.get(playerID).getCurrentRoom();
        var room = rooms.get(roomCode);
        if (room.getGame().getProgress()) {
          var allReady = false;
          playerIsReady = false;
          if (connectedUsers.get(playerID).getReadyGame()) {
            playerIsReady = true;
          }
          if (checkAllReadyGame(roomCode, playerID)) {
            console.log("ALL PLAYERS READY in GAME");
            var allReady = true;
          }
          socket.emit(
            "displayRoleCard",
            playerIsReady,
            allReady,
            connectedUsers.get(playerID).getPlayer().getRole().type,
            connectedUsers.get(playerID).getPlayer().getRole().name,
            connectedUsers.get(playerID).getPlayer().getRole().team,
            connectedUsers.get(playerID).getPlayer().getRole().description,
            connectedUsers.get(playerID).getPlayer().getRole().mission
          );
          io.to(roomCode).emit("showGame", allReady);
        }
      }
    }
  });

  // set all users to inGame
  // set game to inProgress
  // make sure done is false
  // assign roles at random (each users gets a new Player, which has new Role)
  // if lawyer exists, give them evil or neutral client
  // if exe exists, give the many target but not jester, and if lawyer client == exe, then no laywer as target
  // add all Users to game alive, evil to evil array
  // ?check for user readyGame
  socket.on("startGame", (playerID) => {
    console.log("starting game");
    if (checkUserExist(playerID)) {
      if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
        var roomCode = connectedUsers.get(playerID).getCurrentRoom();
        var room = rooms.get(roomCode);
        if (room.getGame().getProgress() == false) {
          io.to(roomCode).emit("enterGame");
          setUp(roomCode);
          // set game in progress
          room.getGame().setProgress(true);
          // io.to(roomCode).emit("rolesAssigned");
        }
      }
    }
  });

  function checkReq(playerID) {
    if (checkUserExist(playerID)) {
      if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
        var roomCode = connectedUsers.get(playerID).getCurrentRoom();
        if (!connectedUsers.get(playerID).getInGame()) {
          var room = rooms.get(roomCode);
          var totalReq = Object.keys(room.requirements).length;
          // console.log("totalReq", totalReq);
          var count = 0;
          for (var value of Object.values(room.requirements)) {
            if (value == true) {
              count++;
            }
          }
          // console.log("count", count);
          // console.log("requirements", room.requirements);
          if (count == totalReq) {
            console.log("everything satisfied");
            //!! should this emit to everybody?
            io.to(connectedUsers.get(playerID).getCurrentRoom()).emit(
              "reqSatisfied",
              true
            );
          } else {
            io.to(connectedUsers.get(playerID).getCurrentRoom()).emit(
              "reqSatisfied",
              false
            );
          }
        }
      }
    }
  }

  socket.on("reqHandler", (playerID, req, isValid = false) => {
    if (checkUserExist(playerID)) {
      if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
        var roomCode = connectedUsers.get(playerID).getCurrentRoom();
        if (!connectedUsers.get(playerID).getInGame()) {
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
        if (!connectedUsers.get(playerID).getInGame()) {
          var room = rooms.get(roomCode);

          if (rooms.get(roomCode).getUsers().length >= minPlayers) {
            rooms.get(roomCode).requirements.minThree = true;
          } else {
            rooms.get(roomCode).requirements.minThree = false;
          }
          if (checkAllReadyLobby(roomCode, playerID)) {
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
        if (!checkUserInGame(roomCode, playerID)) {
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
          if (connectedUsers.get(playerID).getInGame()) {
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
        if (!checkUserInGame(roomCode, playerID)) {
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
          if (rooms.get(roomCode).getGame().getProgress() == false) {
            emitTo = "ready-status-lobby";
            connectedUsers.get(playerID).setReadyLobby(notReady);
            updatePlayerCount(playerID);
            io.to(connectedUsers.get(playerID).getCurrentRoom()).emit(
              emitTo,
              rooms.get(roomCode).getUsers()
            );
          }
        } else if (state.includes("game")) {
          if (rooms.get(roomCode).getGame().getProgress() == true) {
            // emitTo = "ready-status-game";
            connectedUsers.get(playerID).setReadyGame(notReady);

            // var playerIsReady = connectedUsers.get(playerID).getReadyGame();
            // socket.to(connectedUsers.get(playerID), playerIsReady, checkAllReadyGame(roomCode, playerID)).emit(emitTo);
          }
        }
      }
    }
  });

  function checkAllReadyGame(roomCode, playerID) {
    var count = 0;
    if (checkUserExist(playerID)) {
      if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
        for (var i = 0; i < rooms.get(roomCode).getUsers().length; i++) {
          if (rooms.get(roomCode).getUsers()[i].getReadyGame()) {
            count++;
          }
        }
        if (count == rooms.get(roomCode).getUsers().length && count >= 3) {
          return true;
        } else {
          return false;
        }
      }
    }
  }
  function checkAllReadyLobby(roomCode, playerID) {
    var count = 0;
    if (checkUserExist(playerID)) {
      if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
        for (var i = 0; i < rooms.get(roomCode).getUsers().length; i++) {
          if (rooms.get(roomCode).getUsers()[i].getReadyLobby()) {
            count++;
          }
        }
        // ! this could be an issue
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
          if (rooms.get(roomCode).getGame().getProgress() == false) {
            emitTo = "ready-status-lobby";
            connectedUsers.get(playerID).setReadyLobby(ready);
            updatePlayerCount(playerID);
            io.to(connectedUsers.get(playerID).getCurrentRoom()).emit(
              emitTo,
              rooms.get(roomCode).getUsers()
            );
          }
        } else if (state.includes("game")) {
          if (rooms.get(roomCode).getGame().getProgress() == true) {
            // emitTo = "ready-status-game";
            connectedUsers.get(playerID).setReadyGame(ready);
            // var playerIsReady = connectedUsers.get(playerID).getReadyGame();
            // socket.to(connectedUsers.get(playerID), playerIsReady, checkAllReadyGame(roomCode, playerID)).emit(emitTo);
          }
        }
      }
    }
  });

  socket.on("joinedLobby", (playerID) => {
    if (checkUserExist(playerID)) {
      if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
        var roomCode = connectedUsers.get(playerID).getCurrentRoom();

        if (
          rooms.get(roomCode).getGame().getProgress() == false ||
          (rooms.get(roomCode).getGame().getProgress() == true &&
            rooms
              .get(roomCode)
              .getGame()
              .getUsers()
              .includes(connectedUsers.get(playerID)))
        ) {
          socket.join(connectedUsers.get(playerID).getCurrentRoom());

          socket.emit("viewRoom", roomCode);
          socket.emit(
            "viewPlayerCount",
            amountUnready(roomCode),
            hostInLobby(roomCode),
            connectedUsers.get(rooms.get(roomCode).getHost()).getName(),
            checkAllReadyLobby(roomCode, playerID),
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
          checkAllReadyLobby(roomCode, playerID),
          rooms.get(roomCode).getUsers().length,
          rooms.get(roomCode).getRoles().length
        );
        reqHandler(playerID);
      }
    }
  }

  // !!This needs to be taken care of
  socket.on("directJoin", (playerID, directRoom) => {
    if (checkUserExist(playerID)) {
      if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
        connectedUsers.get(playerID).setCurrentRoom(directRoom);
        var roomCode = connectedUsers.get(playerID).getCurrentRoom();
        console.log("THIS " + roomCode);
        if (
          rooms.get(roomCode).getGame().getProgress() == false ||
          (rooms.get(roomCode).getGame().getProgress() == true &&
            rooms
              .get(roomCode)
              .getGame()
              .getUsers()
              .includes(connectedUsers.get(playerID)))
        ) {
          socket.join(connectedUsers.get(playerID).getCurrentRoom());
          checkForAlreadyExistingUser(roomCode, playerID);
          socket.emit("viewRoom", roomCode);
          io.to(connectedUsers.get(playerID).getCurrentRoom()).emit(
            "viewPlayerCount",
            amountUnready(roomCode),
            hostInLobby(roomCode),
            connectedUsers.get(rooms.get(roomCode).getHost()).getName(),
            checkAllReadyLobby(roomCode, playerID),
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
        if (!checkUserInGame(roomCode, playerID)) {
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
      if (!checkUserInGame(roomCode, playerID)) {
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
        if (!checkUserInGame(roomCode, playerID)) {
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
        } else if (rooms.get(roomCode).getGame().getProgress()) {
          socket.emit("roomCodeResponse", "inProgress");
          console.log(
            "GAME IS REALLY IN PROGRESS, SO SHOULD NOT CHANGE ANYTHING"
          );
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
      if (rooms.get(roomCode).getRoles().includes("lawyer")) {
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
      goodRoles == totalRoles ||
      evilRoles == totalRoles ||
      (goodRoles == totalRoles - 1 && lawyerPicked) ||
      (evilRoles == totalRoles - 1 && lawyerPicked)
    ) {
      rooms.get(roomCode).requirements.validPick = false;
      reqHandler(playerID);
      io.to(connectedUsers.get(playerID).getCurrentRoom()).emit(emitTo, false);
    } else {
      rooms.get(roomCode).requirements.validPick = true;
      reqHandler(playerID);
      io.to(connectedUsers.get(playerID).getCurrentRoom()).emit(emitTo, true);
    }
  }

  socket.on("checkRolePick", (playerID, state) => {
    if (checkUserExist(playerID)) {
      if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
        var roomCode = connectedUsers.get(playerID).getCurrentRoom();
        if (!checkUserInGame(roomCode, playerID)) {
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
        if (!checkUserInGame(roomCode, playerID)) {
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
        if (!checkUserInGame(roomCode, playerID)) {
          if (rooms.get(roomCode).getHost() == playerID) {
            if (rooms.get(roomCode).getGame().getProgress() == false) {
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
    }
  });

  // GAME related
  // ====================================================

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

  // ! DEBUG
  var durations = {
    night: {
      actions: 15,
      messages: 3,
    },
    day: {
      recap: 3,
      discussion: 6,
      voting: 15,
    },
  };
  // var durations = {
  //   night: {
  //     actions: 40,
  //     messages: 3,
  //   },
  //   day: {
  //     recap: 7,
  //     discussion: 45,
  //     voting: 30,
  //   },
  // };

  socket.on("updateUI", (playerID) => {
    if (checkUserExist(playerID)) {
      if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
        var roomCode = connectedUsers.get(playerID).getCurrentRoom();
        var room = rooms.get(roomCode);
        var game = room.getGame();
        if (game.getProgress()) {
          if (checkAllReadyGame(roomCode, playerID)) {
            if (game.getUsers().includes(connectedUsers.get(playerID))) {
              socket.emit("changeUI", game.getCycle());
            }
          }
        }
      }
    }
  });

  socket.on("requestPlayerCard", (playerID, state) => {
    if (checkUserExist(playerID)) {
      if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
        var roomCode = connectedUsers.get(playerID).getCurrentRoom();
        var room = rooms.get(roomCode);
        var game = room.getGame();
        if (game.getProgress()) {
          if (checkAllReadyGame(roomCode, playerID)) {
            if (game.getUsers().includes(connectedUsers.get(playerID))) {
              var emitTo = "";
              var role = connectedUsers.get(playerID).getPlayer().getRole();
              if (state.includes("first")) {
                emitTo = "fetchedPlayerCardFirst";
              } else if (state.includes("refresh")) {
                emitTo = "fetchedPlayerCardRefresh";
              } else if (state.includes("press")) {
                emitTo = "fetchedPlayerCardPress";
              }
              socket.emit(emitTo, role.name, role.team, role.mission);
            }
          }
        }
      }
    }
  });

  socket.on("setEvilRoom", (playerID) => {
    if (checkUserExist(playerID)) {
      if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
        var roomCode = connectedUsers.get(playerID).getCurrentRoom();
        var room = rooms.get(roomCode);
        var game = room.getGame();
        if (game.getProgress()) {
          if (game.getUsers().includes(connectedUsers.get(playerID))) {
            if (
              connectedUsers
                .get(playerID)
                .getPlayer()
                .getRole()
                .team.includes("evil")
            ) {
              console.log(
                connectedUsers.get(playerID) +
                  " is joining evil room: " +
                  game.getEvilRoom()
              );
              socket.join(game.getEvilRoom());
            }
          }
        }
      }
    }
  });

  socket.on("requestActionData", (playerID) => {
    if (checkUserExist(playerID)) {
      if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
        var roomCode = connectedUsers.get(playerID).getCurrentRoom();
        var room = rooms.get(roomCode);
        var game = room.getGame();
        if (game.getProgress()) {
          if (game.getUsers().includes(connectedUsers.get(playerID))) {
            socket.emit("fetchedActionData", game.getCycle(), connectedUsers.get(playerID).getPlayer().getRole());
          }
        }
      }
    }
  })

  function pushPlayer(toSend, seen, userID, userName, type, isEvil) {
    var user = { userID, userName, type, isEvil };
    if (!seen.includes(userID)) {
      seen.push(userID);
      toSend.push(user);
    }
  }

  // on connect, set all players that are in evil array, to join that room
  // on refresh, do the same.
  // create socket for handling sending players names, setting IDs for their elements
  // lawyer, executioner, yourself, doctor and surgeon, mafia, normal people
  // if evil send evil array, if playerID is lawyer, send client, if playerID is exe, send target
  // if DEAD, then they are DEAD
  // if doctor, make player accessible, and always check for self usage,
  // if surgeon, make player accessible, and always check for self usage,
  // if normal, just names, and disable self
  // players, dead, mafia, personal
  socket.on("setPlayers", (playerID, state) => {
    setPlayers(playerID, state);
  });

  function setPlayers(playerID, state) {
    if (checkUserExist(playerID)) {
      if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
        var roomCode = connectedUsers.get(playerID).getCurrentRoom();
        var room = rooms.get(roomCode);
        var game = room.getGame();
        if (game.getProgress()) {
          if (game.getUsers().includes(connectedUsers.get(playerID))) {
            var emitTo = "";
            if (state.includes("first")) {
              emitTo = "setPlayersFirst";
            } else if (state.includes("clock")) {
              emitTo = "setPlayersClock";
            }
            var toSend = [];
            var seenNight = [];
            var seenDay = [];

            var socketUser = connectedUsers.get(playerID);
            var socketRole = connectedUsers.get(playerID).getPlayer().getRole();

            for (var i = 0; i < game.getUsers().length; i++) {
              var type = "none";
              var isEvil = null;

              var user = game.getUsers()[i];
              var userID = game.getUsers()[i].getPlayerID();
              var userName = game.getUsers()[i].getName();
              var userRole = game.getUsers()[i].getPlayer().getRole();

              // Fix this, seenNight, seenDay
              

              if (game.getCycle().includes("Night")) { // Night
                if (
                  user.getPlayer().getIsKilled() ||
                  user.getPlayer().getIsLynched()
                ) {
                  type = "dead";
                  if (socketRole.team.includes("evil")) {
                    if (userRole.team.includes("evil")) {
                      isEvil = true;
                    } else {
                      isEvil = false;
                    }
                  } else {
                    isEvil = null;
                  }
                  pushPlayer(toSend, seenNight, userID, userName, type, isEvil);
                }

                if (socketRole.hasNightAbility) {
                  // has night ability
                  if (user == socketUser) {
                    // yourself
                    if (userRole.team.includes("evil")) {
                      if (userRole.type.includes("surgeon")) {
                        if (userRole.selfUsage > 0) {
                          type = "evil";
                          isEvil = true;
                          pushPlayer(toSend, seenNight, userID, userName, type, isEvil);
                        } else {
                          type = "evil+unselectable";
                          isEvil = true;
                          pushPlayer(toSend, seenNight, userID, userName, type, isEvil);
                        }
                      } else {
                        type = "evil+unselectable";
                        isEvil = true;
                        pushPlayer(toSend, seenNight, userID, userName, type, isEvil);
                      }
                    } else {
                      if (userRole.type.includes("doctor")) {
                        if (userRole.selfUsage > 0) {
                          type = "none";
                          isEvil = null;
                          pushPlayer(toSend, seenNight, userID, userName, type, isEvil);
                        } else {
                          type = "unselectable";
                          isEvil = null;
                          pushPlayer(toSend, seenNight, userID, userName, type, isEvil);
                        }
                      } else {
                        isEvil = null;
                        type = "unselectable";
                        pushPlayer(toSend, seenNight, userID, userName, type, isEvil);
                      }
                    }
                  } else {
                    // everyone else
                    if (socketRole.type.includes("surgeon")) {
                      if (userRole.team.includes("evil")) {
                        isEvil = true;
                        type = "evil";
                        pushPlayer(toSend, seenNight, userID, userName, type, isEvil);
                      } else {
                        isEvil = false;
                        type = "none";
                        pushPlayer(toSend, seenNight, userID, userName, type, isEvil);
                      }
                    } else if (socketRole.type.includes("witch")) {
                      if (userRole.team.includes("evil")) {
                        isEvil = true;
                        type = "evil+unselectable";
                        pushPlayer(toSend, seenNight, userID, userName, type, isEvil);
                      } else {
                        isEvil = false;
                        type = "none";
                        pushPlayer(toSend, seenNight, userID, userName, type, isEvil);
                      }
                    } else if (socketRole.type.includes("framer")) {
                      if (userRole.team.includes("evil")) {
                        isEvil = true;
                        type = "evil+unselectable";
                        pushPlayer(toSend, seenNight, userID, userName, type, isEvil);
                      } else {
                        isEvil = false;
                        type = "none";
                        pushPlayer(toSend, seenNight, userID, userName, type, isEvil);
                      }
                    } else {
                      isEvil = null;
                      type = "none";
                      pushPlayer(toSend, seenNight, userID, userName, type, isEvil);
                    }
                  }
                } else {
                  // NO night ability
                  if (user == socketUser) {
                    // yourself
                    if (userRole.team.includes("evil")) {
                      isEvil = true;
                      type = "evil+unselectable";
                      pushPlayer(toSend, seenNight, userID, userName, type, isEvil);
                    } else {
                      isEvil = null;
                      type = "none";
                      pushPlayer(toSend, seenNight, userID, userName, type, isEvil);
                    }
                  } else {
                    if (socketRole.team.includes("evil")) {
                      if (userRole.team.includes("evil")) {
                        isEvil = true;
                        type = "evil+unselectable";
                        pushPlayer(toSend, seenNight, userID, userName, type, isEvil);
                      } else {
                        isEvil = false;
                        type = "none";
                        pushPlayer(toSend, seenNight, userID, userName, type, isEvil);
                      }
                    }
                    // if socket is executioner
                    else if (socketRole.type.includes("executioner")) {
                      if (user == socketRole.target) {
                        isEvil = null;
                        type = "target";
                        pushPlayer(toSend, seenNight, userID, userName, type, isEvil);
                      } else {
                        isEvil = null;
                        type = "none";
                        pushPlayer(toSend, seenNight, userID, userName, type, isEvil);
                      }
                    }
                    // if socket is lawyer
                    else if (socketRole.type.includes("lawyer")) {
                      if (user == socketRole.client) {
                        isEvil = null;
                        type = "client";
                        pushPlayer(toSend, seenNight, userID, userName, type, isEvil);
                      } else {
                        isEvil = null;
                        type = "none";
                        pushPlayer(toSend, seenNight, userID, userName, type, isEvil);
                      }
                    } else {
                      isEvil = null;
                      type = "none";
                      pushPlayer(toSend, seenNight, userID, userName, type, isEvil);
                    }
                  }
                }
              } else if (game.getCycle().includes("Day")) { // Day
                if (
                  user.getPlayer().getIsKilled() ||
                  user.getPlayer().getIsLynched()
                ) {
                  type = "dead";
                  if (socketRole.team.includes("evil")) {
                    if (userRole.team.includes("evil")) {
                      isEvil = true;
                    } else {
                      isEvil = false;
                    }
                  } else {
                    isEvil = null;
                  }
                  pushPlayer(toSend, seenDay, userID, userName, type, isEvil);
                }

                if (user == socketUser) {
                  // yourself
                  if (userRole.team.includes("evil")) {
                    isEvil = true;
                    type = "evil";
                    pushPlayer(toSend, seenDay, userID, userName, type, isEvil);
                  } else {
                    isEvil = null;
                    type = "none";
                    pushPlayer(toSend, seenDay, userID, userName, type, isEvil);
                  }
                } else {
                  // everyone else
                  if (socketRole.team.includes("evil")) {
                    if (userRole.team.includes("evil")) {
                      isEvil = true;
                      type = "evil";
                      pushPlayer(toSend, seenDay, userID, userName, type, isEvil);
                    } else {
                      isEvil = false;
                      type = "none";
                      pushPlayer(toSend, seenDay, userID, userName, type, isEvil);
                    }
                  }
                  // if socket is executioner
                  else if (socketRole.type.includes("executioner")) {
                    if (user == socketRole.target) {
                      isEvil = null;
                      type = "target";
                      pushPlayer(toSend, seenDay, userID, userName, type, isEvil);
                    } else {
                      isEvil = null;
                      type = "none";
                      pushPlayer(toSend, seenDay, userID, userName, type, isEvil);
                    }
                  }
                  // if socket is lawyer
                  else if (socketRole.type.includes("lawyer")) {
                    if (user == socketRole.client) {
                      isEvil = null;
                      type = "client";
                      pushPlayer(toSend, seenDay, userID, userName, type, isEvil);
                    } else {
                      isEvil = null;
                      type = "none";
                      pushPlayer(toSend, seenDay, userID, userName, type, isEvil);
                    }
                  } else {
                    isEvil = null;
                    type = "none";
                    pushPlayer(toSend, seenDay, userID, userName, type, isEvil);
                  }
                }
              }
            }
            console.log(socketUser.getName(), socketRole.team, socketRole.type, "sees", toSend)
            socket.emit(emitTo, toSend, game.getCycle(), socketRole);
          }
        }
      }
    }
  }

  socket.on("fetchMessages", (playerID) => {
    if (checkUserExist(playerID)) {
      if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
        var roomCode = connectedUsers.get(playerID).getCurrentRoom();
        var room = rooms.get(roomCode);
        var game = room.getGame();
        if (game.getProgress()) {
          if (game.getUsers().includes(connectedUsers.get(playerID))) {
            socket.emit(
              "savedMessages",
              connectedUsers.get(playerID).getMessages(),
              game.getCycle()
            );
          }
        }
      }
    }
  });

  // Prevent message from being spammed
  var emitCycleOnce = true;
  var emitPhaseOnce = true;

  function messageHandlerForPhases(playerID, game) {
    if (emitPhaseOnce) {
      if (game.getPhase().includes("actions")) {
        sendMessage(playerID, true, "------------------------", "night");
        sendMessage(
          playerID,
          true,
          "It's time to act. The action phase has begun",
          "info"
        );
      }
      if (game.getPhase().includes("message")) {
        sendMessage(playerID, true, "------------------------", "night");
        sendMessage(playerID, true, "The sun begins to rise", "extra");
      }
      if (game.getPhase().includes("recap")) {
        sendMessage(playerID, true, "------------------------", "day");
        sendMessage(playerID, true, "This happened last night", "extra");
      }
      if (game.getPhase().includes("discussion")) {
        sendMessage(playerID, true, "------------------------", "day");
        sendMessage(playerID, true, "Time for discussion!", "info");
      }
      if (game.getPhase().includes("voting")) {
        sendMessage(playerID, true, "------------------------", "day");
        sendMessage(playerID, true, "It's time to cast your votes", "info");
      }
      emitPhaseOnce = false;
    }
  }

  function messageHandlerForCycles(playerID, game) {
    if (emitCycleOnce) {
      if (game.getCycle().includes("Night")) {
        sendMessage(playerID, true, "========================", "night");
        sendMessage(
          playerID,
          true,
          "The moon glows. The night has begun",
          "important"
        );
        
      } else if (game.getCycle().includes("Day")) {
        sendMessage(playerID, true, "========================", "day");
        sendMessage(playerID, true, "The day has begun", "important");
      }
      
    }
    emitCycleOnce = false;
  }

  // be able to send toAll, to player, and to target
  function sendMessage(playerID, toAll = false, message = "", type = "") {
    var roomCode = connectedUsers.get(playerID).getCurrentRoom();
    var room = rooms.get(roomCode);
    var game = room.getGame();

    if (toAll) {
      for (var i = 0; i < game.getUsers().length; i++) {
        if (game.getUsers()[i].getInGame()) {
          game.getUsers()[i].addMessage({ message, type });
        }
      }
      io.to(roomCode).emit("recieveMessage", message, type, game.getCycle());
    } else {
      if (connectedUsers.get(playerID).getInGame()) {
        connectedUsers.get(playerID).addMessage({ message, type });
      }
      socket.emit("recieveMessage", message, type, game.getCycle());
    }
  }

  function gameHandler(playerID, roomCode, room, game) {
    // Night and Day
    var currentCycle = 0;
    // Actions, discussion
    var currentPhase = 0;
    var theDurations = Object.values(durations);
    var nightLength = Object.values(theDurations[0]).length;
    var dayLength = Object.values(theDurations[1]).length;

    game.setCycleCount(1);
    // Two objects, Night object, Day object
    // Set duration to night object -> first phase
    initClock(
      game.getTimer(),
      Object.values(theDurations[currentCycle])[currentPhase]
    );
    game.setCycle("Night");
    game.setPhase(Object.keys(theDurations[currentCycle])[currentPhase]);

    // time is equal to intervalID
    var time = setInterval(function () {
      console.log(
        game.getTimer().getCounter(),
        game.getPhase(),
        "phase:" + currentPhase,
        "cycle:" + currentCycle,
        game.getCycle(),
        game.getCycleCount()
      );

      // set night, night 1, change ui
      // init clock, send clock to clients
      io.to(roomCode).emit(
        "clock",
        game.getTimer().getCounter(),
        game.getPhase(),
        game.getCycle(),
        game.getCycleCount()
      );
      messageHandlerForCycles(playerID, game, emitCycleOnce);
      messageHandlerForPhases(playerID, game, emitPhaseOnce);
      io.to(roomCode).emit("changeUI", game.getCycle());

      // ! DEBUG TIME
      // console.log("counter from server:", counter);
      if (game.getTimer().getCounter() <= 0) {
        // clearInterval(time);

        // NIGHT
        if (currentCycle == 0) {
          if (currentPhase < nightLength) {
            currentPhase++;
            game.setPhase(
              Object.keys(theDurations[currentCycle])[currentPhase]
            );
            emitPhaseOnce = true;
            console.log("night less");
          }
          if (currentPhase >= nightLength) {
            currentPhase = 0;
            currentCycle = 1;
            game.setPhase(
              Object.keys(theDurations[currentCycle])[currentPhase]
            );
            emitPhaseOnce = true;
            game.setCycle("Day");
            // Prevent from spamming message
            emitCycleOnce = true;
            setPlayers(playerID, "clock");
            io.to(connectedUsers.get(playerID).getCurrentRoom()).emit("clearCurrentTarget");
          }
          initClock(
            game.getTimer(),
            Object.values(theDurations[currentCycle])[currentPhase]
          );
        }
        // DAY
        else if (currentCycle == 1) {
          if (currentPhase < dayLength) {
            currentPhase++;
            game.setPhase(
              Object.keys(theDurations[currentCycle])[currentPhase]
            );
            emitPhaseOnce = true;
            console.log("day less");
          }
          if (currentPhase >= dayLength) {
            currentPhase = 0;
            currentCycle = 0;
            game.setPhase(
              Object.keys(theDurations[currentCycle])[currentPhase]
            );
            emitPhaseOnce = true;
            game.setCycle("Night");
            // Prevent from spamming message
            emitCycleOnce = true;
            // Increment cycle count
            game.setCycleCount(game.getCycleCount() + 1);
            setPlayers(playerID, "clock");
            io.to(connectedUsers.get(playerID).getCurrentRoom()).emit("clearCurrentTarget");
          }

          initClock(
            game.getTimer(),
            Object.values(theDurations[currentCycle])[currentPhase]
          );
        }
      } else {
        game.getTimer().tick();
      }
    }, 1000);
  }

  function initClock(timer, duration) {
    timer.init(duration);
  }

  socket.on("initGame", (playerID) => {
    if (checkUserExist(playerID)) {
      if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
        var roomCode = connectedUsers.get(playerID).getCurrentRoom();
        var room = rooms.get(roomCode);
        var game = room.getGame();
        if (game.getProgress()) {
          if (checkAllReadyGame(roomCode, playerID)) {
            if (game.getUsers().includes(connectedUsers.get(playerID))) {
              if (room.getHost() == playerID) {
                if (game.getTimer().getRunning() == false) {
                  gameHandler(playerID, roomCode, room, game);
                }
              }
            }
          }
        }
      }
    }
  });

  function nextCycle() {
    // CLEAR ALL PLAYER VALUES, except the important ones
    // reset player values if player is NOT lynched or NOT killed
    // exception for executioner where they will be alive, but their target can be dead (they turn into jester)
    this.cycle++;
    // ! SHOULD clear DEAD array after they have been announced
  }

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
});
