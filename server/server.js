// server set up
const session = require("express-session");
const express = require("express");
const app = express();
const port = 3000;
const server = require("http").createServer(app);
// const server = app.listen(port);
const io = require("socket.io")(server);

server.listen(port, () => {
  console.log("Server listening at port %d", port);
});
// const oneHour = 60 * 60 * 1000;
// app.use(
//   session({
//     secret: "k4JxZ9GB6OKzSOpcM1OKhEpguEYr8QUb",
//     saveUninitialized: false,
//     cookie: {maxAge: oneHour, httpOnly: true, sameSite: "lax" },
//     resave: false,
//   })
// );

var __dirname = "/mnt/c/Users/petru/Documents/Code/eyesopen/client";

// // random string generator
var randomstring = require("randomstring");
// console.log("Random room code:", roomCode);
// var pID = randomstring.generate(6);
// console.log("Random player id (cookie):", pID);

app.use(express.static("client"));
// serving public file
app.get("/", (req, res) => {
  // console.log("session", req.session);
  // console.log("sessionID", req.session.id);
  // console.log("cookie", req.session.cookie);
  // res.send("HELLO")
});

var { Room } = require("./room");
var rooms = new Map();
var connectedUsers = new Map();

var timeDurations = {
  discussion: 45,
  voting: 25,
  night: 30,
  test: 5,
};
var counter = timeDurations.voting;
// establish server connection with socket
io.on("connection", async (socket) => {
  console.log("a user connected, with socket id:", socket.id);

  socket.on("requestID", (socketID) => {
    console.log(socketID, "requesting player ID")
    var playerID = randomstring.generate(6);
    socket.emit("playerID", playerID);
  });

  socket.on("joinedLobby", (playerID) => {
    connectedUsers.set(playerID, socket.id);
    console.log("player", playerID, "has joined");
  });

  socket.on("hostName", (hostName, playerID) => {
    console.log("host name", hostName, "with", playerID);
  });

  socket.on("createRoom", (playerID) => {
    // !! CREATE USER WHEN Pressing JOIN ROOM
    // !! FIX SO THAT YOU ALWAYS RECONNECT TO YOUR CREATED GAME
    // !! FIX ROOM UI
    // ! FIX URL QUERY
    // ! MIN 3 to START
    // ! ROLE CARD, ADDING THEM TO THE GAME
    // ! CHECK IF ALL ROLES ARE THE SAME TEAM

    var temp = Array.from(rooms.entries());
    var count = 0;
    if (temp.length > 0) {
      while (count > temp.length) {
        console.log("host", rooms.entries().value.getHost())
        if (rooms.entries().value.getHost() !== playerID) {
          var roomCode = randomstring.generate(5);
          console.log(roomCode);
          // Setting up room
          rooms.set(roomCode, new Room(playerID));
          rooms.get(roomCode).addUser(playerID);

          console.log("room", roomCode, "created");
          console.log(socket.id, "joined", roomCode);
          // Log rooms that socket is in
          console.log(rooms);
          // Socket joining playerID and room
          socket.join(playerID);
          socket.join(roomCode);
        }
        count++;
      }
    } else {
      var roomCode = randomstring.generate(5);
      console.log(roomCode);
      rooms.set(roomCode, new Room(playerID));
      rooms.get(roomCode).addUser(playerID);
      console.log("room", roomCode, "created");
      console.log(socket.id, "joined", roomCode);
      console.log(rooms);
      socket.join(playerID);
      socket.join(roomCode);
    }
    console.log("room in:", socket.rooms);
  });

  socket.on("checkRoomCode", (roomCode, playerID) => {
    console.log(playerID, "trying roomcode", roomCode);
    if (rooms.has(roomCode)) {
      console.log("room code", roomCode, "is valid");
      socket.join(roomCode);
      socket.emit("roomCodeResponse", true);
    } else {
      socket.emit("roomCodeResponse", false);
    }
  });

  socket.on("userName", (userName, playerID) => {
    console.log("user name", userName);
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
