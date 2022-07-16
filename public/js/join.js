const socket = io("http://localhost:3000");
// const socket = io("http://192.168.1.203:3000/");

socket.on("connect", () => {
  socket.emit("checkUser", getPlayerID());
  socket.on("userExists", (userExists) => {
    if (!userExists) {
      resetCookie();

    } else {
        socket.emit("setOwnRoom", getPlayerID());
    }
  });
});

/**
 * [resetCookie resets the playerID cookie to null]
 */
function resetCookie(override = false) {
  // !! PERHAPS REMOVE?
  if (override) {
    console.log("cookie was reset to null");
    document.cookie = "eyesopenID=null";
  } else {
    if (getPlayerID() !== "null" && getPlayerID() !== undefined) {
      console.log("ID exists before user, setting to null");
      document.cookie = "eyesopenID=null";
    } else if (getPlayerID() == undefined) {
      console.log("ID is undefined, setting to null");
      document.cookie = "eyesopenID=null";
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
function setLocation(URL) {
  setTimeout(() => {
    window.location = URL;
  }, 500);
}

const oneHour = 60 * 60;

function requestID() {
  console.log("You connect with id", socket.id);
  socket.emit("requestID", socket.id);
  socket.on("playerID", (playerID) => {
    console.log("playerID from server:", playerID);
    if (getPlayerID() == "null") {
      document.cookie = `eyesopenID=${playerID}; max-age=${oneHour}; SameSite=Lax`;
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
    socket.emit("fetchRoomCode", getPlayerID());
    socket.on("hostRoom", (roomCode) => {
      console.log(roomCode);
      setLocation(`/lobby/${roomCode}`);
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
  setLocation(`/lobby/${roomCode}`);
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

function roomFull() {
  document.getElementById("join-help").style.display = "flex";
  document.getElementById("inputUser").style.border = "2px solid hsl(0, 100%, 45%)";
  document.getElementById("user-help").innerText = "The room is full";
}


function userNameShortError() {
  document.getElementById("user-help").style.display = "flex";
  document.getElementById("inputUser").style.border =
    "2px solid hsl(0, 100%, 45%)";
  document.getElementById("user-help").innerText =
    "Username needs to be atleast 1 character(s) long";
}

function userNameCorrect() {
  document.getElementById("user-help").style.display = "none";
  document.getElementById("inputUser").style.border =
    "2px solid hsl(123, 100%, 45%)";
}


function checkDirectName() {
  var inputVal = document.getElementById("inputUser").value;
  if (inputVal.length < 1) {
    userNameShortError();
  } else {
    var full = false;
    requestID();
    socket.emit("checkRoomCode", inputVal, getPlayerID());
    socket.on("roomCodeResponse", (status) => {
        if (status == "full") {
            roomFull();
            full = true;
        }
    });
    if (full == false) {
        setTimeout(() => {
          socket.emit("createUser", inputVal, getPlayerID());
          userNameCorrect();
          UserInputDone();
        }, 500);
    }
  }
  // check if room exists (has been created)
}
