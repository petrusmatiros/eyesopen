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
const oneHour = 60 * 60 * 1000;
app.use(
  session({
    secret: "k4JxZ9GB6OKzSOpcM1OKhEpguEYr8QUb",
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: "lax" },
    resave: false,
  })
);

var __dirname = "/mnt/c/Users/petru/Documents/Code/eyesopen/client";

// // random string generator
var randomstring = require("randomstring");
// var roomCode = randomstring.generate(5);
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

const users = [];
var sessionIDs = [];
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

  socket.on("requestID", () => {
    var playerID = randomstring.generate(6);
    socket.emit("playerID", playerID);
  });

  socket.on("joinedLobby", (playerID) => {
    console.log("player", playerID, " has joined");
  });

});

var time = setInterval(function () {
  io.emit("counter", counter);
  console.log("counter from server:", counter);
  if (counter <= 0) {
    clearInterval(time);
    // next phase
  } else {
    counter--;
  }
}, 1000);

var createdRooms = {
  "5HJlp": {
    inProgress: true,
    ended: false,
  },
};

// var count = io.engine.clientsCount;
// // may or may not be similar to the count of Socket instances in the main namespace, depending on your usage
// var count2 = io.of("/").sockets.size;
// console.log(count);
// console.log(count2);
