// server set up
const express = require("express");
const fs = require("fs");
const app = express();
// const port = 3000;
// const port = process.env.PORT | 15000;
const port = 15000;
var privateKey = fs.readFileSync("sslcert/private.key", "utf8");
var certificate = fs.readFileSync("sslcert/certificate.crt", "utf8");
var ca = fs.readFileSync("sslcert/ca_bundle.crt", "utf8");

var credentials = { key: privateKey, cert: certificate, ca: ca };
// var credentials = { key: privateKey, cert: certificate };
const server = require("https").createServer(credentials, app);
// const server = require("https").createServer(app);

// const io = require("socket.io")(server, { cors : { origin: '*'}});
const io = require("socket.io")(server);

server.listen(port, () => {
  console.log("Server listening at port %d", port);
});

// ? Change this
// var __dirname = "/mnt/c/Users/petru/Documents/Code/eyesopen/public/";
var __dirname = process.cwd() + "/public/";

// // random string generator
var randomstring = require("randomstring");

var { Room } = require("./room");
var { Game } = require("./game");
var { Role } = require("./role");
var { Player } = require("./player");
var { User } = require("./user");
require("./constants");

var rooms = new Map();
var connectedUsers = new Map();
var proxyIdenfication = new Map();

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
app.get("/lobby/:id/inProgress", (req, res) => {
  res.sendFile(__dirname + "inProgress.html");
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

// Catch all
app.get("*", (req, res) => {
  res.sendFile(__dirname + "404.html");
});

var jsonData = require("./roles.json");
const { Console } = require("console");

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
      console.log(
        "targetroom",
        targetRoom,
        connectedUsers.get(playerID).getName()
      );
      if (targetRoom !== null) {
        connectedUsers.get(playerID).setReadyLobby(false);

        io.to(targetRoom).emit("rolePickConditionDisconnect", false);
        // reqHandler(playerID);
        // remove user from room
        if (
          rooms
            .get(targetRoom)
            .getUsers()
            .includes(connectedUsers.get(playerID))
        ) {
          rooms.get(targetRoom).removeUser(connectedUsers.get(playerID));
        }
        clearPlayerSlot(playerID);
        updatePlayerSlot(playerID);
        io.to(targetRoom).emit(
          "ready-status-lobby",
          generateProxyReadyLobby(playerID)
        );
        updatePlayerCount(playerID);
        // TODO: check for requirement instead???
        updateRoles();
        reqHandler(playerID);
        // socket leaves room
        // connectedUsers.get(playerID).setCurrentRoom(null);
        socket.leave(targetRoom);
        console.log(
          "leaving room",
          targetRoom,
          connectedUsers.get(playerID).getName()
        );
        console.log(socket.rooms);
      }
    }
  });

  socket.on("checkUserApartOfGame", (playerID, theRoom, state) => {
    if (checkUserExist(playerID)) {
      if (theRoom !== null) {
        if (rooms.has(theRoom)) {
          // if (!connectedUsers.get(playerID).getInGame()) {
          var room = rooms.get(theRoom);
          let users = room.getGame().getUsers();
          var apartOfGame = false;
          for (var i = 0; i < users.length; i++) {
            if (
              users[i].getPlayer(theRoom) ==
              connectedUsers.get(playerID).getPlayer(theRoom)
            ) {
              if (users[i].getPlayer(theRoom).getDisconnected() == false) {
                apartOfGame = true;
              }
            }
          }
          if (apartOfGame) {
            if (state.includes("index")) {
              console.log(playerID, "(index) is apart of room", theRoom);
              socket.emit(
                "apartOfGameIndex",
                true,
                room.getGame().getProgress(),
                theRoom
              );
            } else if (state.includes("join")) {
              console.log(playerID, "(join) is apart of room", theRoom);
              socket.emit(
                "apartOfGameJoin",
                true,
                room.getGame().getProgress(),
                theRoom
              );
            } else if (state.includes("app")) {
              console.log(playerID, "(app) is apart of room", theRoom);
              socket.emit(
                "apartOfGameApp",
                true,
                room.getGame().getProgress(),
                theRoom
              );
            }
          } else {
            if (state.includes("index")) {
              console.log(playerID, "(index) is NOT APART of room", theRoom);
              socket.emit(
                "apartOfGameIndex",
                false,
                room.getGame().getProgress(),
                theRoom
              );
            } else if (state.includes("join")) {
              console.log(playerID, "(join) is NOT APART of room", theRoom);
              socket.emit(
                "apartOfGameJoin",
                false,
                room.getGame().getProgress(),
                theRoom
              );
            } else if (state.includes("app")) {
              console.log(playerID, "(app) is NOT APART of room", theRoom);
              socket.emit(
                "apartOfGameApp",
                false,
                room.getGame().getProgress(),
                theRoom
              );
            }
          }
        }
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
    room.getGame().resetGameDone();
    room.getGame().resetGameInterval();
    // set all users ready
    for (var i = 0; i < users.length; i++) {
      users[i].setInGame(true);
    }
    if (roles.length >= minRoles) {
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
            roomCode,
            new Player(users[i].getName(), new Role(roles[rand]))
          );
          // Set playerRoom
          users[i].getPlayer(roomCode).setPlayerRoom(roomCode);
          // have used up this role
          seen.push(rand);

          // add user to all in game users
          // add user to all alive players
          room.getGame().addUser(users[i]);
          room.getGame().addAlive(users[i]);
          // Add previous game
          users[i].addPrevious(roomCode);
          // if user has an evil role, add them to evil
          if (users[i].getPlayer(roomCode).role.team == "evil") {
            room.getGame().addEvil(users[i]);
            // if there is at least one evil role, create evil room code
            game.setEvilRoom("evil-" + roomCode);
            console.log("evil room created", game.getEvilRoom());
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
              roles.length == minRoles &&
              roles.includes("lawyer") &&
              roles.includes("executioner") &&
              roles.includes("jester")
            ) {
              if (users[rand] == theJester) {
                seen.push(rand);
                theLawyer.getPlayer(roomCode).role.client = users[rand];
                // console.log("client", users[rand].getPlayer(roomCode).role);
              }
            } else {
              if (
                users[rand] !== theLawyer &&
                (users[rand].getPlayer(roomCode).role.team == "evil" ||
                  users[rand].getPlayer(roomCode).role.team == "neutral")
              ) {
                seen.push(rand);
                theLawyer.getPlayer(roomCode).role.client = users[rand];
                // console.log("client", users[rand].getPlayer(roomCode).role);
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
                theLawyer.getPlayer(roomCode).role.client !== theExecutioner)
            ) {
              seen.push(rand);
              theExecutioner.getPlayer(roomCode).role.target = users[rand];
              // console.log("target", users[rand].getPlayer(roomCode).role);
            }
          }
        }
      }
      // console.log("theLawyer", theLawyer);
      // console.log("theExcutioner", theExecutioner);
      // console.log("after game set up", users);
    }
  }

  function updateRoleCard(playerID, sendTo, target) {
    if (checkUserExist(playerID)) {
      if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
        var roomCode = connectedUsers.get(playerID).getCurrentRoom();
        var room = rooms.get(roomCode);
        if (room.getGame().getProgress()) {
          var allReady = false;
          playerIsReady = false;
          if (connectedUsers.get(playerID).getPlayer(roomCode).getReadyGame()) {
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
            connectedUsers.get(playerID).getPlayer(roomCode).getRole().type,
            connectedUsers.get(playerID).getPlayer(roomCode).getRole().name,
            connectedUsers.get(playerID).getPlayer(roomCode).getRole().team,
            connectedUsers.get(playerID).getPlayer(roomCode).getRole()
              .description,
            connectedUsers.get(playerID).getPlayer(roomCode).getRole().mission
          );
          if (sendTo == "all") {
            io.to(roomCode).emit("showGameUpdate", allReady);
          } else if (sendTo == "socket") {
            io.to(target).emit("showGameUpdate", allReady);
          }
        }
      }
    }
  }

  function checkForRoleCard(playerID, state) {
    if (checkUserExist(playerID)) {
      if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
        var roomCode = connectedUsers.get(playerID).getCurrentRoom();
        var room = rooms.get(roomCode);
        if (room.getGame().getProgress()) {
          var allReady = false;
          playerIsReady = false;
          if (connectedUsers.get(playerID).getPlayer(roomCode).getReadyGame()) {
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
            connectedUsers.get(playerID).getPlayer(roomCode).getRole().type,
            connectedUsers.get(playerID).getPlayer(roomCode).getRole().name,
            connectedUsers.get(playerID).getPlayer(roomCode).getRole().team,
            connectedUsers.get(playerID).getPlayer(roomCode).getRole()
              .description,
            connectedUsers.get(playerID).getPlayer(roomCode).getRole().mission
          );
          var emitTo = "";
          if (state.includes("refresh")) {
            emitTo = "showGameRefresh";
            socket.emit(emitTo, allReady);
          } else if (state.includes("first")) {
            emitTo = "showGameFirst";
            io.to(roomCode).emit(emitTo, allReady);
          } else if (state.includes("press")) {
            emitTo = "showGamePress";
            io.to(roomCode).emit(emitTo, allReady);
          }
        }
      }
    }
  }

  socket.on("checkForRoleCard", (playerID, state) => {
    checkForRoleCard(playerID, state);
  });

  socket.on("clearEvilRoom", (playerID, roomToClear) => {
    if (checkUserExist(playerID)) {
      if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
        // var roomCode = connectedUsers.get(playerID).getCurrentRoom();
        // var room = rooms.get(roomCode);
        socket.leave(roomToClear);
      }
    }
  });

  function forceKill(playerID, previousRoom, gameToLeave) {
    if (checkUserExist(playerID)) {
      if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
        var user = connectedUsers.get(playerID);

        // RESET PREVIOUS USER
        user.getPlayer(previousRoom).setIsKilled(true);
        user.getPlayer(previousRoom).setDisconnected(true);
        user.getPlayer(previousRoom).addKiller("Server");
        sendMessage(
          playerID,
          rooms.get(previousRoom),
          previousRoom,
          gameToLeave,
          "all",
          `${user
            .getPlayer(previousRoom)
            .getPlayerName()} left the game (Server)`,
          "alert"
        );
        console.log("Calling death handler from force kill");
        deathHandler(
          playerID,
          rooms.get(previousRoom),
          previousRoom,
          gameToLeave
        );
        // if (gameToLeave.getUsers().includes(user)) {
        //   gameToLeave.removeUser(user)
        // }
        io.to(previousRoom).emit("updateSetPlayers");
        checkForWin(
          playerID,
          rooms.get(previousRoom),
          previousRoom,
          gameToLeave
        );
      }
    }
  }

  function clearPrevious(playerID) {
    if (checkUserExist(playerID)) {
      if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
        var roomCode = connectedUsers.get(playerID).getCurrentRoom();
        var room = rooms.get(roomCode);
        var game = room.getGame();
        var user = connectedUsers.get(playerID);

        // RESET PREVIOUS USER
        for (var i = 0; i < user.getPrevious().length; i++) {
          var previousRoomCode = user.getPrevious()[i];
          var previousRoom = rooms.get(previousRoomCode);
          var previousGame = previousRoom.getGame();
          forceKill(playerID, previousRoomCode, previousGame);
          io.to(playerID).emit(
            "beginClearEvilRoom",
            previousGame.getEvilRoom()
          );
        }
        // Clear previous array
        user.setPrevious([]);
      }
    }
  }

  socket.on("setDuration", (playerID, inputValue, inputType) => {
    if (checkUserExist(playerID)) {
      if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
        var roomCode = connectedUsers.get(playerID).getCurrentRoom();
        var room = rooms.get(roomCode);
        var game = room.getGame();
        if (room.getHost() == playerID) {
          if (room.getGame().getProgress() == false) {
            if (inputType == "actions") {
              inputValue = Math.round(inputValue);
              if (inputValue >= MIN_SECONDS || inputValue <= MAX_SECONDS) {
                game.settings[inputType]["isDefault"] = false;
                game.settings[inputType]["value"] = inputValue;
              }
            } else if (inputType == "discussion") {
              if (inputValue >= MIN_SECONDS || inputValue <= MAX_SECONDS) {
                game.settings[inputType]["isDefault"] = false;
                game.settings[inputType]["value"] = inputValue;
              }
            } else if (inputType == "voting") {
              if (inputValue >= MIN_SECONDS || inputValue <= MAX_SECONDS) {
                game.settings[inputType]["isDefault"] = false;
                game.settings[inputType]["value"] = inputValue;
              }
            }
          }
          console.log("after change", game.settings);
          console.log("#########");
        }
      }
    }
  });

  socket.on("setShowRoles", (playerID, toShow) => {
    if (checkUserExist(playerID)) {
      if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
        var roomCode = connectedUsers.get(playerID).getCurrentRoom();
        var room = rooms.get(roomCode);
        var game = room.getGame();
        if (room.getHost() == playerID) {
          if (room.getGame().getProgress() == false) {
            if (toShow) {
              game.settings["showRoles"]["isDefault"] = toShow;
              game.settings["showRoles"]["value"] = toShow;
            } else if (!toShow) {
              game.settings["showRoles"]["isDefault"] = toShow;
              game.settings["showRoles"]["value"] = toShow;
            }
          }
        }
      }
    }
  });
  socket.on("setVoteMessages", (playerID, type) => {
    if (checkUserExist(playerID)) {
      if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
        var roomCode = connectedUsers.get(playerID).getCurrentRoom();
        var room = rooms.get(roomCode);
        var game = room.getGame();
        if (room.getHost() == playerID) {
          if (room.getGame().getProgress() == false) {
            if (type == "hidden") {
              game.settings["voteMessages"]["isDefault"] = false;
              game.settings["voteMessages"]["value"] = type;
            } else if (type == "anonymous") {
              game.settings["voteMessages"]["isDefault"] = false;
              game.settings["voteMessages"]["value"] = type;
            } else if (type == "visible") {
              game.settings["voteMessages"]["isDefault"] = false;
              game.settings["voteMessages"]["value"] = type;
            }
          }
        }
      }
    }
  });

  socket.on("saveGameSettings", (playerID) => {
    if (checkUserExist(playerID)) {
      if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
        var roomCode = connectedUsers.get(playerID).getCurrentRoom();
        var room = rooms.get(roomCode);
        var game = room.getGame();
        if (room.getHost() == playerID) {
          if (room.getGame().getProgress() == false) {
            setSettings(playerID, room, roomCode, game);
          }
        }
      }
    }
  });
  socket.on("loadGameSettings", (playerID, reset) => {
    if (checkUserExist(playerID)) {
      if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
        var roomCode = connectedUsers.get(playerID).getCurrentRoom();
        var room = rooms.get(roomCode);
        var game = room.getGame();
        if (room.getHost() == playerID) {
          if (room.getGame().getProgress() == false) {
            socket.emit("fetchedGameSettings", game.settings);
          }
        }
      }
    }
  });
  socket.on("resetNotSavedGameSettings", (playerID) => {
    if (checkUserExist(playerID)) {
      if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
        var roomCode = connectedUsers.get(playerID).getCurrentRoom();
        var room = rooms.get(roomCode);
        var game = room.getGame();
        if (room.getHost() == playerID) {
          if (room.getGame().getProgress() == false) {
            setSettings(playerID, room, roomCode, game);
          }
        }
      }
    }
  });

  function setSettings(playerID, room, roomCode, game) {
    for (var [setting, values] of Object.entries(game.settings)) {
      if (values.isDefault == true) {
        if (setting == "actions") {
          values.value = ACTIONS;
        } else if (setting == "discussion") {
          values.value = DISCUSSION;
        } else if (setting == "voting") {
          values.value = VOTING;
        } else if (setting == "showRoles") {
          values.value = SHOWROLES;
        } else if (setting == "voteMessages") {
          values.value = VOTEMESSAGES;
        }
      }
    }
  }

  socket.on("resetGameSettings", (playerID) => {
    if (checkUserExist(playerID)) {
      if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
        var roomCode = connectedUsers.get(playerID).getCurrentRoom();
        var room = rooms.get(roomCode);
        var game = room.getGame();
        if (room.getHost() == playerID) {
          if (room.getGame().getProgress() == false) {
            // game.settingsDefault = true;
            game.resetGameSettings();
            socket.emit("fetchedGameSettings", game.settings);
          }
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
          // Clear each player before joining another game
          for (var i = 0; i < room.getUsers().length; i++) {
            let user = room.getUsers()[i];
            clearPrevious(user.getPlayerID());
          }
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
        // if (!connectedUsers.get(playerID).getInGame()) {
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
        // }
      }
    }
  }

  socket.on("reqHandler", (playerID, req, isValid = false) => {
    if (checkUserExist(playerID)) {
      if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
        var roomCode = connectedUsers.get(playerID).getCurrentRoom();
        // if (!connectedUsers.get(playerID).getInGame()) {
        var room = rooms.get(roomCode);
        if (req.includes("rolesEqualUsers")) {
          rooms.get(roomCode).requirements.rolesEqualUsers = isValid;
        }
        checkReq(playerID);
        // }
      }
    }
  });

  function reqHandler(playerID) {
    if (checkUserExist(playerID)) {
      if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
        var roomCode = connectedUsers.get(playerID).getCurrentRoom();
        // if (!connectedUsers.get(playerID).getInGame()) {
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
        // }
      }
    }
  }

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
        reqHandler(playerID);
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
      // About 2.17 billion possible users and proxy IDs ((26+10)^6)
      // Keep checking for unique player ID
      var notUniqueID = true;
      while (notUniqueID) {
        var playerID = randomstring.generate({
          length: 6,
          charset: "alphanumeric",
        });
        if (!checkUserExist(playerID)) {
          notUniqueID = false;
        }
      }
      // Keep checking for unique proxy ID
      var notUniqueProxy = true;
      while (notUniqueProxy) {
        var proxyID = randomstring.generate({
          length: 6,
          charset: "alphanumeric",
        });
        if (!checkProxyExist(proxyID)) {
          if (!checkProxyEqual(playerID, proxyID)) {
            notUniqueProxy = false;
          }
        }
      }

      if (!notUniqueID && !notUniqueProxy) {
        console.log("Proxy created");
        proxyIdenfication.set(playerID, proxyID);
        socket.emit("playerID", playerID);
      } else if (notUniqueID && notUniqueProxy) {
        socket.emit("playerID", null);
      }
    }
  });

  // log if player has created an ID
  socket.on("completedID", (playerID) => {
    console.log("player", playerID, "has created an ID");
  });

  function checkProxyEqual(playerID, proxyID) {
    if (playerID !== proxyID) {
      return false;
    } else if (playerID == proxyID) {
      return true;
    }
  }

  function checkProxyExist(proxyID) {
    if (Array.from(proxyIdenfication.values()).includes(proxyID)) {
      return true;
    } else {
      return false;
    }
  }

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
      socket.emit("showChangeUsername", true);
    }
  });

  socket.on("changeUsername", (playerID, newName) => {
    if (checkUserExist(playerID)) {
      console.log("NewName:", newName, ", playerID:", playerID);
      let user = connectedUsers.get(playerID);
      user.setName(newName);
      console.log("Users:", connectedUsers.get(playerID));
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

  function checkForAlreadyExistingUser(roomCode, playerID) {
    var room = rooms.get(roomCode);
    var game = room.getGame();
    if (checkUserExist(playerID)) {
      if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
        if (room.getUsers().includes(connectedUsers.get(playerID)) == false) {
          room.addUser(connectedUsers.get(playerID));
        }
      }
    }
  }

  socket.on("refreshReady", (playerID, state) => {
    if (checkUserExist(playerID)) {
      if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
        var roomCode = connectedUsers.get(playerID).getCurrentRoom();

        if (state.includes("socket")) {
          var notReady = false;
          connectedUsers.get(playerID).setReadyLobby(notReady);
        }
        io.to(roomCode).emit(
          "ready-status-lobby-refresh",
          generateProxyReadyLobby(playerID)
        );
      }
    }
  });
  socket.on("requestLobbyDisplayCard", (playerID, targetID) => {
    if (checkUserExist(playerID)) {
      if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
        var roomCode = connectedUsers.get(playerID).getCurrentRoom();
        if (targetID !== null && targetID !== undefined && targetID !== "") {
          var roleObject = jsonData["roles"][targetID];
          socket.emit(
            "fetchedLobbyDisplayCard",
            roleObject.name,
            roleObject.team,
            roleObject.description,
            roleObject.mission
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
          io.to(connectedUsers.get(playerID).getCurrentRoom()).emit(
            emitTo,
            generateProxyReadyLobby(playerID)
          );
          updatePlayerCount(playerID);
        } else if (state.includes("game")) {
          // emitTo = "ready-status-game";
          connectedUsers
            .get(playerID)
            .getPlayer(roomCode)
            .setReadyGame(notReady);

          // var playerIsReady = connectedUsers.get(playerID).getReadyGame();
          // socket.to(connectedUsers.get(playerID), playerIsReady, checkAllReadyGame(roomCode, playerID)).emit(emitTo);
        }
      }
    }
  });

  function checkAllReadyGame(roomCode, playerID) {
    var count = 0;
    if (checkUserExist(playerID)) {
      if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
        var users = rooms.get(roomCode).getGame().getAlive();
        for (var i = 0; i < users.length; i++) {
          if (users[i].getPlayer(roomCode).getReadyGame()) {
            count++;
          }
        }
        if (count == users.length) {
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

  function generateProxyReadyLobby(playerID) {
    if (checkUserExist(playerID)) {
      if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
        var roomCode = connectedUsers.get(playerID).getCurrentRoom();
        var room = rooms.get(roomCode);
        var proxyUsers = [];
        for (var i = 0; i < room.getUsers().length; i++) {
          let thePlayerID = proxyIdenfication.get(room.getUsers()[i].playerID);
          let readyLobby = room.getUsers()[i].readyLobby;
          var proxyUser = { thePlayerID, readyLobby };
          proxyUsers.push(proxyUser);
        }
        return proxyUsers;
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
          io.to(connectedUsers.get(playerID).getCurrentRoom()).emit(
            emitTo,
            generateProxyReadyLobby(playerID)
          );
          updatePlayerCount(playerID);
        } else if (state.includes("game")) {
          // emitTo = "ready-status-game";
          connectedUsers.get(playerID).getPlayer(roomCode).setReadyGame(ready);

          // var playerIsReady = connectedUsers.get(playerID).getReadyGame();
          // socket.to(connectedUsers.get(playerID), playerIsReady, checkAllReadyGame(roomCode, playerID)).emit(emitTo);
        }
      }
    }
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
  socket.on("directJoin", (playerID, directRoom, state) => {
    if (checkUserExist(playerID)) {
      connectedUsers.get(playerID).setCurrentRoom(directRoom);
      if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
        var roomCode = connectedUsers.get(playerID).getCurrentRoom();
        console.log("THIS " + roomCode);
        if (state.includes("lobby")) {
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
          socket.emit("joinPlayerSlot");
        } else if (state.includes("app")) {
          if (
            rooms.get(roomCode).getGame().getProgress() == true &&
            rooms
              .get(roomCode)
              .getGame()
              .getUsers()
              .includes(connectedUsers.get(playerID))
          ) {
            socket.join(connectedUsers.get(playerID).getCurrentRoom());
            // checkForAlreadyExistingUser(roomCode, playerID);
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

            socket.emit("joinPlayerSlot");
          }
        }
      }
    }
    socket.data.playerID = playerID;
  });

  socket.on("requestPlayerSlot", (playerID) => {
    if (checkUserExist(playerID)) {
      if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
        var roomCode = connectedUsers.get(playerID).getCurrentRoom();

        var room = rooms.get(roomCode);
        var slotAlreadyExist = false;
        for (var [key, value] of Object.entries(room.slots)) {
          if (value.userID == proxyIdenfication.get(playerID)) {
            slotAlreadyExist = true;
          }
        }
        if (!slotAlreadyExist) {
          for (var [key, value] of Object.entries(room.slots)) {
            if (value.taken == false) {
              room.slots[key]["taken"] = true;
              room.slots[key]["userID"] = proxyIdenfication.get(playerID);
              room.slots[key]["userName"] = connectedUsers
                .get(playerID)
                .getName();
              io.to(roomCode).emit(
                "playerSlots",
                proxyIdenfication.get(room.getHost()),
                room.slots
              );

              break;
            }
          }
        }
        io.to(room.getHost()).emit("updateLobbyPlayers", room.slots);
      }
    }
  });


  socket.on("requestLobbyPlayers", (playerID) => {
    if (checkUserExist(playerID)) {
      if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
        var roomCode = connectedUsers.get(playerID).getCurrentRoom();
        var room = rooms.get(roomCode);
        if (room.getHost() == playerID) {
          console.log("showing lobby players")
          socket.emit(
            "fetchLobbyPlayers",
            room.slots
          );
        }
      }

    }
  });
  socket.on("kickPlayer", (playerID, proxyID) => {
    if (checkUserExist(playerID)) {
      var roomCode = getHostRoom(rooms, playerID)
      if (roomCode !== null) {
        var room = rooms.get(roomCode);
        if (room.getHost() == playerID) {
          var playerToKick = getKeyFromValue(proxyIdenfication, proxyID);
          io.to(playerToKick).emit(
            "hostKick",
          );
        }
      }
    }
  });

  function updatePlayerSlot(playerID) {
    if (checkUserExist(playerID)) {
      if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
        var roomCode = connectedUsers.get(playerID).getCurrentRoom();
        var room = rooms.get(roomCode);
        io.to(roomCode).emit(
          "playerSlots",
          proxyIdenfication.get(room.getHost()),
          room.slots
        );
        
      }

    }
  }
  function clearPlayerSlot(playerID) {
    if (checkUserExist(playerID)) {
      
      if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
        var roomCode = connectedUsers.get(playerID).getCurrentRoom();
  
        var room = rooms.get(roomCode);
        for (var [key, value] of Object.entries(room.slots)) {
          if (value.userID == proxyIdenfication.get(playerID)) {
            room.slots[key]["taken"] = false;
            room.slots[key]["userID"] = undefined;
            room.slots[key]["userName"] = "";
            io.to(connectedUsers.get(playerID).getCurrentRoom()).emit(
              "playerSlots",
              proxyIdenfication.get(room.getHost()),
              room.slots
            );
            break;
          }
        }
        io.to(room.getHost()).emit("updateLobbyPlayers", room.slots);
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
          // About 60.4 million possible rooms((26+10)^5)
          var notUniqueRoom = true;
          while (notUniqueRoom) {
            var roomCode = randomstring.generate({
              length: 5,
              charset: "alphanumeric",
              capitalization: "uppercase",
              readable: true,
            });
            if (!rooms.has(roomCode)) {
              notUniqueRoom = false;
            }
          }
          if (!notUniqueRoom) {
            // Setting up room
            connectedUsers.get(playerID).setCurrentRoom(roomCode);
            rooms.set(roomCode, new Room(playerID));
            checkForAlreadyExistingUser(roomCode, playerID);

            console.log("room", roomCode, "created");
            console.log(socket.id, "joined", roomCode);

            // Log rooms that socket is in
            console.log(rooms);
          }
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
          readable: true,
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
  socket.on("checkRoomCode", (roomCode, playerID, state) => {
    console.log("this player", playerID);
    if (checkUserExist(playerID)) {
      console.log(playerID, "trying roomcode", roomCode);
      var emitTo = ""
      if (state.includes("first")) {
        emitTo = "roomCodeResponseFirst"
      }
      else if (state.includes("press")) {
        emitTo = "roomCodeResponsePress"
      }
      if (rooms.has(roomCode)) {
        // ! CHANGE THIS TO 14
        if (rooms.get(roomCode).userCount() >= maxPlayers) {
          socket.emit(emitTo, "full");
          
        } else {
          console.log("room code", roomCode, "is valid");
          console.log(socket.rooms);
          socket.emit(emitTo, "valid");
          if (connectedUsers.get(playerID).getCurrentRoom() !== roomCode) {
            if (rooms.get(roomCode).getUsers().includes(playerID)) {
              console.log("user already in room");
            } else {
              connectedUsers.get(playerID).setCurrentRoom(roomCode);
            }
          }
        }
      } else {
        socket.emit(emitTo, "invalid");
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
  });

  socket.on("checkRoleCount", (playerID) => {
    if (checkUserExist(playerID)) {
      if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
        var roomCode = connectedUsers.get(playerID).getCurrentRoom();

        io.to(connectedUsers.get(playerID).getCurrentRoom()).emit(
          "currentRoleCount",
          rooms.get(roomCode).getRoles().length,
          rooms.get(roomCode).getUsers().length
        );
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
          io.to(roomCode).emit(
            "currentRoleCount",
            rooms.get(roomCode).getRoles().length,
            rooms.get(roomCode).getUsers().length
          );
        }
      }
    }
  });

  // GAME related
  // ====================================================

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
              var role = connectedUsers
                .get(playerID)
                .getPlayer(roomCode)
                .getRole();
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
                .getPlayer(roomCode)
                .getRole()
                .team.includes("evil")
            ) {
              console.log(
                connectedUsers.get(playerID) +
                  " is joining evil room: " +
                  game.getEvilRoom()
              );
              socket.join(game.getEvilRoom());
              console.log("with evil room", socket.rooms);
            }
          }
        }
      }
    }
  });

  // Socket that handles the voteCount, depending on night and day
  // Voting system day
  // Voting system for evil room, check that evil room works
  // Check that dead works
  // Dead popup, everything remains

  // System for handling the different abilities, in priorirty order

  // REMAKE PLAYERACTION
  socket.on("playerAction", (playerID, elementID, targetID) => {
    if (checkUserExist(playerID)) {
      if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
        var roomCode = connectedUsers.get(playerID).getCurrentRoom();
        var room = rooms.get(roomCode);
        var game = room.getGame();
        if (game.getProgress()) {
          if (game.getUsers().includes(connectedUsers.get(playerID))) {
            var user = connectedUsers.get(playerID);
            var player = user.getPlayer(roomCode);
            var isValidTarget = false;
            var validTargets = generateValidPlayerList(playerID);

            for (var i = 0; i < validTargets.length; i++) {
              if (
                validTargets[i].userID == targetID &&
                (validTargets[i].type !== "unselectable" ||
                  validTargets[i].type !== "dead" ||
                  validTargets[i].type !== "evil+unselectable")
              ) {
                isValidTarget = true;
              }
            }
            if (isValidTarget) {
              if (elementID == "game-button-ability") {
                if (game.getPhase() == "actions") {
                  if (game.getTimer().getCounter() >= 0) {
                    if (player.abilityTarget !== null) {
                      var previousAbilityTargetPlayer = connectedUsers
                        .get(
                          getKeyFromValue(
                            proxyIdenfication,
                            player.abilityTarget
                          )
                        )
                        .getPlayer(roomCode);
                    }
                    var theAbilityTargetPlayer = connectedUsers
                      .get(getKeyFromValue(proxyIdenfication, targetID))
                      .getPlayer(roomCode);
                    // New target
                    if (player.getRole().team.includes("evil")) {
                      if (player.abilityTarget == null) {
                        var abilityMessage = "";
                        if (player.getRole().type.includes("surgeon")) {
                          if (
                            player.getRole().selfUsage > 0 &&
                            player == theAbilityTargetPlayer
                          ) {
                            abilityMessage = `${player.getPlayerName()} is going to disguise themselves`;
                            player.abilityTarget = targetID;
                          } else {
                            player.abilityTarget = targetID;
                            abilityMessage = `${player.getPlayerName()} is going to disguise ${theAbilityTargetPlayer.getPlayerName()}`;
                          }
                        } else if (player.getRole().type.includes("witch")) {
                          player.abilityTarget = targetID;
                          abilityMessage = `${player.getPlayerName()} is going to cast a freeze spell on ${theAbilityTargetPlayer.getPlayerName()}`;
                        } else if (player.getRole().type.includes("framer")) {
                          player.abilityTarget = targetID;
                          abilityMessage = `${player.getPlayerName()} is going to frame ${theAbilityTargetPlayer.getPlayerName()}`;
                        }
                      } else if (
                        player.abilityTarget !== targetID &&
                        player.abilityTarget !== null
                      ) {
                        var abilityMessage = "";
                        if (player.getRole().type.includes("surgeon")) {
                          if (
                            player.getRole().selfUsage > 0 &&
                            player == theAbilityTargetPlayer
                          ) {
                            abilityMessage = `${player.getPlayerName()} is going to disguise themselves`;
                            player.abilityTarget = targetID;
                          } else {
                            player.abilityTarget = targetID;
                            abilityMessage = `${player.getPlayerName()} is going to disguise ${theAbilityTargetPlayer.getPlayerName()}`;
                          }
                        } else if (player.getRole().type.includes("witch")) {
                          player.abilityTarget = targetID;
                          abilityMessage = `${player.getPlayerName()} is going to cast a freeze spell on ${theAbilityTargetPlayer.getPlayerName()}`;
                        } else if (player.getRole().type.includes("framer")) {
                          player.abilityTarget = targetID;
                          abilityMessage = `${player.getPlayerName()} is going to frame ${theAbilityTargetPlayer.getPlayerName()}`;
                        }
                      } else if (
                        player.abilityTarget == targetID &&
                        player.abilityTarget !== null
                      ) {
                        player.abilityTarget = null;
                        var abilityMessage = "";
                        if (player.getRole().type.includes("surgeon")) {
                          abilityMessage = `${player.getPlayerName()} is not going to disguise anyone`;
                        } else if (player.getRole().type.includes("witch")) {
                          abilityMessage = `${player.getPlayerName()} is not going to cast magic`;
                        } else if (player.getRole().type.includes("framer")) {
                          abilityMessage = `${player.getPlayerName()} is not going to frame anyone`;
                        }
                      }
                      sendMessage(
                        playerID,
                        room,
                        roomCode,
                        game,
                        "evil",
                        abilityMessage,
                        "Night"
                      );
                    } else {
                      var abilityMessage = "";
                      if (player.abilityTarget == null) {
                        if (player.getRole().type.includes("doctor")) {
                          if (
                            player.getRole().selfUsage > 0 &&
                            player == theAbilityTargetPlayer
                          ) {
                            abilityMessage = `You are targeting yourself`;
                            player.abilityTarget = targetID;
                          } else {
                            abilityMessage = `You are targeting ${theAbilityTargetPlayer.getPlayerName()}`;
                            player.abilityTarget = targetID;
                          }
                        } else {
                          player.abilityTarget = targetID;
                          abilityMessage = `You are targeting ${theAbilityTargetPlayer.getPlayerName()}`;
                        }
                      } else if (
                        player.abilityTarget !== targetID &&
                        player.abilityTarget !== null
                      ) {
                        if (player.getRole().type.includes("doctor")) {
                          if (
                            player.getRole().selfUsage > 0 &&
                            player == theAbilityTargetPlayer
                          ) {
                            abilityMessage = `You are targeting yourself`;
                            player.abilityTarget = targetID;
                          } else {
                            abilityMessage = `You are targeting ${theAbilityTargetPlayer.getPlayerName()}`;
                            player.abilityTarget = targetID;
                          }
                        } else {
                          player.abilityTarget = targetID;
                          abilityMessage = `You are targeting ${theAbilityTargetPlayer.getPlayerName()}`;
                        }
                      } else if (
                        player.abilityTarget == targetID &&
                        player.abilityTarget !== null
                      ) {
                        player.abilityTarget = null;
                        abilityMessage = `You are not targeting anyone`;
                      }
                      sendMessage(
                        playerID,
                        room,
                        roomCode,
                        game,
                        "socket",
                        abilityMessage,
                        "Night"
                      );
                    }
                  }
                } else if (
                  game.getPhase() == "voting" &&
                  game.getCycle() == "Day"
                ) {
                  if (game.getTimer().getCounter() >= 0) {
                    if (
                      player.getRole().type.includes("mayor") &&
                      player.getRole().hasOwnProperty("revealed")
                    ) {
                      if (targetID !== null) {
                        console.log("Mayor target not null");
                        var theAbilityTargetPlayer = connectedUsers
                          .get(getKeyFromValue(proxyIdenfication, targetID))
                          .getPlayer(roomCode);
                        if (player == theAbilityTargetPlayer) {
                          console.log("Mayor selected themself");
                          if (player.getRole().revealed == false) {
                            console.log("Mayor not revealed");
                            mayorReveal(playerID, room, roomCode, game);
                            // Reset
                            // player.abilityTarget = targetID;
                          }
                        }
                      }
                    }
                  }
                }
              } else if (elementID == "game-button-vote") {
                if (player.voteTarget !== null) {
                  var previousVoteTargetPlayer = connectedUsers
                    .get(getKeyFromValue(proxyIdenfication, player.voteTarget))
                    .getPlayer(roomCode);
                }
                var theVoteTargetPlayer = connectedUsers
                  .get(getKeyFromValue(proxyIdenfication, targetID))
                  .getPlayer(roomCode);
                // New target

                if (game.getCycle() == "Night") {
                  if (game.getPhase() == "actions") {
                    if (game.getTimer().getCounter() >= 0) {
                      if (player.getRole().team.includes("evil")) {
                        if (player.voteTarget == null) {
                          player.voteTarget = targetID;
                          theVoteTargetPlayer.nightVotes +=
                            player.getRole().killVoteCount;
                          sendMessage(
                            playerID,
                            room,
                            roomCode,
                            game,
                            "evil",
                            `${player.getPlayerName()} is voting to kill ${theVoteTargetPlayer.getPlayerName()} (${
                              theVoteTargetPlayer.nightVotes
                            })`,
                            "Night"
                          );
                        } else if (
                          player.voteTarget !== targetID &&
                          player.voteTarget !== null
                        ) {
                          player.voteTarget = targetID;
                          previousVoteTargetPlayer.nightVotes -=
                            player.getRole().killVoteCount;
                          theVoteTargetPlayer.nightVotes +=
                            player.getRole().killVoteCount;
                          sendMessage(
                            playerID,
                            room,
                            roomCode,
                            game,
                            "evil",
                            `${player.getPlayerName()} changed their vote to kill ${theVoteTargetPlayer.getPlayerName()} (${
                              theVoteTargetPlayer.nightVotes
                            })`,
                            "Night"
                          );
                        } else if (
                          player.voteTarget == targetID &&
                          player.voteTarget !== null
                        ) {
                          player.voteTarget = null;
                          theVoteTargetPlayer.nightVotes -=
                            player.getRole().killVoteCount;
                          sendMessage(
                            playerID,
                            room,
                            roomCode,
                            game,
                            "evil",
                            `${player.getPlayerName()} removed their vote from ${theVoteTargetPlayer.getPlayerName()} (${
                              theVoteTargetPlayer.nightVotes
                            })`,
                            "Night"
                          );
                        }
                      }
                    }
                  }
                } else if (game.getCycle() == "Day") {
                  if (game.getPhase() == "voting") {
                    if (game.getTimer().getCounter() >= 0) {
                      if (player.voteTarget == null) {
                        player.voteTarget = targetID;
                        theVoteTargetPlayer.dayVotes +=
                          player.getRole().voteCount;
                        if (game.settings.voteMessages.value == "anonymous") {
                          sendMessage(
                            playerID,
                            room,
                            roomCode,
                            game,
                            "all",
                            `${player.getPlayerName()} have cast their vote`,
                            "Day"
                          );
                        } else if (
                          game.settings.voteMessages.value == "visible"
                        ) {
                          sendMessage(
                            playerID,
                            room,
                            roomCode,
                            game,
                            "all",
                            `${player.getPlayerName()} is voting to lynch ${theVoteTargetPlayer.getPlayerName()} (${
                              theVoteTargetPlayer.dayVotes
                            })`,
                            "Day"
                          );
                        }
                      } else if (
                        player.voteTarget !== targetID &&
                        player.voteTarget !== null
                      ) {
                        previousVoteTargetPlayer.dayVotes -=
                          player.getRole().voteCount;

                        player.voteTarget = targetID;
                        theVoteTargetPlayer.dayVotes +=
                          player.getRole().voteCount;
                        if (game.settings.voteMessages.value == "anonymous") {
                          sendMessage(
                            playerID,
                            room,
                            roomCode,
                            game,
                            "all",
                            `${player.getPlayerName()} has changed their vote`,
                            "Day"
                          );
                        } else if (
                          game.settings.voteMessages.value == "visible"
                        ) {
                          sendMessage(
                            playerID,
                            room,
                            roomCode,
                            game,
                            "all",
                            `${player.getPlayerName()} has changed their vote to lynch ${theVoteTargetPlayer.getPlayerName()} (${
                              theVoteTargetPlayer.dayVotes
                            })`,
                            "Day"
                          );
                        }
                      } else if (
                        player.voteTarget == targetID &&
                        player.voteTarget !== null
                      ) {
                        player.voteTarget = null;
                        theVoteTargetPlayer.dayVotes -=
                          player.getRole().voteCount;
                        if (game.settings.voteMessages.value == "anonymous") {
                          sendMessage(
                            playerID,
                            room,
                            roomCode,
                            game,
                            "all",
                            `${player.getPlayerName()} removed their vote`,
                            "Day"
                          );
                        } else if (
                          game.settings.voteMessages.value == "visible"
                        ) {
                          sendMessage(
                            playerID,
                            room,
                            roomCode,
                            game,
                            "all",
                            `${player.getPlayerName()} removed their vote from ${theVoteTargetPlayer.getPlayerName()} (${
                              theVoteTargetPlayer.dayVotes
                            })`,
                            "Day"
                          );
                        }
                      }
                    }
                  }
                }
              }
              console.log(
                "valid target selected",
                "abilityTarget:",
                player.abilityTarget,
                "voteTarget:",
                player.voteTarget
              );
            } else {
              console.log(
                "--INVALID target selected",
                "abilityTarget:",
                player.abilityTarget,
                "voteTarget:",
                player.voteTarget,
                "--"
              );
            }

            socket.emit(
              "currentPlayerTargets",
              player.abilityTarget,
              player.voteTarget,
              player
            );
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
            socket.emit(
              "fetchedActionData",
              game.getCycle(),
              connectedUsers.get(playerID).getPlayer(roomCode).getRole()
            );
          }
        }
      }
    }
  });

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

  function generateValidPlayerList(playerID) {
    var roomCode = connectedUsers.get(playerID).getCurrentRoom();
    var room = rooms.get(roomCode);
    var game = room.getGame();
    var socketUser = connectedUsers.get(playerID);
    var toSend = [];
    var seenAll = [];

    var socketPlayer = socketUser.getPlayer(roomCode);
    var socketRole = socketPlayer.getRole();

    for (var i = 0; i < game.getUsers().length; i++) {
      var type = "none";
      var isEvil = null;

      var user = game.getUsers()[i];
      // TOOD: Change it so the USER ID, is not the same as the user id for the cookie
      // var userID = game.getUsers()[i].getPlayerID();
      // ? PROXY
      var userID = proxyIdenfication.get(game.getUsers()[i].getPlayerID());
      var userName = game.getUsers()[i].getName();
      var userRole = game.getUsers()[i].getPlayer(roomCode).getRole();

      // Fix this, seenAll, seenAll

      if (game.getCycle().includes("Night")) {
        // Night
        if (
          user.getPlayer(roomCode).getIsKilled() ||
          user.getPlayer(roomCode).getIsLynched()
        ) {
          type = "dead";
          if (socketRole.team.includes("evil")) {
            if (userRole.team.includes("evil")) {
              type = "evil+dead";
              isEvil = true;
            } else {
              if (userRole.type.includes("mayor")) {
                if (userRole.hasOwnProperty("revealed")) {
                  if (userRole.revealed == true) {
                    type = "mayor+dead";
                    isEvil = false;
                  } else {
                    type = "dead";
                    isEvil = false;
                  }
                }
              } else {
                isEvil = false;
                type = "dead";
              }
            }
          } else {
            if (
              socketRole.type.includes("executioner") ||
              (socketRole.type.includes("jester") &&
                socketPlayer.getOldRole() !== null)
            ) {
              if (socketRole.type.includes("executioner")) {
                if (user == socketRole.target) {
                  isEvil = null;
                  type = "target+dead";
                } else {
                  if (userRole.type.includes("mayor")) {
                    if (userRole.hasOwnProperty("revealed")) {
                      if (userRole.revealed == true) {
                        type = "mayor+dead";
                        isEvil = null;
                      } else {
                        type = "dead";
                        isEvil = null;
                      }
                    }
                  } else {
                    isEvil = null;
                    type = "dead";
                  }
                }
              } else if (
                socketRole.type.includes("jester") &&
                socketPlayer.getOldRole().includes("executioner")
              ) {
                if (user == socketPlayer.getOldTarget()) {
                  isEvil = null;
                  type = "target+dead";
                } else {
                  if (userRole.type.includes("mayor")) {
                    if (userRole.hasOwnProperty("revealed")) {
                      if (userRole.revealed == true) {
                        type = "mayor+dead";
                        isEvil = null;
                      } else {
                        type = "dead";
                        isEvil = null;
                      }
                    }
                  } else {
                    isEvil = null;
                    type = "dead";
                  }
                }
              }
            } else if (socketRole.type.includes("lawyer")) {
              if (user == socketRole.client) {
                isEvil = null;
                type = "client+dead";
              } else {
                if (userRole.type.includes("mayor")) {
                  if (userRole.hasOwnProperty("revealed")) {
                    if (userRole.revealed == true) {
                      type = "mayor+dead";
                      isEvil = null;
                    } else {
                      type = "dead";
                      isEvil = null;
                    }
                  }
                } else {
                  isEvil = null;
                  type = "dead";
                }
              }
            } else if (userRole.type.includes("mayor")) {
              if (userRole.hasOwnProperty("revealed")) {
                if (userRole.revealed == true) {
                  type = "mayor+dead";
                  isEvil = null;
                } else {
                  type = "dead";
                  isEvil = null;
                }
              }
            } else {
              isEvil = null;
            }
          }
          pushPlayer(toSend, seenAll, userID, userName, type, isEvil);
        }

        if (userRole.type.includes("mayor")) {
          if (userRole.hasOwnProperty("revealed")) {
            if (userRole.revealed == true) {
              type = "mayor";
              isEvil = null;
              pushPlayer(toSend, seenAll, userID, userName, type, isEvil);
            } else {
              type = "none";
              isEvil = null;
              pushPlayer(toSend, seenAll, userID, userName, type, isEvil);
            }
          }
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
                  pushPlayer(toSend, seenAll, userID, userName, type, isEvil);
                } else if (userRole.selfUsage == 0) {
                  type = "evil+unselectable";
                  isEvil = true;
                  pushPlayer(toSend, seenAll, userID, userName, type, isEvil);
                }
              } else {
                type = "evil+unselectable";
                isEvil = true;
                pushPlayer(toSend, seenAll, userID, userName, type, isEvil);
              }
            } else {
              if (userRole.type.includes("doctor")) {
                if (userRole.selfUsage > 0) {
                  type = "none";
                  isEvil = null;
                  pushPlayer(toSend, seenAll, userID, userName, type, isEvil);
                } else if (userRole.selfUsage == 0) {
                  type = "unselectable";
                  isEvil = null;
                  pushPlayer(toSend, seenAll, userID, userName, type, isEvil);
                }
              } else {
                isEvil = null;
                type = "unselectable";
                pushPlayer(toSend, seenAll, userID, userName, type, isEvil);
              }
            }
          } else {
            // everyone else
            if (socketRole.type.includes("surgeon")) {
              if (userRole.team.includes("evil")) {
                isEvil = true;
                type = "evil";
                pushPlayer(toSend, seenAll, userID, userName, type, isEvil);
              } else {
                isEvil = false;
                type = "none";
                pushPlayer(toSend, seenAll, userID, userName, type, isEvil);
              }
            } else if (socketRole.type.includes("witch")) {
              if (userRole.team.includes("evil")) {
                isEvil = true;
                type = "evil+unselectable";
                pushPlayer(toSend, seenAll, userID, userName, type, isEvil);
              } else {
                isEvil = false;
                type = "none";
                pushPlayer(toSend, seenAll, userID, userName, type, isEvil);
              }
            } else if (socketRole.type.includes("framer")) {
              if (userRole.team.includes("evil")) {
                isEvil = true;
                type = "evil+unselectable";
                pushPlayer(toSend, seenAll, userID, userName, type, isEvil);
              } else {
                isEvil = false;
                type = "none";
                pushPlayer(toSend, seenAll, userID, userName, type, isEvil);
              }
            } else {
              isEvil = null;
              type = "none";
              pushPlayer(toSend, seenAll, userID, userName, type, isEvil);
            }
          }
        } else {
          // NO night ability
          if (user == socketUser) {
            // yourself
            if (userRole.team.includes("evil")) {
              isEvil = true;
              type = "evil+unselectable";
              pushPlayer(toSend, seenAll, userID, userName, type, isEvil);
            } else {
              isEvil = null;
              type = "none";
              pushPlayer(toSend, seenAll, userID, userName, type, isEvil);
            }
          } else {
            if (socketRole.team.includes("evil")) {
              if (userRole.team.includes("evil")) {
                isEvil = true;
                type = "evil+unselectable";
                pushPlayer(toSend, seenAll, userID, userName, type, isEvil);
              } else {
                isEvil = false;
                type = "none";
                pushPlayer(toSend, seenAll, userID, userName, type, isEvil);
              }
            }
            // if socket is executioner
            else if (
              socketRole.type.includes("executioner") ||
              (socketRole.type.includes("jester") &&
                socketPlayer.getOldRole() !== null)
            ) {
              if (socketRole.type.includes("executioner")) {
                if (user == socketRole.target) {
                  isEvil = null;
                  type = "target";
                  pushPlayer(toSend, seenAll, userID, userName, type, isEvil);
                } else {
                  isEvil = null;
                  type = "none";
                  pushPlayer(toSend, seenAll, userID, userName, type, isEvil);
                }
              } else if (
                socketRole.type.includes("jester") &&
                socketPlayer.getOldRole().includes("executioner")
              ) {
                if (user == socketPlayer.getOldTarget()) {
                  isEvil = null;
                  type = "target";
                  pushPlayer(toSend, seenAll, userID, userName, type, isEvil);
                } else {
                  isEvil = null;
                  type = "none";
                  pushPlayer(toSend, seenAll, userID, userName, type, isEvil);
                }
              }
            }
            // if socket is lawyer
            else if (socketRole.type.includes("lawyer")) {
              if (user == socketRole.client) {
                isEvil = null;
                type = "client";
                pushPlayer(toSend, seenAll, userID, userName, type, isEvil);
              } else {
                isEvil = null;
                type = "none";
                pushPlayer(toSend, seenAll, userID, userName, type, isEvil);
              }
            } else {
              isEvil = null;
              type = "none";
              pushPlayer(toSend, seenAll, userID, userName, type, isEvil);
            }
          }
        }
      } else if (game.getCycle().includes("Day")) {
        // Day
        if (
          user.getPlayer(roomCode).getIsKilled() ||
          user.getPlayer(roomCode).getIsLynched()
        ) {
          type = "dead";
          if (socketRole.team.includes("evil")) {
            if (userRole.team.includes("evil")) {
              type = "evil+dead";
              isEvil = true;
            } else {
              if (userRole.type.includes("mayor")) {
                if (userRole.hasOwnProperty("revealed")) {
                  if (userRole.revealed == true) {
                    type = "mayor+dead";
                    isEvil = false;
                  } else {
                    type = "dead";
                    isEvil = false;
                  }
                }
              } else {
                isEvil = false;
                type = "dead";
              }
            }
          } else {
            if (
              socketRole.type.includes("executioner") ||
              (socketRole.type.includes("jester") &&
                socketPlayer.getOldRole() !== null)
            ) {
              if (socketRole.type.includes("executioner")) {
                if (user == socketRole.target) {
                  isEvil = null;
                  type = "target+dead";
                } else {
                  if (userRole.type.includes("mayor")) {
                    if (userRole.hasOwnProperty("revealed")) {
                      if (userRole.revealed == true) {
                        type = "mayor+dead";
                        isEvil = null;
                      } else {
                        type = "dead";
                        isEvil = null;
                      }
                    }
                  } else {
                    isEvil = null;
                    type = "dead";
                  }
                }
              } else if (
                socketRole.type.includes("jester") &&
                socketPlayer.getOldRole().includes("executioner")
              ) {
                if (user == socketPlayer.getOldTarget()) {
                  isEvil = null;
                  type = "target+dead";
                } else {
                  if (userRole.type.includes("mayor")) {
                    if (userRole.hasOwnProperty("revealed")) {
                      if (userRole.revealed == true) {
                        type = "mayor+dead";
                        isEvil = null;
                      } else {
                        type = "dead";
                        isEvil = null;
                      }
                    }
                  } else {
                    isEvil = null;
                    type = "dead";
                  }
                }
              }
            } else if (socketRole.type.includes("lawyer")) {
              if (user == socketRole.client) {
                isEvil = null;
                type = "client+dead";
              } else {
                if (userRole.type.includes("mayor")) {
                  if (userRole.hasOwnProperty("revealed")) {
                    if (userRole.revealed == true) {
                      type = "mayor+dead";
                      isEvil = null;
                    } else {
                      type = "dead";
                      isEvil = null;
                    }
                  }
                } else {
                  isEvil = null;
                  type = "dead";
                }
              }
            } else if (userRole.type.includes("mayor")) {
              if (userRole.hasOwnProperty("revealed")) {
                if (userRole.revealed == true) {
                  type = "mayor+dead";
                  isEvil = null;
                } else {
                  type = "dead";
                  isEvil = null;
                }
              }
            } else {
              isEvil = null;
            }
          }
          pushPlayer(toSend, seenAll, userID, userName, type, isEvil);
        }

        if (userRole.type.includes("mayor")) {
          if (userRole.hasOwnProperty("revealed")) {
            if (userRole.revealed == true) {
              type = "mayor";
              isEvil = null;
              pushPlayer(toSend, seenAll, userID, userName, type, isEvil);
            } else {
              type = "none";
              isEvil = null;
              pushPlayer(toSend, seenAll, userID, userName, type, isEvil);
            }
          }
        }

        if (user == socketUser) {
          // yourself
          if (userRole.team.includes("evil")) {
            isEvil = true;
            type = "evil";
            pushPlayer(toSend, seenAll, userID, userName, type, isEvil);
          } else {
            isEvil = null;
            type = "none";
            pushPlayer(toSend, seenAll, userID, userName, type, isEvil);
          }
        } else {
          // everyone else
          if (socketRole.team.includes("evil")) {
            if (userRole.team.includes("evil")) {
              isEvil = true;
              type = "evil";
              pushPlayer(toSend, seenAll, userID, userName, type, isEvil);
            } else {
              isEvil = false;
              type = "none";
              pushPlayer(toSend, seenAll, userID, userName, type, isEvil);
            }
          }
          // if socket is executioner
          else if (
            socketRole.type.includes("executioner") ||
            (socketRole.type.includes("jester") &&
              socketPlayer.getOldRole() !== null)
          ) {
            if (socketRole.type.includes("executioner")) {
              if (user == socketRole.target) {
                isEvil = null;
                type = "target";
                pushPlayer(toSend, seenAll, userID, userName, type, isEvil);
              } else {
                isEvil = null;
                type = "none";
                pushPlayer(toSend, seenAll, userID, userName, type, isEvil);
              }
            } else if (
              socketRole.type.includes("jester") &&
              socketPlayer.getOldRole().includes("executioner")
            ) {
              if (user == socketPlayer.getOldTarget()) {
                isEvil = null;
                type = "target";
                pushPlayer(toSend, seenAll, userID, userName, type, isEvil);
              } else {
                isEvil = null;
                type = "none";
                pushPlayer(toSend, seenAll, userID, userName, type, isEvil);
              }
            }
          }
          // if socket is lawyer
          else if (socketRole.type.includes("lawyer")) {
            if (user == socketRole.client) {
              isEvil = null;
              type = "client";
              pushPlayer(toSend, seenAll, userID, userName, type, isEvil);
            } else {
              isEvil = null;
              type = "none";
              pushPlayer(toSend, seenAll, userID, userName, type, isEvil);
            }
          } else {
            isEvil = null;
            type = "none";
            pushPlayer(toSend, seenAll, userID, userName, type, isEvil);
          }
        }
      }
    }
    return toSend;
  }

  function setPlayers(playerID, state) {
    console.log("SETTING PLAYERS");
    if (checkUserExist(playerID)) {
      if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
        var roomCode = connectedUsers.get(playerID).getCurrentRoom();
        var room = rooms.get(roomCode);
        var game = room.getGame();
        if (game.getProgress()) {
          if (game.getUsers().includes(connectedUsers.get(playerID))) {
            var socketPlayer = connectedUsers.get(playerID).getPlayer(roomCode);
            var socketRole = connectedUsers
              .get(playerID)
              .getPlayer(roomCode)
              .getRole();
            var isDead = false;

            if (socketPlayer.getIsKilled() || socketPlayer.getIsLynched()) {
              isDead = true;
            }
            var emitTo = "";
            if (state.includes("first")) {
              emitTo = "setPlayersFirst";
            } else if (state.includes("clock")) {
              emitTo = "setPlayersClock";
            } else if (state.includes("refresh")) {
              emitTo = "setPlayersRefresh";
            }

            socket.emit(
              emitTo,
              generateValidPlayerList(playerID),
              game.getCycle(),
              game.getPhase(),
              isDead,
              socketRole,
              proxyIdenfication.get(playerID)
            );
          }
        }
      }
    }
  }

  socket.on("checkIfDead", (playerID, state) => {
    if (checkUserExist(playerID)) {
      if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
        var roomCode = connectedUsers.get(playerID).getCurrentRoom();
        var room = rooms.get(roomCode);
        var game = room.getGame();
        if (game.getProgress()) {
          if (game.getUsers().includes(connectedUsers.get(playerID))) {
            var player = connectedUsers.get(playerID).getPlayer(roomCode);
            var isDead = false;
            if (player.getIsKilled() || player.getIsLynched()) {
              isDead = true;
            } else if (!player.getIsKilled() && !player.getIsLynched()) {
              isDead = false;
            }

            var emitTo = "";
            if (state.includes("refresh")) {
              emitTo = "isPlayerDeadRefresh";
            } else if (state.includes("clock")) {
              emitTo = "isPlayerDeadClock";
            }
            socket.emit(emitTo, game.getPhase(), isDead);
          }
        }
      }
    }
  });

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
              connectedUsers.get(playerID).getPlayer(roomCode).getMessages(),
              game.getCycle()
            );
          }
        }
      }
    }
  });

  function messageHandlerForPhases(playerID, room, roomCode, game) {
    var lineSeperator = "--------------------------------";
    if (game.getEmitPhaseOnce()) {
      if (game.getPhase().includes("actions")) {
        // sendMessage(
        //   playerID,
        //   room,
        //   roomCode,
        //   game,
        //   "all",
        //   lineSeperator,
        //   "lineSeperator"
        // );
        sendMessage(
          playerID,
          room,
          roomCode,
          game,
          "all",
          "It's time to act. The action phase has begun",
          "extra"
        );
      }
      if (game.getPhase().includes("message")) {
        sendMessage(
          playerID,
          room,
          roomCode,
          game,
          "all",
          lineSeperator,
          "lineSeperator"
        );
        sendMessage(
          playerID,
          room,
          roomCode,
          game,
          "all",
          "The sun begins to rise",
          "bold"
        );
      }
      if (game.getPhase().includes("recap")) {
        // sendMessage(
        //   playerID,
        //   room,
        //   roomCode,
        //   game,
        //   "all",
        //   lineSeperator,
        //   "lineSeperator"
        // );
        sendMessage(
          playerID,
          room,
          roomCode,
          game,
          "all",
          "This happened last night",
          "extra"
        );
      }
      if (game.getPhase().includes("discussion")) {
        sendMessage(
          playerID,
          room,
          roomCode,
          game,
          "all",
          lineSeperator,
          "lineSeperator"
        );
        sendMessage(
          playerID,
          room,
          roomCode,
          game,
          "all",
          "Time for discussion!",
          "extra"
        );
      }
      if (game.getPhase().includes("voting")) {
        sendMessage(
          playerID,
          room,
          roomCode,
          game,
          "all",
          lineSeperator,
          "lineSeperator"
        );
        sendMessage(
          playerID,
          room,
          roomCode,
          game,
          "all",
          "It's time to cast your votes",
          "extra"
        );
      }
      game.setEmitPhaseOnce(false);
    }
  }

  function messageHandlerForCycles(playerID, room, roomCode, game) {
    if (game.getEmitCycleOnce()) {
      if (game.getCycle().includes("Night")) {
        sendMessage(
          playerID,
          room,
          roomCode,
          game,
          "all",
          game.getCycle() + " " + game.getCycleCount(),
          "timestamp"
        );
        sendMessage(
          playerID,
          room,
          roomCode,
          game,
          "all",
          "The moon glows. The night has begun",
          "bold"
        );
      } else if (game.getCycle().includes("Day")) {
        sendMessage(
          playerID,
          room,
          roomCode,
          game,
          "all",
          game.getCycle() + " " + game.getCycleCount(),
          "timestamp"
        );
        sendMessage(
          playerID,
          room,
          roomCode,
          game,
          "all",
          "The day has begun",
          "bold"
        );
      }
    }
    game.setEmitCycleOnce(false);
  }

  // be able to send toAll, to player, and to target

  function sendMessage(
    playerID,
    room,
    roomCode,
    game,
    sendTo = "",
    message = "",
    type = ""
  ) {
    if (sendTo == "all") {
      for (var i = 0; i < game.getUsers().length; i++) {
        if (game.getUsers()[i].getInGame()) {
          game.getUsers()[i].getPlayer(roomCode).addMessage({ message, type });
        }
      }
      io.to(roomCode).emit("recieveMessage", message, type, game.getCycle());
    } else if (sendTo == "evil") {
      for (var i = 0; i < game.getEvil().length; i++) {
        if (game.getEvil()[i].getInGame()) {
          game.getEvil()[i].getPlayer(roomCode).addMessage({ message, type });
        }
      }
      io.to(game.getEvilRoom()).emit(
        "recieveMessage",
        message,
        type,
        game.getCycle()
      );
    } else if (sendTo == "socket") {
      if (connectedUsers.get(playerID).getInGame()) {
        connectedUsers
          .get(playerID)
          .getPlayer(roomCode)
          .addMessage({ message, type });
      }
      io.to(playerID).emit("recieveMessage", message, type, game.getCycle());
    } else if (sendTo == "target") {
      if (connectedUsers.get(playerID).getInGame()) {
        connectedUsers
          .get(playerID)
          .getPlayer(roomCode)
          .addMessage({ message, type });
      }
      io.to(playerID).emit("recieveMessage", message, type, game.getCycle());
    }
  }

  function resetPhaseConditions(game) {
    game.setNightMessagesOnce(0);
    game.setRecapOnce(0);
    game.setDayMessagesOnce(0);
  }

  socket.on("setActionsOnPhase", (playerID, state) => {
    console.log("Setting actions on phase");
    setActionsOnPhase(playerID, state);
  });

  function setActionsOnPhase(playerID, state) {
    if (checkUserExist(playerID)) {
      if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
        var roomCode = connectedUsers.get(playerID).getCurrentRoom();
        var room = rooms.get(roomCode);
        var game = room.getGame();
        if (game.getProgress()) {
          if (game.getUsers().includes(connectedUsers.get(playerID))) {
            var emitTo = "";
            if (state.includes("first")) {
              emitTo = "removeActionsOnPhaseFirst";
              socket.emit(emitTo, game.getPhase());
            } else if (state.includes("clock")) {
              emitTo = "removeActionsOnPhaseClock";
              io.to(roomCode).emit(emitTo, game.getPhase());
            } else if (state.includes("refresh")) {
              emitTo = "removeActionsOnPhaseRefresh";
              socket.emit(emitTo, game.getPhase());
            }
          }
        }
      }
    }
  }

  // TODO: need to do this
  // ! FIX THIS
  function gameHandler(playerID) {
    // ? PROXY HANDLING
    var roomCode = connectedUsers.get(playerID).getCurrentRoom();
    var room = rooms.get(roomCode);
    var game = room.getGame();
    if (game.getCycle() == "Night") {
      if (game.getPhase() == "nightMessages") {
        if (game.getNightMessagesOnce() == 0) {
          console.log("EXECUTING NIGHT ACTIONS");
          executeNightActions(playerID, room, roomCode, game);
          voteHandlerEvil(playerID, room, roomCode, game);
          io.to(roomCode).emit("updateSetPlayers");
          game.setNightMessagesOnce(1);
          resetAllActions(playerID, room, roomCode, game);
        }
      }
    } else if (game.getCycle() == "Day") {
      if (game.getPhase() == "dayMessages") {
        if (game.getDayMessagesOnce() == 0) {
          console.log("VOTE GLOBAL");
          voteHandlerGlobal(playerID, room, roomCode, game);
          console.log("DEATH HANDLER VOTE");
          deathHandler(playerID, room, roomCode, game);
          io.to(roomCode).emit("updateSetPlayers");
          checkForWin(playerID, room, roomCode, game);
          game.setDayMessagesOnce(1);
          resetAllActions(playerID, room, roomCode, game);
        }
      } else if (game.getPhase() == "discussion") {
        resetAllActions(playerID, room, roomCode, game);
      } else if (game.getPhase() == "recap") {
        if (game.getRecapOnce() == 0) {
          console.log("DEATH HANDLER RECAP");
          deathHandler(playerID, room, roomCode, game);
          io.to(roomCode).emit("updateSetPlayers");
          checkForWin(playerID, room, roomCode, game);
          game.setRecapOnce(1);
          resetAllActions(playerID, room, roomCode, game);
        }
      }
    }
  }

  function checkForWin(playerID, room, roomCode, game) {
    // This is after voteHandlerGlobal and deathHandler (dayMessages)
    // This is also after deatHandler (recap)

    // Iterate over alive players, check which ones are left
    var goodCount = 0;
    var evilCount = 0;
    var neutralCount = 0;
    var aliveCount = game.getAlive().length;
    var theLawyer = null;
    var theSerialKiller = null;
    var theExecutioner = null;
    var theJester = null;
    var secondJester = null;

    console.log("Checking for win");
    if (game.getNoDeaths() < maxNoDeaths) {
      for (var i = 0; i < game.getUsers().length; i++) {
        let theUser = game.getUsers()[i];
        let thePlayer = theUser.getPlayer(roomCode);
        let theRole = thePlayer.getRole();

        // Assign users to their respective roles
        // They could be dead or alive
        if (theRole.type.includes("jester")) {
          if (thePlayer.getOldRole() == null) {
            theJester = theUser;
          } else if (thePlayer.getOldRole() == "executioner") {
            secondJester = theUser;
          }
        } else if (theRole.type.includes("executioner")) {
          if (thePlayer.getOldRole() == null) {
            theExecutioner = theUser;
          }
        } else if (theRole.type.includes("serial killer")) {
          theSerialKiller = theUser;
        } else if (theRole.type.includes("lawyer")) {
          theLawyer = theUser;
        }

        // Only counts if the person is alive
        if (
          thePlayer.getIsKilled() == false &&
          thePlayer.getIsLynched() == false
        ) {
          if (theRole.team.includes("good")) {
            goodCount++;
          } else if (theRole.team.includes("evil")) {
            evilCount++;
          } else if (theRole.team.includes("neutral")) {
            neutralCount++;
          }
        }
      }

      console.log("good", goodCount);
      console.log("evil", evilCount);
      console.log("neutral", neutralCount);

      // Handle only 2 players alive?

      if (!game.getExecutionerWin() && !game.getJesterWin()) {
        if (evilCount == 0 && neutralCount == 0 && goodCount == 0) {
          game.setDraw(true);
        } else if (game.getUsers().length == 0) {
          // Return immediately (this means everybody has LEFT, one by one)
          // game.setDone(true)
          endGameClear(game, roomCode);
        } else if (evilCount == 0 && neutralCount == 0 && goodCount > 0) {
          // GOOD TEAM WINS
          game.setGoodWin(true);
          for (var i = 0; i < game.getUsers().length; i++) {
            let user = game.getUsers()[i];
            if (user.getPlayer(roomCode).getRole().team.includes("good")) {
              var winnerID = user.getPlayerID();
              var winnerName = user.getPlayer(roomCode).getPlayerName();
              var winner = { winnerID, winnerName };
              game.addWinner(winner);
            }
          }
        } else if (
          goodCount == 0 &&
          (neutralCount == 0 || neutralCount == 1) &&
          evilCount > 0
        ) {
          // EVIL TEAM WINS
          if (neutralCount == 0) {
            game.setEvilWin(true);
            for (var i = 0; i < game.getUsers().length; i++) {
              let user = game.getUsers()[i];
              let player = user.getPlayer(roomCode);
              let role = player.getRole();

              if (role.team.includes("evil")) {
                var winnerID = user.getPlayerID();
                var winnerName = player.getPlayerName();
                var winner = { winnerID, winnerName };
                game.addWinner(winner);
              }
              if (theLawyer !== null) {
                if (
                  theLawyer
                    .getPlayer(roomCode)
                    .getRole()
                    .client.getPlayer(roomCode)
                    .getRole()
                    .team.includes("evil")
                ) {
                  game.setLawyerWin(true);
                }
              }
            }
          } else if (neutralCount == 1) {
            if (theLawyer !== null) {
              if (
                theLawyer
                  .getPlayer(roomCode)
                  .getRole()
                  .client.getPlayer(roomCode)
                  .getRole()
                  .team.includes("evil")
              ) {
                game.setEvilWin(true);
                game.setLawyerWin(true);
                var winnerID = theLawyer.getPlayerID();
                var winnerName = theLawyer.getPlayer(roomCode).getPlayerName();
                var winner = { winnerID, winnerName };
                game.addWinner(winner);
              }
            }
            if (game.getEvilWin()) {
              for (var i = 0; i < game.getUsers().length; i++) {
                let user = game.getUsers()[i];
                let player = user.getPlayer(roomCode);
                let role = player.getRole();

                if (role.team.includes("evil")) {
                  var winnerID = user.getPlayerID();
                  var winnerName = player.getPlayerName();
                  var winner = { winnerID, winnerName };
                  game.addWinner(winner);
                }
              }
            }
          }
        } else if (
          evilCount == 0 &&
          goodCount == 0 &&
          (neutralCount == 1 || neutralCount == 2)
        ) {
          // SERIAL KILLER WINS
          if (neutralCount == 1) {
            if (
              !theSerialKiller.getPlayer(roomCode).getIsKilled() &&
              !theSerialKiller.getPlayer(roomCode).getIsLynched()
            ) {
              if (theSerialKiller !== null) {
                var serialKillerMessages = [
                  "DIE, DIE, DIE!",
                  "*diabolical screech* WHO'S NEXT?!",
                  "Show me...your FLESH!",
                ];
                var rand = random(0, serialKillerMessages.length - 1);
                console.log(serialKillerMessages[rand]);
                sendMessage(
                  playerID,
                  room,
                  roomCode,
                  game,
                  "all",
                  serialKillerMessages[rand],
                  "info"
                );
                game.setSerialKillerWin(true);
                var winnerID = theSerialKiller.getPlayerID();
                var winnerName = theSerialKiller
                  .getPlayer(roomCode)
                  .getPlayerName();
                var winner = { winnerID, winnerName };
                game.addWinner(winner);

                if (theLawyer !== null) {
                  if (
                    theLawyer.getPlayer(roomCode).getRole().client ==
                    theSerialKiller
                  ) {
                    game.setLawyerWin(true);
                    var winnerID = theLawyer.getPlayerID();
                    var winnerName = theLawyer
                      .getPlayer(roomCode)
                      .getPlayerName();
                    var winner = { winnerID, winnerName };
                    game.addWinner(winner);
                    // LAYWER ALSO WINS
                  }
                }
              }
            } else if (
              !theLawyer.getPlayer(roomCode).getIsKilled() &&
              !theLawyer.getPlayer(roomCode).getIsLynched()
            ) {
              if (theLawyer !== null) {
                // Lawyer does not win, since their target is dead, so just a neutral win.
                game.setNeutralWin(true);
                var winnerID = theLawyer.getPlayerID();
                var winnerName = theLawyer.getPlayer(roomCode).getPlayerName();
                var winner = { winnerID, winnerName };
                game.addWinner(winner);
              }
            } else if (
              !theExecutioner.getPlayer(roomCode).getIsKilled() &&
              !theExecutioner.getPlayer(roomCode).getIsLynched()
            ) {
              if (theExecutioner !== null) {
                game.setNeutralWin(true);
                var winnerID = theExecutioner.getPlayerID();
                var winnerName = theExecutioner
                  .getPlayer(roomCode)
                  .getPlayerName();
                var winner = { winnerID, winnerName };
                game.addWinner(winner);

                if (theLawyer !== null) {
                  if (
                    theLawyer.getPlayer(roomCode).getRole().client ==
                    theExecutioner
                  ) {
                    game.setLawyerWin(true);
                    var winnerID = theLawyer.getPlayerID();
                    var winnerName = theLawyer
                      .getPlayer(roomCode)
                      .getPlayerName();
                    var winner = { winnerID, winnerName };
                    game.addWinner(winner);
                    // LAYWER ALSO WINS
                  }
                }
              }
            } else if (
              (!theJester.getPlayer(roomCode).getIsKilled() &&
                !theJester.getPlayer(roomCode).getIsLynched()) ||
              (!secondJester.getPlayer(roomCode).getIsKilled() &&
                !secondJester.getPlayer(roomCode).getIsLynched())
            ) {
              if (theJester !== null || secondJester !== null) {
                game.setNeutralWin(true);

                if (theJester !== null && secondJester == null) {
                  var winnerID = theJester.getPlayerID();
                  var winnerName = theJester
                    .getPlayer(roomCode)
                    .getPlayerName();
                  var winner = { winnerID, winnerName };
                  game.addWinner(winner);
                  if (theLawyer !== null) {
                    if (
                      theLawyer.getPlayer(roomCode).getRole().client ==
                      theJester
                    ) {
                      game.setLawyerWin(true);
                      var winnerID = theLawyer.getPlayerID();
                      var winnerName = theLawyer
                        .getPlayer(roomCode)
                        .getPlayerName();
                      var winner = { winnerID, winnerName };
                      game.addWinner(winner);
                      // LAYWER ALSO WINS
                    }
                  }
                } else if (theJester == null && secondJester !== null) {
                  var winnerID = secondJester.getPlayerID();
                  var winnerName = secondJester
                    .getPlayer(roomCode)
                    .getPlayerName();
                  var winner = { winnerID, winnerName };
                  game.addWinner(winner);
                  if (theLawyer !== null) {
                    if (
                      theLawyer.getPlayer(roomCode).getRole().client ==
                      secondJester
                    ) {
                      game.setLawyerWin(true);
                      var winnerID = theLawyer.getPlayerID();
                      var winnerName = theLawyer
                        .getPlayer(roomCode)
                        .getPlayerName();
                      var winner = { winnerID, winnerName };
                      game.addWinner(winner);
                      // LAYWER ALSO WINS
                    }
                  }
                }
              }
            }
          } else if (neutralCount == 2) {
            if (
              !theSerialKiller.getPlayer(roomCode).getIsKilled() &&
              !theSerialKiller.getPlayer(roomCode).getIsLynched()
            ) {
              if (theSerialKiller !== null) {
                if (theLawyer !== null) {
                  if (
                    theLawyer.getPlayer(roomCode).getRole().client ==
                    theSerialKiller
                  ) {
                    game.setLawyerWin(true);
                    game.setSerialKillerWin(true);
                    var serialKillerMessages = [
                      "DIE, DIE, DIE!",
                      "*diabolical screech* WHO'S NEXT?!",
                      "Show me...your FLESH!",
                    ];
                    var rand = random(0, serialKillerMessages.length - 1);
                    sendMessage(
                      playerID,
                      room,
                      roomCode,
                      game,
                      "all",
                      serialKillerMessages[rand],
                      "info"
                    );
                    var winnerID = theSerialKiller.getPlayerID();
                    var winnerName = theSerialKiller
                      .getPlayer(roomCode)
                      .getPlayerName();
                    var winner = { winnerID, winnerName };
                    game.addWinner(winner);
                    var winnerID = theLawyer.getPlayerID();
                    var winnerName = theLawyer
                      .getPlayer(roomCode)
                      .getPlayerName();
                    var winner = { winnerID, winnerName };
                    game.addWinner(winner);
                    // LAYWER ALSO WINS
                  }
                }
              }
            } else if (
              !theExecutioner.getPlayer(roomCode).getIsKilled() &&
              !theExecutioner.getPlayer(roomCode).getIsLynched()
            ) {
              if (theExecutioner !== null) {
                if (theLawyer !== null) {
                  if (
                    theLawyer.getPlayer(roomCode).getRole().client ==
                    theExecutioner
                  ) {
                    game.setLawyerWin(true);
                    game.setNeutralWin(true);
                    var winnerID = theExecutioner.getPlayerID();
                    var winnerName = theExecutioner
                      .getPlayer(roomCode)
                      .getPlayerName();
                    var winner = { winnerID, winnerName };
                    game.addWinner(winner);
                    var winnerID = theLawyer.getPlayerID();
                    var winnerName = theLawyer
                      .getPlayer(roomCode)
                      .getPlayerName();
                    var winner = { winnerID, winnerName };
                    game.addWinner(winner);
                    // LAYWER ALSO WINS
                  }
                }
              }
            } else if (
              (!theJester.getPlayer(roomCode).getIsKilled() &&
                !theJester.getPlayer(roomCode).getIsLynched()) ||
              (!secondJester.getPlayer(roomCode).getIsKilled() &&
                !secondJester.getPlayer(roomCode).getIsLynched())
            ) {
              if (theJester !== null && secondJester == null) {
                if (theLawyer !== null) {
                  if (theJester !== null && secondJester == null) {
                    if (
                      theLawyer.getPlayer(roomCode).getRole().client ==
                      theJester
                    ) {
                      game.setLawyerWin(true);
                      game.setNeutralWin(true);
                      var winnerID = theJester.getPlayerID();
                      var winnerName = theJester
                        .getPlayer(roomCode)
                        .getPlayerName();
                      var winner = { winnerID, winnerName };
                      game.addWinner(winner);
                      var winnerID = theLawyer.getPlayerID();
                      var winnerName = theLawyer
                        .getPlayer(roomCode)
                        .getPlayerName();
                      var winner = { winnerID, winnerName };
                      game.addWinner(winner);
                      // LAYWER ALSO WINS
                    }
                  } else if (theJester == null && secondJester !== null) {
                    if (
                      theLawyer.getPlayer(roomCode).getRole().client ==
                      secondJester
                    ) {
                      game.setLawyerWin(true);
                      game.setNeutralWin(true);
                      var winnerID = secondJester.getPlayerID();
                      var winnerName = secondJester
                        .getPlayer(roomCode)
                        .getPlayerName();
                      var winner = { winnerID, winnerName };
                      game.addWinner(winner);
                      var winnerID = theLawyer.getPlayerID();
                      var winnerName = theLawyer
                        .getPlayer(roomCode)
                        .getPlayerName();
                      var winner = { winnerID, winnerName };
                      game.addWinner(winner);
                      // LAYWER ALSO WINS
                    }
                  }
                }
              }
            }
          }
        }
      } else if (game.getJesterWin() && !game.getExecutionerWin()) {
        var jesterMessages = [
          "*maniacal laughter* YOU FOOLS!",
          "HAhAHA! Who's the fool NOW?!",
          "the joke's on YOU! ;)",
        ];
        var rand = random(0, jesterMessages.length - 1);
        console.log(jesterMessages[rand]);
        sendMessage(
          playerID,
          room,
          roomCode,
          game,
          "all",
          jesterMessages[rand],
          "info"
        );
      } else if (!game.getJesterWin() && game.getExecutionerWin()) {
        var executionerMessages = [
          "Just doing what has to been done",
          "The blood they spill is no comparison to the deeds they have done",
          "*wipes hands* Tango down!",
        ];
        var rand = random(0, executionerMessages.length - 1);
        console.log(executionerMessages[rand]);
        sendMessage(
          playerID,
          room,
          roomCode,
          game,
          "all",
          executionerMessages[rand],
          "info"
        );
      }
    }

    var winState = Object.values(checkWinState(game, roomCode))
    
    if (winState[0] == true)
    setTimeout(
      endGame,
      7500,
      game,
      roomCode,
      winState[0],
      winState[1],
      winState[2],
      winState[3]
    );
  }

  function checkWinState(game, roomCode) {
    var win = false;
    var winType = "";
    var lawyerWin = false;
    // Which message to show
    if (game.getGoodWin()) {
      winType = "good";
      win = true;
      lawyerWin = false;
    } else if (game.getEvilWin()) {
      winType = "evil";
      win = true;
      if (game.getLawyerWin()) {
        lawyerWin = true;
      }
    } else if (game.getNeutralWin()) {
      winType = "neutral";
      win = true;
      if (game.getLawyerWin()) {
        lawyerWin = true;
      }
    } else if (game.getJesterWin()) {
      winType = "jester";
      win = true;
      if (game.getLawyerWin()) {
        lawyerWin = true;
      }
    } else if (game.getExecutionerWin()) {
      winType = "executioner";
      win = true;
      if (game.getLawyerWin()) {
        lawyerWin = true;
      }
    } else if (game.getSerialKillerWin()) {
      winType = "serial killer";
      win = true;
      if (game.getLawyerWin()) {
        lawyerWin = true;
      }
    } else if (game.getDraw()) {
      winType = "draw";
      win = true;
      lawyerWin = false;
    } else if (game.getNoDeaths() >= maxNoDeaths) {
      winType = "timeout";
      win = true;
      lawyerWin = false;
    } else {
      winType = "";
      win = false;
      lawyerWin = false;
    }

    console.log("good", game.getGoodWin());
    console.log("evil", game.getEvilWin());
    console.log("neutral", game.getNeutralWin());
    console.log("jester", game.getJesterWin());
    console.log("executioner", game.getExecutionerWin());
    console.log("serial killer", game.getSerialKillerWin());
    console.log("lawyer", game.getLawyerWin());
    console.log("draw", game.getDraw());
    console.log("winners", game.getWinners());
    console.log("WIN " + win);
    console.log("winType", winType);

    // IMPORTANT TO JUST SEND WIN TO JUST THAT USER, SINCE THERE CAN BE 2 JESTERS
    // ALSO HANDLE CHECK PREVIOUS

    var toSend = [];
    if (win) {
      for (var i = 0; i < game.getWinners().length; i++) {
        var theID = proxyIdenfication.get(game.getWinners()[i].winnerID);
        var theName = game.getWinners()[i].winnerName;
        var winner = { theID, theName };
        toSend.push(winner);
      }
    }

    var winState = {win, winType, lawyerWin, toSend}
    return winState;
  }

  socket.on("leaveGame", (playerID) => {
    if (checkUserExist(playerID)) {
      if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
        var roomCode = connectedUsers.get(playerID).getCurrentRoom();
        var room = rooms.get(roomCode);
        var game = room.getGame();
        var user = connectedUsers.get(playerID);
        if (game.getProgress()) {
          if (game.getUsers().includes(connectedUsers.get(playerID))) {
            if (room.getHost() == playerID) {
              // game.setDone(true);
              endGameClear(game, roomCode);
            } else {
              forceKill(playerID, roomCode, game);
              // reset messages, readyGame, readyLobby, and inGame;
              user.reset();
              if (user.getPrevious().includes(room)) {
                user.removePrevious(room);
              }
              io.to(playerID).emit("beginClearEvilRoom", game.getEvilRoom());
              io.to(roomCode).emit("updateSetPlayers");
              io.to(playerID).emit("returnToLobby");
            }
          }
        }
      }
    }
  });

  socket.on("endGameRefresh", (playerID) => {
    if (checkUserExist(playerID)) {
      if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
        var roomCode = connectedUsers.get(playerID).getCurrentRoom();
        var room = rooms.get(roomCode);
        var game = room.getGame();
        if (game.getProgress()) {
          if (game.getUsers().includes(connectedUsers.get(playerID))) {
            var winState = Object.values(checkWinState(game, roomCode))

            if (winState[0] == true) {
              io.to(roomCode).emit("endGameRefreshed", winState[0], winState[1], winState[2], winState[3]);
            }
          }
        }
        
      }
    }
  })

  function endGame(game, roomCode, win, winType, lawyerWin, toSend) {
    io.to(roomCode).emit("endGame", win, winType, lawyerWin, toSend);
    // CLEAR INTERVAL (game.setDone(true))
    game.setDone(true);
    console.log(game.getDone());
    // Send players back to lobby after 10 seconds
    setTimeout(endGameClear, 10000, game, roomCode);
  }

  function endGameClear(game, roomCode) {
    console.log("Clearing game for", roomCode);
    // Reset players, reset game
    for (var i = 0; i < game.getUsers().length; i++) {
      let user = game.getUsers()[i];
      if (user.getCurrentRoom() == roomCode) {
        user.reset();
        user.getPlayer(roomCode).setReadyGame(false);
        user.getPlayer(roomCode).setDisconnected(true);
      }
      if (user.getPrevious().includes(roomCode)) {
        user.removePrevious(roomCode);
      }
    }
    io.to(roomCode).emit("returnToLobby");
    game.reset();
    game.setDone(true);
    clearClock(game);
  }

  socket.on("requestProxy", (playerID, state) => {
    if (checkUserExist(playerID)) {
      if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
        var roomCode = connectedUsers.get(playerID).getCurrentRoom();
        var room = rooms.get(roomCode);
        var game = room.getGame();

        if (state.includes("app")) {
          if (game.getProgress()) {
            if (game.getUsers().includes(connectedUsers.get(playerID))) {
              socket.emit("fetchedProxyApp", proxyIdenfication.get(playerID));
            }
          }
        } else if (state.includes("lobby")) {
          socket.emit("fetchedProxyLobby", proxyIdenfication.get(playerID));
        }
      }
    }
  });

  function getKeyFromValue(map, searchValue) {
    for (let [key, value] of map.entries()) {
      if (value == searchValue) {
        return key;
      }
    }
  }

  function evilVote(playerID, room, roomCode, game, target) {
    var targetPlayer = connectedUsers.get(target).getPlayer(roomCode);
    if (!targetPlayer.isProtected) {
      targetPlayer.setIsKilled(true);
      targetPlayer.addKiller("Evil");
      // send message to evil people that it worked
      sendMessage(
        playerID,
        room,
        roomCode,
        game,
        "evil",
        `You have decided to murder ${targetPlayer.getPlayerName()} (${
          targetPlayer.nightVotes
        })`,
        "confirm"
      );
      sendMessage(
        playerID,
        room,
        roomCode,
        game,
        "evil",
        `${targetPlayer.getPlayerName()} has been murdered - excellent >:)`,
        "confirm"
      );
      sendMessage(
        target,
        room,
        roomCode,
        game,
        "target",
        `You died! You were killed by members of the Evil team`,
        "alert"
      );
    } else {
      sendMessage(
        playerID,
        room,
        roomCode,
        game,
        "evil",
        `No one was killed tonight, someone protected ${targetPlayer.getPlayerName()}`,
        "info"
      );
      sendMessage(
        target,
        room,
        roomCode,
        game,
        "target",
        `Someone tried to kill you, but you were protected`,
        "info"
      );
      // send message to evil people that it  DID not work
    }
  }

  function voteHandlerEvil(playerID, room, roomCode, game) {
    if (game.getCycle() == "Night") {
      var evilUsers = game.getEvil();

      var targets = new Map();
      for (var i = 0; i < evilUsers.length; i++) {
        if (game.getAlive().includes(evilUsers[i])) {
          if (evilUsers[i].getPlayer(roomCode).voteTarget !== null) {
            var theVoteTarget = getKeyFromValue(
              proxyIdenfication,
              evilUsers[i].getPlayer(roomCode).voteTarget
            );
            var voteTargetPlayer = connectedUsers
              .get(theVoteTarget)
              .getPlayer(roomCode);
            if (
              !game.getCemetery().includes(connectedUsers.get(theVoteTarget))
            ) {
              if (targets.has(theVoteTarget)) {
                targets.set(
                  theVoteTarget,
                  targets.get(theVoteTarget) +
                    evilUsers[i].getPlayer(roomCode).getRole().killVoteCount
                );
              } else if (!targets.has(theVoteTarget)) {
                targets.set(
                  theVoteTarget,
                  evilUsers[i].getPlayer(roomCode).getRole().killVoteCount
                );
              }
            }
          }
        }
      }
      var targetCount = Array.from(targets.values());

      var highestVoteCount = 0;
      var theHighestVote = undefined;
      var seenHighVote = [];

      for (var i = 0; i < targetCount.length; i++) {
        if (targetCount[i] > highestVoteCount) {
          if (!seenHighVote.includes(targetCount[i])) {
            highestVoteCount = targetCount[i];
            theHighestVote = i;
            seenHighVote.push(targetCount[i]);
          }
        } else if (targetCount[i] == highestVoteCount) {
          highestVoteCount = 0;
          theHighestVote = undefined;
        }
      }

      if (Math.max(...targetCount) > 0) {
        if (highestVoteCount !== 0 && theHighestVote !== undefined) {
          var mostVoted = Array.from(targets.keys())[theHighestVote];
          evilVote(playerID, room, roomCode, game, mostVoted);
        } else {
          sendMessage(
            playerID,
            room,
            roomCode,
            game,
            "evil",
            "The vote was tied, no blood gets spilled tonight",
            "info"
          );
        }
      } else {
        sendMessage(
          playerID,
          room,
          roomCode,
          game,
          "evil",
          `No one was voted to get killed`,
          "info"
        );
      }
    }
  }

  function checkIfExecutionerAlive(playerID, room, roomCode, game) {
    for (var i = 0; i < game.getAlive().length; i++) {
      if (
        game
          .getAlive()
          [i].getPlayer(roomCode)
          .getRole()
          .type.includes("executioner")
      ) {
        if (
          game.getAlive()[i].getPlayer(roomCode).getIsKilled() == false &&
          game.getAlive()[i].getPlayer(roomCode).getIsLynched() == false
        ) {
          var executioner = game.getAlive()[i];
          var isTrue = true;
          return { isTrue, executioner };
        }
      }
    }
    var executioner = null;
    var isTrue = false;
    return { isTrue, executioner };
  }

  function checkIfLawyerAlive(playerID, room, roomCode, game) {
    for (var i = 0; i < game.getAlive().length; i++) {
      var player = game.getAlive()[i].getPlayer(roomCode);
      if (player.getRole().type.includes("lawyer")) {
        if (player.getIsKilled() == false && player.getIsLynched() == false) {
          var lawyer = game.getAlive()[i];
          var isTrue = true;
          return { isTrue, lawyer };
        }
      }
    }
    var lawyer = null;
    var isTrue = false;
    return { isTrue, lawyer };
  }

  function globalVote(playerID, room, roomCode, game, target) {
    var targetUser = connectedUsers.get(target);
    var targetPlayer = targetUser.getPlayer(roomCode);
    targetPlayer.setIsLynched(true);

    // SEND LYNCHED MESSAGE
    sendMessage(
      playerID,
      room,
      roomCode,
      game,
      "all",
      `The town has voted to lynch ${targetPlayer.getPlayerName()}`,
      "info"
    );
    sendMessage(
      target,
      room,
      roomCode,
      game,
      "target",
      `You died! You were lynched by members of the town`,
      "alert"
    );
    sendMessage(
      playerID,
      room,
      roomCode,
      game,
      "all",
      `${targetPlayer.getPlayerName()} has been lynched. Justice!`,
      "info"
    );

    var executionerObject = Object.values(
      checkIfExecutionerAlive(playerID, room, roomCode, game)
    );
    var lawyerObject = Object.values(
      checkIfLawyerAlive(playerID, room, roomCode, game)
    );
    if (targetPlayer.getRole().type.includes("jester")) {
      console.log("JESTER LYNCHED");

      // JESTER WINS
      game.setJesterWin(true);
      var winnerID = targetUser.getPlayerID();
      var winnerName = targetPlayer.getPlayerName();
      var winner = { winnerID, winnerName };
      game.addWinner(winner);
      if (lawyerObject[0] == true) {
        var lawyer = lawyerObject[1];

        // if the target (jester) gets lynched
        // if the lawyer's client is the jester
        if (lawyer.getPlayer(roomCode).getRole().client == targetUser) {
          // LAYWER WINS ALSO
          game.setLawyerWin(true);
          var winnerID = lawyer.getPlayerID();
          var winnerName = lawyer.getPlayer(roomCode).getPlayerName();
          var winner = { winnerID, winnerName };
          game.addWinner(winner);
        }
      }
    } else if (executionerObject[0] == true) {
      var executioner = executionerObject[1];
      console.log("EXECUTIONER EXISTS IN GAME");

      // if the executioner's target is lynched
      if (executioner.getPlayer(roomCode).getRole().target == targetUser) {
        console.log("EXECUTIONER TARGET LYNCHED");
        // executioner COMPLETES MISSION
        // EXECUTIONER WINS
        game.setExecutionerWin(true);
        var winnerID = executioner.getPlayerID();
        var winnerName = executioner.getPlayer(roomCode).getPlayerName();
        var winner = { winnerID, winnerName };
        game.addWinner(winner);
        if (lawyerObject[0] == true) {
          var lawyer = lawyerObject[1];

          // if the lawyer's client is the excecutioner
          if (lawyer.getPlayer(roomCode).getRole().client == executioner) {
            // LAYWER WINS ALSO
            game.setLawyerWin(true);
            var winnerID = lawyer.getPlayerID();
            var winnerName = lawyer.getPlayer(roomCode).getPlayerName();
            var winner = { winnerID, winnerName };
            game.addWinner(winner);
          }
        }
      }
    }
  }

  function voteHandlerGlobal(playerID, room, roomCode, game) {
    if (game.getCycle() == "Day") {
      var users = game.getAlive();
      console.log("COUNTING VOTES GLOBAL");

      var targets = new Map();
      for (var i = 0; i < users.length; i++) {
        if (users[i].getPlayer(roomCode).voteTarget !== null) {
          var theVoteTarget = getKeyFromValue(
            proxyIdenfication,
            users[i].getPlayer(roomCode).voteTarget
          );
          var voteTargetPlayer = connectedUsers
            .get(theVoteTarget)
            .getPlayer(roomCode);
          if (
            voteTargetPlayer.getIsKilled() == false &&
            voteTargetPlayer.getIsLynched() == false
          ) {
            console.log(users[i].getPlayer(roomCode).voteTarget);
            if (targets.has(theVoteTarget)) {
              targets.set(
                theVoteTarget,
                targets.get(theVoteTarget) +
                  users[i].getPlayer(roomCode).getRole().voteCount
              );
            } else if (!targets.has(theVoteTarget)) {
              targets.set(
                theVoteTarget,
                users[i].getPlayer(roomCode).getRole().voteCount
              );
            }
          }
        }
      }

      var aliveUsersCount = game.getAlive().length;
      var targetCount = Array.from(targets.values());
      var topVotes = [];
      var gotLynched = false;
      var voteTie = false;
      for (var i = 0; i < targetCount.length; i++) {
        var majority = aliveUsersCount / 2;

        if (targetCount[i] > majority) {
          var voteValue = targetCount[i];
          var mostVotedIndex = targetCount.indexOf(targetCount[i]);
          var mostVoted = Array.from(targets.keys())[mostVotedIndex];
          var majorityVote = { mostVoted, mostVotedIndex, voteValue };
          topVotes.push(majorityVote);
        }
      }

      if (topVotes.length == 1) {
        // NOT A TIE
        var voteOne = topVotes[0];
        console.log("majority: " + voteOne.voteValue);
        gotLynched = true;
        voteTie = false;
        globalVote(playerID, room, roomCode, game, voteOne.mostVoted);
      } else if (topVotes.length > 1) {
        // Handle if votes are ABOVE majority but SAME VALUE --> tie
        // Handle if votes are ABOVE majority but one has HIGHER value --> vote
        var highestVoteCount = 0;
        var theHighestVote = undefined;
        var seenHighVote = [];

        for (var i = 0; i < topVotes.length; i++) {
          if (topVotes[i].voteValue > highestVoteCount) {
            if (!seenHighVote.includes(topVotes[i].voteValue)) {
              highestVoteCount = topVotes[i].voteValue;
              theHighestVote = topVotes[i];
              seenHighVote.push(topVotes[i].voteValue);
            }
          } else if (topVotes[i].voteValue == highestVoteCount) {
            highestVoteCount = 0;
            theHighestVote = undefined;
          }
        }

        if (highestVoteCount == 0 && theHighestVote == undefined) {
          gotLynched = false;
          voteTie = true;
          // TIE
          console.log("TIE between", topVotes);
        } else if (highestVoteCount !== 0 && theHighestVote !== undefined) {
          gotLynched = true;
          voteTie = false;
          // VOTE
          console.log("VOTE between majority votes", topVotes);
          globalVote(playerID, room, roomCode, game, theHighestVote.mostVoted);
        }
      }

      if (!gotLynched && !voteTie) {
        sendMessage(
          playerID,
          room,
          roomCode,
          game,
          "all",
          `There was no majority to lynch anyone`,
          "info"
        );
        sendMessage(
          playerID,
          room,
          roomCode,
          game,
          "all",
          `No one was lynched - hope it was the right decision`,
          "info"
        );
      } else if (!gotLynched && voteTie) {
        sendMessage(
          playerID,
          room,
          roomCode,
          game,
          "all",
          `The votes have been tied!`,
          "info"
        );
        sendMessage(
          playerID,
          room,
          roomCode,
          game,
          "all",
          `No one was lynched - hope it was the right decision`,
          "info"
        );
      }
    }
  }

  function mayorReveal(playerID, room, roomCode, game) {
    if (checkUserExist(playerID)) {
      if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
        var roomCode = connectedUsers.get(playerID).getCurrentRoom();
        var room = rooms.get(roomCode);
        var game = room.getGame();
        var user = connectedUsers.get(playerID);
        var player = user.getPlayer(roomCode);
        var role = player.getRole();
        if (game.getProgress()) {
          if (game.getUsers().includes(connectedUsers.get(playerID))) {
            if (role.type.includes("mayor")) {
              role.voteCount = 3;
              role.revealed = true;
              sendMessage(
                playerID,
                room,
                roomCode,
                game,
                "all",
                `${player.getPlayerName()} has revealed themselves as the Mayor. Their vote now counts as 3`,
                "bold"
              );
              io.to(roomCode).emit("updateSetPlayers");
            }
          }
        }
      }
    }
  }

  function executeNightActions(playerID, room, roomCode, game) {
    // Ability order:
    // Blocks
    // Disguising
    // Framing
    // Investigation
    // Protection
    // Killing (SK)

    var abilityOrder = [
      "trapper",
      "witch",
      "surgeon",
      "framer",
      "investigator",
      "doctor",
      "serial killer",
    ];
    for (var i = 0; i < abilityOrder.length; i++) {
      var index = game
        .getAlive()
        .map((user) => user.getPlayer(roomCode).role.type)
        .indexOf(abilityOrder[i]);

      if (index >= 0) {
        var user = game.getAlive()[index];
        var player = user.getPlayer(roomCode);
        var role = player.getRole();
        if (player.abilityTarget !== null) {
          var abilityTarget = connectedUsers.get(
            getKeyFromValue(proxyIdenfication, player.abilityTarget)
          );
          var abilityTargetPlayer = abilityTarget.getPlayer(roomCode);

          if (role.hasNightAbility) {
            if (role.type.includes("trapper") || role.type.includes("witch")) {
              // ? CANNOT BE BLOCKED BY EACH OTHER
              if (role.type.includes("trapper")) {
                // CAN BLOCK ANYONE
                abilityTargetPlayer.isBlocked = true;
                sendMessage(
                  user.playerID,
                  room,
                  roomCode,
                  game,
                  "socket",
                  `You trapped ${abilityTargetPlayer.getPlayerName()}`,
                  "confirm"
                );
                if (abilityTargetPlayer.getRole().type.includes("witch")) {
                  sendMessage(
                    abilityTarget.playerID,
                    room,
                    roomCode,
                    game,
                    "target",
                    `The Trapper tried to trap you - but you know a thing or two about trapping, so it doesn't affect you. Hehehe`,
                    "info"
                  );
                } else {
                  sendMessage(
                    abilityTarget.playerID,
                    room,
                    roomCode,
                    game,
                    "target",
                    `You have been trapped! Your night ability was blocked by the Trapper`,
                    "info"
                  );
                }
              } else if (role.type.includes("witch")) {
                if (!abilityTargetPlayer.getRole().team.includes("evil")) {
                  // CAN BLOCK EVERYONE EXCEPT EVIL
                  abilityTargetPlayer.isBlocked = true;
                  sendMessage(
                    user.playerID,
                    room,
                    roomCode,
                    game,
                    "socket",
                    `You cast a freeze spell on ${abilityTargetPlayer.getPlayerName()}`,
                    "confirm"
                  );
                  if (abilityTargetPlayer.getRole().type.includes("trapper")) {
                    sendMessage(
                      abilityTarget.playerID,
                      room,
                      roomCode,
                      game,
                      "target",
                      `The Witch tried to cast a freeze spell on you - but you're far too experienced with traps, so it doesn't affect you`,
                      "info"
                    );
                  } else {
                    sendMessage(
                      abilityTarget.playerID,
                      room,
                      roomCode,
                      game,
                      "target",
                      `You have been frozen! Your night ability was blocked by the Witch`,
                      "info"
                    );
                  }
                }
              }
            } else if (
              role.type.includes("surgeon") ||
              role.type.includes("framer")
            ) {
              if (!player.isBlocked) {
                if (role.type.includes("surgeon")) {
                  if (abilityTargetPlayer.getRole().team.includes("evil")) {
                    if (abilityTarget == user) {
                      if (user.getPlayer(roomCode).getRole().selfUsage > 0) {
                        user.getPlayer(roomCode).getRole().selfUsage -= 1;
                        // CAN DISGUISE EVIL TO LOOK GOOD
                        abilityTargetPlayer.fakeTeam = "good";
                        abilityTargetPlayer.isDisguised = true;
                        sendMessage(
                          user.playerID,
                          room,
                          roomCode,
                          game,
                          "socket",
                          `You disguised yourself. Self uses left: ${
                            user.getPlayer(roomCode).getRole().selfUsage
                          }`,
                          "confirm"
                        );
                      } else if (
                        user.getPlayer(roomCode).getRole().selfUsage == 0
                      ) {
                        // CAN DISGUISE EVIL TO LOOK GOOD
                        abilityTargetPlayer.fakeTeam = "good";
                        abilityTargetPlayer.isDisguised = true;
                        sendMessage(
                          user.playerID,
                          room,
                          roomCode,
                          game,
                          "socket",
                          `You don't have any self uses left. Self uses left: ${
                            user.getPlayer(roomCode).getRole().selfUsage
                          }`,
                          "confirm"
                        );
                      }
                    } else {
                      // CAN DISGUISE EVIL TO LOOK GOOD
                      abilityTargetPlayer.fakeTeam = "good";
                      abilityTargetPlayer.isDisguised = true;
                      sendMessage(
                        user.playerID,
                        room,
                        roomCode,
                        game,
                        "socket",
                        `You disguise ${abilityTargetPlayer.getPlayerName()}. They will appear good to the Investigator this night`,
                        "confirm"
                      );
                    }
                  }
                } else if (role.type.includes("framer")) {
                  if (!abilityTargetPlayer.getRole().team.includes("evil")) {
                    // CAN DISGUISE ANYBODY ELSE (NOT EVIL) TO LOOK EVIL
                    abilityTargetPlayer.fakeTeam = "evil";
                    abilityTargetPlayer.isDisguised = true;
                    sendMessage(
                      user.playerID,
                      room,
                      roomCode,
                      game,
                      "socket",
                      `You frame ${abilityTargetPlayer.getPlayerName()}. They will appear evil to the Investigator this night`,
                      "confirm"
                    );
                  }
                }
              }
            } else if (role.type.includes("investigator")) {
              if (!player.isBlocked) {
                // ACTION WORKED
                if (abilityTargetPlayer.isDisguised) {
                  // READ FROM FAKE TEAM
                  sendMessage(
                    user.playerID,
                    room,
                    roomCode,
                    game,
                    "socket",
                    `You investigate ${abilityTargetPlayer.getPlayerName()}. They are: ${
                      abilityTargetPlayer.fakeTeam
                    }`,
                    "confirm"
                  );
                } else {
                  // READ FROM role.team
                  // abilityTargetPlayer.getRole().team
                  sendMessage(
                    user.playerID,
                    room,
                    roomCode,
                    game,
                    "socket",
                    `You investigate ${abilityTargetPlayer.getPlayerName()}. They are: ${
                      abilityTargetPlayer.getRole().team
                    }`,
                    "confirm"
                  );
                }
              } else {
                // DIDNT WORK
                sendMessage(
                  user.playerID,
                  room,
                  roomCode,
                  game,
                  "socket",
                  `Your investigation didn't yield any results. Someone blocked you`,
                  "info"
                );
              }
            } else if (role.type.includes("doctor")) {
              if (!player.isBlocked) {
                if (abilityTarget == user) {
                  if (user.getPlayer(roomCode).getRole().selfUsage > 0) {
                    user.getPlayer(roomCode).getRole().selfUsage -= 1;
                    abilityTargetPlayer.isProtected = true;
                    sendMessage(
                      user.playerID,
                      room,
                      roomCode,
                      game,
                      "socket",
                      `You protected yourself. Self uses left: ${
                        user.getPlayer(roomCode).getRole().selfUsage
                      }`,
                      "confirm"
                    );
                  } else if (
                    user.getPlayer(roomCode).getRole().selfUsage == 0
                  ) {
                    sendMessage(
                      user.playerID,
                      room,
                      roomCode,
                      game,
                      "socket",
                      `You don't have any self uses left. Self uses left: ${
                        user.getPlayer(roomCode).getRole().selfUsage
                      }`,
                      "confirm"
                    );
                  }
                } else {
                  abilityTargetPlayer.isProtected = true;
                  sendMessage(
                    user.playerID,
                    room,
                    roomCode,
                    game,
                    "socket",
                    `You protected ${abilityTargetPlayer.getPlayerName()}. Your patient lives to see the day`,
                    "confirm"
                  );
                  sendMessage(
                    abilityTarget.playerID,
                    room,
                    roomCode,
                    game,
                    "target",
                    `You feel slightly stronger. You were protected by the Doctor`,
                    "info"
                  );
                }
              } else {
                // DIDNT WORK
                sendMessage(
                  user.playerID,
                  room,
                  roomCode,
                  game,
                  "socket",
                  `Your medical aid didn't work. Someone blocked you`,
                  "info"
                );
              }
            } else if (role.type.includes("serial killer")) {
              if (!(abilityTargetPlayer.isProtected || player.isBlocked)) {
                // SERIAL KILLER KILL WORK
                abilityTargetPlayer.setIsKilled(true);
                abilityTargetPlayer.addKiller("Serial Killer");
                sendMessage(
                  user.playerID,
                  room,
                  roomCode,
                  game,
                  "socket",
                  `You sink your knife into ${abilityTargetPlayer.getPlayerName()}. Your victim falls to the ground`,
                  "confirm"
                );
                sendMessage(
                  abilityTarget.playerID,
                  room,
                  roomCode,
                  game,
                  "target",
                  `You feel a sharp pain in your back. You have been murdered by the Serial Killer`,
                  "alert"
                );
              } else {
                // DIDNT WORK
                if (abilityTargetPlayer.isProtected) {
                  sendMessage(
                    user.playerID,
                    room,
                    roomCode,
                    game,
                    "socket",
                    `Your lust for blood has been contained. Someone protected ${abilityTargetPlayer.getPlayerName()}`,
                    "info"
                  );
                  if (abilityTargetPlayer.getRole().type.includes("doctor")) {
                    sendMessage(
                      abilityTarget.playerID,
                      room,
                      roomCode,
                      game,
                      "target",
                      `Someone tried to kill you, but you were protected`,
                      "info"
                    );
                  } else {
                    sendMessage(
                      abilityTarget.playerID,
                      room,
                      roomCode,
                      game,
                      "target",
                      `Someone tried to kill you, but you were protected by the Doctor`,
                      "info"
                    );
                  }
                }

                if (player.isBlocked) {
                  sendMessage(
                    user.playerID,
                    room,
                    roomCode,
                    game,
                    "socket",
                    `Your killing spree has been halted to a stop. Someone blocked you`,
                    "info"
                  );
                }
              }
            }
          }
        }
      }
    }
  }

  socket.on("resetSocketActions", (playerID) => {
    resetSocketActions(playerID);
  });

  function resetSocketActions(playerID) {
    var roomCode = connectedUsers.get(playerID).getCurrentRoom();
    var room = rooms.get(roomCode);
    var game = room.getGame();
    var player = connectedUsers.get(playerID).getPlayer(roomCode);
    if (player.voteTarget !== null) {
      theVoteTarget = getKeyFromValue(proxyIdenfication, player.voteTarget);
      theVoteTargetPlayer = connectedUsers
        .get(theVoteTarget)
        .getPlayer(roomCode);
      if (game.getCycle() == "Day") {
        theVoteTargetPlayer.dayVotes -= player.getRole().voteCount;
      } else if (game.getCycle() == "Night") {
        theVoteTargetPlayer.nightVotes -= player.getRole().killVoteCount;
      }
    }

    player.reset();
    socket.emit(
      "playerTargetButtonsReset",
      player.abilityTarget,
      player.voteTarget,
      player
    );
  }

  function resetAllActions(playerID, room, roomCode, game) {
    console.log("RESET ALL ACTIONS");

    for (var i = 0; i < game.getUsers().length; i++) {
      let user = game.getUsers()[i];
      let player = user.getPlayer(roomCode);
      player.reset();
      io.to(user.getPlayerID()).emit(
        "playerTargetButtonsReset",
        player.abilityTarget,
        player.voteTarget,
        player
      );
    }
  }

  socket.on("fetchCemetery", (playerID) => {
    if (checkUserExist(playerID)) {
      if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
        var roomCode = connectedUsers.get(playerID).getCurrentRoom();
        var room = rooms.get(roomCode);
        var game = room.getGame();
        if (game.getProgress()) {
          if (game.getUsers().includes(connectedUsers.get(playerID))) {
            io.to(roomCode).emit(
              "savedCemetery",
              generateCemeteryList(playerID)
            );
          }
        }
      }
    }
  });

  function generateCemeteryList(playerID) {
    var roomCode = connectedUsers.get(playerID).getCurrentRoom();
    var room = rooms.get(roomCode);
    var game = room.getGame();
    var burried = [];
    for (var i = 0; i < game.getCemetery().length; i++) {
      var thePlayer = game.getCemetery()[i].getPlayer(roomCode);
      var burriedPlayerName = thePlayer.getPlayerName();
      var burriedPlayerRole = "";
      if (game.settings.showRoles.value == true) {
        burriedPlayerRole = thePlayer.getRole().name;
      }
      var burriedPlayer = { burriedPlayerName, burriedPlayerRole };
      burried.push(burriedPlayer);
    }
    return burried;
  }

  function deathHandler(playerID, room, roomCode, game) {
    // SEND MESSAGE WHO DIED FROM WHOM (killedBY)
    var noneDead = true;
    var noneLynched = true;
    var toSendToCemetery = [];
    for (var i = 0; i < game.getAlive().length; i++) {
      var player = game.getAlive()[i].getPlayer(roomCode);
      console.log("death handler", player);
      if (player.getIsKilled()) {
        noneDead = false;
        if (!player.killedBy.includes("Server")) {
          sendMessage(
            playerID,
            room,
            roomCode,
            game,
            "all",
            `${player.getPlayerName()} died during the night`,
            "alert"
          );
        } else if (player.killedBy.includes("Server")) {
          sendMessage(
            playerID,
            room,
            roomCode,
            game,
            "all",
            `${player.getPlayerName()} mysteriously died`,
            "alert"
          );
        }
        if (player.killedBy.length > 0) {
          // killed
          for (
            var killCount = 0;
            killCount < player.killedBy.length;
            killCount++
          ) {
            var killer = player.killedBy[killCount];
            if (killer.includes("Evil")) {
              sendMessage(
                playerID,
                room,
                roomCode,
                game,
                "all",
                `${player.getPlayerName()} was killed by member of the ${killer} team`,
                "alert"
              );
            } else if (killer.includes("Serial Killer")) {
              sendMessage(
                playerID,
                room,
                roomCode,
                game,
                "all",
                `${player.getPlayerName()} was murdered by the ${killer}`,
                "alert"
              );
            } else if (killer.includes("Server")) {
              // sendMessage(
              //   playerID,
              //   room,
              //   roomCode,
              //   game,
              //   "all",
              //   `${player.getPlayerName()} left the game (${killer})`,
              //   "alert"
              // );
            }
          }
        }
        // WHAT WAS THEIR ROLE
        if (game.settings.showRoles.value == true) {
          sendMessage(
            playerID,
            room,
            roomCode,
            game,
            "all",
            `${player.getPlayerName()} role was: ${player.getRole().name}`,
            "important"
          );
        }

        var executionerObject = Object.values(
          checkIfExecutionerAlive(playerID, room, roomCode, game)
        );

        if (executionerObject[0] == true) {
          var executioner = executionerObject[1];

          // if the executioner's target gets KILLED during night
          if (
            executioner.getPlayer(roomCode).getRole().target ==
            game.getAlive()[i]
          ) {
            // executioner targets gets killed
            // executioner becomes JESTER
            executioner.getPlayer(roomCode).setOldRole("executioner");
            executioner
              .getPlayer(roomCode)
              .setOldTarget(executioner.getPlayer(roomCode).getRole().target);
            executioner.getPlayer(roomCode).setRole(new Role("jester"));
            //  update set players only for executioner
            io.to(executioner.getPlayerID()).emit("updateSetPlayers");
            updateRoleCard(playerID, "socket", executioner.getPlayerID());
            sendMessage(
              executioner.getPlayerID(),
              room,
              roomCode,
              game,
              "target",
              `Your target ${player.getPlayerName()} has died. You have become a Jester!`,
              "important"
            );
          }
        }

        var lawyerObject = Object.values(
          checkIfLawyerAlive(playerID, room, roomCode, game)
        );
        if (lawyerObject[0] == true) {
          var lawyer = lawyerObject[1];
          if (
            lawyer.getPlayer(roomCode).getRole().client == game.getAlive()[i]
          ) {
            sendMessage(
              lawyer.getPlayerID(),
              room,
              roomCode,
              game,
              "target",
              `Your client ${player.getPlayerName()} has died. You're now on your own`,
              "info"
            );
          }
        }

        // To send to cemetery
        toSendToCemetery.push(game.getAlive()[i]);
      } else if (player.getIsLynched()) {
        noneLynched = false;
        // lynched
        // WHAT WAS THEIR ROLE
        if (game.settings.showRoles.value == true) {
          sendMessage(
            playerID,
            room,
            roomCode,
            game,
            "all",
            `${player.getPlayerName()} role was: ${player.getRole().name}`,
            "important"
          );
        }

        var lawyerObject = Object.values(
          checkIfLawyerAlive(playerID, room, roomCode, game)
        );

        if (lawyerObject[0] == true) {
          var lawyer = lawyerObject[1];
          if (
            game.getAlive()[i] == lawyer.getPlayer(roomCode).getRole().client
          ) {
            if (
              game
                .getAlive()
                [i].getPlayer(roomCode)
                .getRole()
                .type.includes("jester")
            ) {
              // If client is lynched, and they are the jester
              sendMessage(
                lawyer.getPlayerID(),
                room,
                roomCode,
                game,
                "target",
                `Your client ${player.getPlayerName()} has been lynched. Your client seems...happy for some reason`,
                "info"
              );
            } else {
              sendMessage(
                lawyer.getPlayerID(),
                room,
                roomCode,
                game,
                "target",
                `Your client ${player.getPlayerName()} has been lynched. You're now on your own`,
                "info"
              );
            }
          }
        }

        // To send to cemetery
        toSendToCemetery.push(game.getAlive()[i]);
      }
    }

    for (let i = 0; i < toSendToCemetery.length; i++) {
      // AFTER THAT, ADD THEM TO CEMETERY
      if (!game.getCemetery().includes(toSendToCemetery[i])) {
        game.addCemetery(toSendToCemetery[i]);
        // REMOVE FROM ALIVE ARRAY
        game.removeAlive(toSendToCemetery[i]);
        io.to(roomCode).emit("cemetery", generateCemeteryList(playerID));
      }
    }

    if (noneDead && noneLynched) {
      // Increment how many times there have not been any deaths
      game.setNoDeaths(game.getNoDeaths() + 1);
    } else {
      // Reset
      game.setNoDeaths(0);
    }

    if (game.getNoDeaths() == maxNoDeaths - 1) {
      sendMessage(
        playerID,
        room,
        roomCode,
        game,
        "all",
        `Please note - if no one dies again, the game will end with a timeout`,
        "important"
      );
    }

    if (noneDead && game.getPhase() == "recap") {
      sendMessage(
        playerID,
        room,
        roomCode,
        game,
        "all",
        "Nothing seems to have happened. That probably means something good...right?",
        "info"
      );
    }
  }

  function clearClock(game) {
    if (game.getDone()) {
      clearInterval(game.getGameInterval());
      game.setGameInterval(null);
    }
  }

  function clockHandler(playerID, roomCode, room, game) {
    game.setCurrentCycle(0);
    game.setCurrentPhase(0);
    game.getTheDurations().night.actions = game.settings.actions.value;
    game.getTheDurations().day.discussion = game.settings.discussion.value;
    game.getTheDurations().day.voting = game.settings.voting.value;
    game.setTheDurations(Object.values(game.getTheDurations()));

    game.setNightLength(Object.values(game.getTheDurations()[0]).length);
    game.setDayLength(Object.values(game.getTheDurations()[1]).length);

    game.setCycleCount(1);
    // Two objects, Night object, Day object
    // Set duration to night object -> first phase
    initClock(
      game.getTimer(),
      Object.values(game.getTheDurations()[game.getCurrentCycle()])[
        game.getCurrentPhase()
      ]
    );
    game.setCycle("Night");
    game.setPhase(
      Object.keys(game.getTheDurations()[game.getCurrentCycle()])[
        game.getCurrentPhase()
      ]
    );

    // time is equal to intervalID
    game.setGameInterval(
      setInterval(function () {
        // console.log("THE CLOCK ID", GAME_CLOCK_ID)

        console.log(
          game.getTimer().getCounter(),
          game.getPhase(),
          "phase:" + game.getCurrentPhase(),
          "cycle:" + game.getCurrentCycle(),
          game.getCycle(),
          game.getCycleCount()
        );
        if (game.getDone() == false) {
          // send clock to clients
          io.to(roomCode).emit(
            "clock",
            game.getTimer().getCounter(),
            game.getPhase(),
            game.getCycle(),
            game.getCycleCount()
          );

          messageHandlerForCycles(
            playerID,
            room,
            roomCode,
            game,
            game.getEmitCycleOnce()
          );
          messageHandlerForPhases(
            playerID,
            room,
            roomCode,
            game,
            game.getEmitPhaseOnce()
          );
          gameHandler(playerID);
          io.to(roomCode).emit("changeUI", game.getCycle());

          if (game.getTimer().getCounter() <= 0) {
            // NIGHT
            if (game.getCurrentCycle() == 0) {
              if (game.getCurrentPhase() < game.getNightLength()) {
                game.setCurrentPhase(game.getCurrentPhase() + 1);
                game.setPhase(
                  Object.keys(game.getTheDurations()[game.getCurrentCycle()])[
                    game.getCurrentPhase()
                  ]
                );
                game.setEmitPhaseOnce(true);
                console.log("night less");
                io.to(roomCode).emit("updateSetPlayers");
                setActionsOnPhase(playerID, "clock");
              }
              if (game.getCurrentPhase() >= game.getNightLength()) {
                game.setCurrentPhase(0);
                game.setCurrentCycle(1);
                game.setPhase(
                  Object.keys(game.getTheDurations()[game.getCurrentCycle()])[
                    game.getCurrentPhase()
                  ]
                );
                game.setEmitPhaseOnce(true);
                game.setCycle("Day");
                // Prevent from spamming message
                game.setEmitCycleOnce(true);
                // io.to(roomCode).emit("changeUI", game.getCycle());
                // io.to(roomCode).emit("updateSetPlayers");
              }
              initClock(
                game.getTimer(),
                Object.values(game.getTheDurations()[game.getCurrentCycle()])[
                  game.getCurrentPhase()
                ]
              );
            }
            // DAY
            else if (game.getCurrentCycle() == 1) {
              if (game.getCurrentPhase() < game.getDayLength()) {
                game.setCurrentPhase(game.getCurrentPhase() + 1);
                game.setPhase(
                  Object.keys(game.getTheDurations()[game.getCurrentCycle()])[
                    game.getCurrentPhase()
                  ]
                );
                game.setEmitPhaseOnce(true);
                console.log("day less");
                io.to(roomCode).emit("updateSetPlayers");
                setActionsOnPhase(playerID, "clock");
              }
              if (game.getCurrentPhase() >= game.getDayLength()) {
                resetAllActions(playerID, room, roomCode, game);
                resetPhaseConditions(game);
                game.setCurrentPhase(0);
                game.setCurrentCycle(0);
                game.setPhase(
                  Object.keys(game.getTheDurations()[game.getCurrentCycle()])[
                    game.getCurrentPhase()
                  ]
                );
                game.setEmitPhaseOnce(true);
                game.setCycle("Night");
                // Prevent from spamming message
                game.setEmitCycleOnce(true);
                // Increment cycle count
                game.setCycleCount(game.getCycleCount() + 1);
                // io.to(roomCode).emit("changeUI", game.getCycle());
              }

              initClock(
                game.getTimer(),
                Object.values(game.getTheDurations()[game.getCurrentCycle()])[
                  game.getCurrentPhase()
                ]
              );
            }
          } else {
            game.getTimer().tick();
          }
        }
      }, 1000)
    );
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
          if (game.getDone() == false) {
            if (checkAllReadyGame(roomCode, playerID)) {
              if (game.getUsers().includes(connectedUsers.get(playerID))) {
                if (room.getHost() == playerID) {
                  if (game.getTimer().getRunning() == false) {
                    io.to(roomCode).emit("updateSetPlayers");
                    clockHandler(playerID, roomCode, room, game);
                  }
                }
              }
            }
          }
        }
      }
    }
  });
});
