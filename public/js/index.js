// ? Change this
const socket = io("https://eyes-open.onrender.com/");
// const socket = io("http://localhost.com:3000");

socket.on("connect", () => {
  socket.emit("checkUser", getPlayerID());
  socket.on("userExists", (userExists) => {
    if (!userExists) {
      resetCookie();
    } else {
      socket.emit("setRoom", getPlayerID());
    }
  });
});

/**
 * [resetCookie resets the playerID cookie to null]
 */
function resetCookie(override = false) {
  if (override) {
    console.log("cookie was reset to null");
    document.cookie = "eyesopenID=null; path=/";
  } else {
    if (getPlayerID() !== "null" && getPlayerID() !== undefined) {
      console.log("ID exists before user, setting to null");
      document.cookie = "eyesopenID=null; path=/";
    } else if (getPlayerID() == undefined) {
      console.log("ID is undefined, setting to null");
      document.cookie = "eyesopenID=null; path=/";
    } else if (getPlayerID() == "null") {
      console.log("ID is already null");
    }
  }
}

/**
 * [setLocation sets the location of the window to the specified URL]
 *
 * @param   {[string]}  URL    [URL is the specified URL string to set the location to]
 * @param   {[boolean]}  reset  [reset sets the playerID cookie to null if true]
 *
 */
function setLocation(URL, reset = false) {
  if (reset) {
    resetCookie();
  }
  setTimeout(() => {
    window.location.href = URL;
  }, 500);
}

const fiveHours = 60 * 60 * 5;

function requestID() {
  console.log("You connect with id", socket.id);
  socket.emit("requestID", socket.id, getPlayerID());
  socket.on("playerID", (playerID) => {
    console.log("playerID from server:", playerID);
    if (getPlayerID() == "null") {
      document.cookie = `eyesopenID=${playerID}; path=/; max-age=${fiveHours}; SameSite=Lax`;
      socket.emit("completedID", getPlayerID());
    }
  });
}

function getPlayerID() {
  var cookies = document.cookie.split(";");
  for (var i = 0; i < cookies.length; i++) {
    if (cookies[i].includes("eyesopenID")) {
      return cookies[i].split("=")[1];
    }
  }
}

function closeCard() {
  document.getElementById("overlay").style.display = "none";
  hideUser();
  hideHost();
  hideJoin();
}

function checkIfSessionExists() {
  if (getPlayerID() !== "null") {
    return true;
  }
  return false;
}

function displayUser() {
  if (!checkIfSessionExists()) {
    document.getElementById("overlay").style.display = "block";
    document.getElementById("user").style.display = "flex";
    document.getElementById("inputUser").focus();
  } else {
    displayJoin();
  }
}
function hideUser() {
  document.getElementById("overlay").style.display = "none";
  document.getElementById("user").style.display = "none";
  document.getElementById("user-help").style.display = "none";
  document.getElementById("inputUser").value = "";
  document.getElementById("inputUser").style.border = "2px solid #b1b1b1";
}

function displayHost() {
  if (!checkIfSessionExists()) {
    document.getElementById("overlay").style.display = "block";
    document.getElementById("host").style.display = "flex";
    document.getElementById("inputHost").focus();
  } else {
    socket.emit("createRoom", getPlayerID());
    socket.emit("fetchHostRoom", getPlayerID());
    socket.on("hostRoom", (roomCode) => {
      console.log(roomCode);
      setLocation(`/lobby/${roomCode}`, false);
    });
  }
}
function hideHost() {
  document.getElementById("overlay").style.display = "none";
  document.getElementById("host").style.display = "none";
  document.getElementById("host-help").style.display = "none";
  document.getElementById("inputHost").value = "";
  document.getElementById("inputHost").style.border = "2px solid #b1b1b1";
}

function UserInputDone() {
  hideUser();
  displayJoin();
}

function UserInputDoneHost(roomCode) {
  hideHost();
  // to a new room
  setLocation(`/lobby/${roomCode}`, false);
}

function displayJoin() {
  document.getElementById("overlay").style.display = "block";
  document.getElementById("join-room").style.display = "flex";
  document.getElementById("code").focus();
}

function hideJoin() {
  document.getElementById("overlay").style.display = "none";
  document.getElementById("join-room").style.display = "none";
  document.getElementById("join-help").style.display = "none";
  document.getElementById("code").value = "";
  document.getElementById("code").style.border = "2px solid #b1b1b1";
}

function roomCodeError() {
  document.getElementById("join-help").style.display = "flex";
  document.getElementById("code").style.border = "2px solid hsl(0, 100%, 45%)";
  document.getElementById("join-help").innerText =
    "Code needs to be 5 characters long";
}

function roomCodeCorrect() {
  document.getElementById("join-help").style.display = "none";
  document.getElementById("code").style.border =
    "2px solid hsl(123, 100%, 45%)";
}

function roomCodeInvalid() {
  document.getElementById("join-help").style.display = "flex";
  document.getElementById("code").style.border = "2px solid hsl(0, 100%, 45%)";
  document.getElementById("join-help").innerText =
    "Code is invalid. Room doesn't exist";
}
function roomFull() {
  document.getElementById("join-help").style.display = "flex";
  document.getElementById("code").style.border = "2px solid hsl(0, 100%, 45%)";
  document.getElementById("join-help").innerText = "The room is full";
}
function roomInProgress() {
  document.getElementById("join-help").style.display = "flex";
  document.getElementById("code").style.border = "2px solid hsl(0, 100%, 45%)";
  document.getElementById("join-help").innerText =
    "The room is currently in progress";
}

function join(inputVal) {
  setLocation(`/lobby/${inputVal}`, false);
}

function checkRoomCode() {
  requestID();
  var inputVal = document.getElementById("code").value;
  socket.emit("checkRoomCode", inputVal, getPlayerID());
  if (inputVal.length !== 5) {
    roomCodeError();
  } else {
    socket.emit("checkUserApartOfGame", getPlayerID(), "index");
    socket.on("apartOfGameIndex", (apartOfGame, inProgress) => {
      if (apartOfGame) {
        roomCodeCorrect();
        join(inputVal);
      }
    });
    socket.on("roomCodeResponse", (status) => {
      if (status == "valid") {
        roomCodeCorrect();
        join(inputVal);
      } else if (status == "invalid") {
        roomCodeInvalid();
      } else if (status == "full") {
        roomFull();
      } else if (status == "inProgress") {
        roomInProgress();
      }
    });
  }
  // check if room exists (has been created)
  // to the room that already exists
}

function hostNameShortError() {
  document.getElementById("host-help").style.display = "flex";
  document.getElementById("inputHost").style.border =
    "2px solid hsl(0, 100%, 45%)";
  document.getElementById("host-help").innerText =
    "Username needs to be atleast 1 character(s) long";
}
function userNameShortError() {
  document.getElementById("user-help").style.display = "flex";
  document.getElementById("inputUser").style.border =
    "2px solid hsl(0, 100%, 45%)";
  document.getElementById("user-help").innerText =
    "Username needs to be atleast 1 character(s) long";
}

function hostNameCorrect() {
  document.getElementById("host-help").style.display = "none";
  document.getElementById("inputHost").style.border =
    "2px solid hsl(123, 100%, 45%)";
}
function userNameCorrect() {
  document.getElementById("user-help").style.display = "none";
  document.getElementById("inputUser").style.border =
    "2px solid hsl(123, 100%, 45%)";
}

function checkName(isHost) {
  if (isHost) {
    var inputVal = document.getElementById("inputHost").value;
    if (inputVal.length < 1) {
      hostNameShortError();
    } else {
      requestID();
      setTimeout(() => {
        socket.emit("createUser", inputVal, getPlayerID());
        socket.emit("createRoom", getPlayerID());
        hostNameCorrect();
        socket.emit("fetchHostRoom", getPlayerID());
        socket.on("hostRoom", (roomCode) => {
          console.log(roomCode);
          UserInputDoneHost(roomCode);
        });
        // socket.on("hostRoom", (hostRoom) => {
        //   UserInputDoneHost(hostRoom);
        // })
      }, 500);
    }
  } else {
    var inputVal = document.getElementById("inputUser").value;
    if (inputVal.length < 1) {
      userNameShortError();
    } else {
      requestID();
      setTimeout(() => {
        socket.emit("createUser", inputVal, getPlayerID());
        userNameCorrect();
        UserInputDone();
      }, 500);
    }
  }
  // check if room exists (has been created)
}
