const socket = io("http://localhost:3000/");
// const socket = io("http://192.168.1.203:3000/");
// const socket = io("http://192.168.1.66:3000/");

/**
 * [resetCookie resets the playerID cookie to null]
 */
function resetCookie() {
  if(!document.cookie.valueOf("eyesopenID")) {
    console.log("cookie was set to null")
    document.cookie = "eyesopenID=null";
  } else {
    console.log("cookie is already null")
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
  // window.location = URL;
}

const oneHour = 60 * 60;

function requestID() {
  console.log("You connect with id", socket.id);
  socket.emit("requestID", socket.id);
  socket.on("playerID", (playerID) => {
    console.log("playerID from server:", playerID);
    if (getPlayerID() == "null") {
      document.cookie = `eyesopenID=${playerID}; max-age=${oneHour}; SameSite=Lax`;
      socket.emit("joinedLobby", getPlayerID());
    }
  });
}

function getPlayerID() {
  var cookie = document.cookie.valueOf("eyesopenID");
  var wantedCookie = cookie.split("=");
  return wantedCookie[1]
}

function closeCard() {
  document.getElementById("overlay").style.display = "none";
  hideUsername();
  hideHost();
  hideJoin();
}

function checkIfSessionExists() {
  if (getPlayerID() !== "null") {
    return true;
  }
  return false;
}

function displayUsername() {
  if (!checkIfSessionExists()) {
    document.getElementById("overlay").style.display = "block";
    document.getElementById("username").style.display = "flex";
    document.getElementById("inputUsername").focus();
  } else {
    displayJoin();
  }
}
function hideUsername() {
  document.getElementById("overlay").style.display = "none";
  document.getElementById("username").style.display = "none";
  document.getElementById("username-help").style.display = "none";
  document.getElementById("inputUsername").value = "";
  document.getElementById("inputUsername").style.border = "2px solid #b1b1b1";
}

function displayHost() {
  if (!checkIfSessionExists()) {
    document.getElementById("overlay").style.display = "block";
    document.getElementById("host").style.display = "flex";
    document.getElementById("inputHost").focus();
  } else {
    socket.emit("createRoom", getPlayerID());
    setLocation("/lobby.html", false);
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
  hideUsername();
  displayJoin();
}

function UserInputDoneHost() {
  hideHost();
  // to a new room
  setLocation("/lobby.html", false);
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
        setLocation("/lobby.html", false);

      } else {
        document.getElementById("join-help").style.display = "flex";
        document.getElementById("code").style.border =
          "2px solid hsl(0, 100%, 45%)";
        document.getElementById("join-help").innerText =
          "Code is invalid. Room doesn't exist";
      }
    })
  }
  // check if room exists (has been created)
  // to the room that already exists
}

function checkUsername(isHost) {
  if (isHost) {
    var inputVal = document.getElementById("inputHost").value;
    if (inputVal.length < 1) {
      document.getElementById("host-help").style.display = "flex";
      document.getElementById("inputHost").style.border =
        "2px solid hsl(0, 100%, 45%)";
      document.getElementById("host-help").innerText =
        "Username needs to be atleast 1 character(s) long";
    } else {
      requestID();
      console.log("playerID is here", getPlayerID());
      setTimeout(() => {
        socket.emit("hostName", inputVal, getPlayerID());
        socket.emit("createRoom", getPlayerID());
      }, 500);
      document.getElementById("host-help").style.display = "none";
      document.getElementById("inputHost").style.border =
        "2px solid hsl(123, 100%, 45%)";
      UserInputDoneHost();
    }
  } else {
    var inputVal = document.getElementById("inputUsername").value;
    if (inputVal.length < 1) {
      document.getElementById("username-help").style.display = "flex";
      document.getElementById("inputUsername").style.border =
        "2px solid hsl(0, 100%, 45%)";
      document.getElementById("username-help").innerText =
        "Username needs to be atleast 1 character(s) long";
    } else {
      socket.emit("userName", inputVal, getPlayerID());
      document.getElementById("username-help").style.display = "none";
      document.getElementById("inputUsername").style.border =
        "2px solid hsl(123, 100%, 45%)";
      UserInputDone();
    }
  }
  // check if room exists (has been created)
}
