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
var { Role } = require("./role");
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
          if (
            room.getGame().getAlive().includes(connectedUsers.get(playerID))
          ) {
            if (state.includes("index")) {
              console.log(playerID, "(index) is apart of room", roomCode)
              socket.emit("apartOfGameIndex", true, room.getGame().getProgress());
            } else if (state.includes("join")) {
              console.log(playerID, "(join) is apart of room", roomCode)
              socket.emit("apartOfGameJoin", true, room.getGame().getProgress());
            } else if (state.includes("app")) {
              console.log(playerID, "(app) is apart of room", roomCode)
              socket.emit("apartOfGameApp", true, room.getGame().getProgress());
            }
          } else {
            if (state.includes("index")) {
              console.log(playerID, "(index) is NOT APART of room", roomCode)
              socket.emit("apartOfGameIndex", false, room.getGame().getProgress());
            } else if (state.includes("join")) {
              console.log(playerID, "(join) is NOT APART of room", roomCode)
              socket.emit("apartOfGameJoin", false, room.getGame().getProgress());
            } else if (state.includes("app")) {
              console.log(playerID, "(app) is NOT APART of room", roomCode)
              socket.emit("apartOfGameApp", false, room.getGame().getProgress());
            }
          }
        // }
      }
    }
  });

  function random(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function setUp(roomCode) {
    var room = rooms.get(roomCode);
    var roles = room.getRoles();
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

          // add user to all alive players
          room.getGame().addAlive(users[i]);
          // if user has an evil role, add them to evil
          if (users[i].getPlayer().role.team == "evil") {
            room.getGame().addEvil(users[i]);
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
                console.log("client", users[rand].getPlayer().role);
              }
            } else {
              if (
                users[rand] !== theLawyer &&
                (users[rand].getPlayer().role.team == "evil" ||
                  users[rand].getPlayer().role.team == "neutral")
              ) {
                seen.push(rand);
                theLawyer.getPlayer().role.client = users[rand];
                console.log("client", users[rand].getPlayer().role);
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
              console.log("target", users[rand].getPlayer().role);
            }
          }
        }
      }
      console.log("theLawyer", theLawyer);
      console.log("theExcutioner", theExecutioner);
      console.log("after game set up", users);
    }
  }

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
          setUp(roomCode);
          // set game in progress
          room.getGame().setProgress(true);
          io.to(roomCode).emit("rolesAssigned");
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
          console.log("totalReq", totalReq);
          var count = 0;
          for (var value of Object.values(room.requirements)) {
            if (value == true) {
              count++;
            }
          }
          console.log("count", count);
          console.log("requirements", room.requirements);
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
          }
        } else if (state.includes("game")) {
          if (rooms.get(roomCode).getGame().getProgress() == true) {
            emitTo = "ready-status-game";
            connectedUsers.get(playerID).setReadyGame(notReady);
          }
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
          if (rooms.get(roomCode).getGame().getProgress() == false) {

            emitTo = "ready-status-lobby";
            connectedUsers.get(playerID).setReadyLobby(ready);
          }
          
        } else if (state.includes("game")) {
          if (rooms.get(roomCode).getGame().getProgress() == true) {
            emitTo = "ready-status-game";
            connectedUsers.get(playerID).setReadyGame(ready);

          }
          
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
        
          if (
            rooms.get(roomCode).getGame().getProgress() == false ||
            (rooms.get(roomCode).getGame().getProgress() == true &&
              rooms
                .get(roomCode)
                .getGame()
                .getAlive()
                .includes(connectedUsers.get(playerID)))
          ) {
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
        
          if (
            rooms.get(roomCode).getGame().getProgress() == false ||
            (rooms.get(roomCode).getGame().getProgress() == true &&
              rooms
                .get(roomCode)
                .getGame()
                .getAlive()
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
          console.log("GAME IS REALLY IN PROGRESS, SO SHOULD NOT CHANGE ANYTHING")
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
      rooms.get(roomCode).requirements.validPick = true;
      reqHandler(playerID);
      io.to(connectedUsers.get(playerID).getCurrentRoom()).emit(emitTo, true);
    } else {
      rooms.get(roomCode).requirements.validPick = false;
      reqHandler(playerID);
      io.to(connectedUsers.get(playerID).getCurrentRoom()).emit(emitTo, false);
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
