// server set up
const cookieParser = require("cookie-parser");
const sessions = require("express-session");
const express = require("express");
const app = express();
const port = 3000;
const server = app.listen(port);
const io = require("socket.io")(server);

const oneHour = 60 * 60 * 1000;
app.use(
  sessions({
    secret: "k4JxZ9GB6OKzSOpcM1OKhEpguEYr8QUb",
    saveUninitialized: true,
    cookie: { maxAge: oneHour, sameSite: "lax" },
    resave: false,
  })
);

var __dirname = "/mnt/c/Users/petru/Documents/Code/eyesopen/client";

// random string generator
var randomstring = require("randomstring");
var rand = randomstring.generate(5);
console.log("Random room code:", rand);

// parsing the incoming data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// cookie parser middleware
app.use(cookieParser());

var userName;
var session;

//serving public file
app.use(express.static("client"));

app.get("/", (req, res) => {
  session = req.session;
  if (session.userid) {
    res.send("You are logged in");
  } else {
    res.sendFile(__dirname + "/index.html");
  }
});

// establish server connection with socket
io.on("connection", (socket) => {
  console.log("a user connected");
  console.log(socket.id);
});

var timeDurations = {
  discussion: 45,
  voting: 25,
  night: 30,
  test: 5,
};

var counter = timeDurations.test;
var time = setInterval(function () {
  io.emit("counter", counter);
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

var count = io.engine.clientsCount;
// may or may not be similar to the count of Socket instances in the main namespace, depending on your usage
var count2 = io.of("/").sockets.size;
console.log(count);
console.log(count2);
