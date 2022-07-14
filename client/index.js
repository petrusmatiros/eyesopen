const socket = io(`http://localhost:3000/`);
// const socket = io("http://192.168.1.203:3000/");

socket.on("connect", () => {
  if (getPlayerID() !== "null") {
    socket.emit("setOwnRoom", getPlayerID());
  }
});

/**
 * [resetCookie resets the playerID cookie to null]
 */
function resetCookie() {
  if (!document.cookie.valueOf("eyesopenID")) {
    console.log("cookie was set to null");
    document.cookie = "eyesopenID=null";
  } else {
    console.log("cookie is already null");
  }
}
resetCookie();

/**
 * [setLocation sets the location of the window to the specified URL]
 *
 * @param   {[string]}  URL    [URL is the specified URL string to set the location to]
 * @param   {[boolean]}  reset  [reset sets the playerID cookie to null if true]
 *
 */
function setLocation(URL, reset) {
  if (reset) {
    resetCookie();
  }
  setTimeout(() => {
    window.location = URL;
  }, 500)
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
  var cookie = document.cookie.valueOf("eyesopenID");
  var wantedCookie = cookie.split("=");
  return wantedCookie[1];
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
    setLocation('/lobby.html', false)
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

function UserInputDoneHost() {
  hideHost();
  // to a new room
  setLocation('/lobby.html', false);
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

function checkRoomCode() {
  requestID();
  var inputVal = document.getElementById("code").value;
  socket.emit("checkRoomCode", inputVal, getPlayerID());
  if (inputVal.length !== 5) {
    document.getElementById("join-help").style.display = "flex";
    document.getElementById("code").style.border =
      "2px solid hsl(0, 100%, 45%)";
    document.getElementById("join-help").innerText =
      "Code needs to be 5 characters long";
  } else {
    document.getElementById("join-help").style.display = "none";
    document.getElementById("code").style.border =
      "2px solid hsl(123, 100%, 45%)";
    socket.on("roomCodeResponse", (isValid) => {
      if (isValid) {
        setLocation('/lobby.html', false);
      } else {
        document.getElementById("join-help").style.display = "flex";
        document.getElementById("code").style.border =
          "2px solid hsl(0, 100%, 45%)";
        document.getElementById("join-help").innerText =
          "Code is invalid. Room doesn't exist";
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
        UserInputDoneHost();
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
