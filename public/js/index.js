const domain = "https://eyesopen.ml/";
const socket = io(domain, { secure: true });

const lobby = domain + "lobby/";

socket.on("connect", () => {
  socket.emit("checkUser", getPlayerID());
  socket.on("userExists", (userExists) => {
    if (!userExists) {
      showChangeUsername(false);
      resetCookie();
    } else {
      showChangeUsername(true);
      socket.emit("setRoom", getPlayerID());
    }
  });
  addEventListeners();
});




function loadPlayersInLobby(slots) {
  var thePlayers = document.getElementById("players");
  var columns = thePlayers.children;
  for (var col = 0; col < columns.length; col++) {
    var array = columns[col];
    for (let i = 0; i < array.length; i++) {
      var currentPlayer = array[i];
      currentPlayer.id = "player-hidden";
      currentPlayer.children[0].id = "";
      currentPlayer.children[0].innerText = "";
    }
  }
  var playerCount = 0;
  var colCount = 0;
  var col1 = document.getElementById("players-col1").children
  var col2 = document.getElementById("players-col2").children
  var currentColumn = col1;
  for (var [key, value] of Object.entries(slots)) {
    
    if (playerCount == 2) {
      colCount++;
      playerCount = 0;
    }

    var playerElement = currentColumn[colCount];
    if (value.userID !== undefined) {
      playerElement.id = "";
      playerElement.children[0].id = value.userID;
      playerElement.children[0].innerText = value.userName;

      if (currentColumn == col1) {
        currentColumn = col2
        playerCount++;
      }
      else if (currentColumn == col2) {
        currentColumn = col1;
        playerCount++;
      }
    } else {
      playerElement.id = "player-hidden";
      playerElement.children[0].id = "";
      playerElement.children[0].innerText = "";
    }
  }
}

function hideKick() {
  var overlayPopup = document.getElementById("overlay-popup1");
  overlayPopup.style.display = "none";
  var overlayPopupConfirm = document.getElementById("overlay-popup2");
  overlayPopupConfirm.style.display = "none";
  var kickPopup = document.getElementById("kick");
  kickPopup.style.display = "none";
  var kickPopupConfirm = document.getElementById("kickConfirm");
  kickPopupConfirm.style.display = "none"
}
function displayKick() {
  socket.emit("requestLobbyPlayers", getPlayerID());
  socket.on("fetchLobbyPlayers", (slots) => {
    loadPlayersInLobby(slots)
  })
  var overlayPopup = document.getElementById("overlay-popup1");
  overlayPopup.style.display = "flex";
  
  var kickPopup = document.getElementById("kick");
  kickPopup.style.display = "flex";
}
function hideKickConfirm() {
  var overlayPopupConfirm = document.getElementById("overlay-popup2");
  overlayPopupConfirm.style.display = "none";
  var kickPopupConfirm = document.getElementById("kickConfirm");
  kickPopupConfirm.style.display = "none"
}
function displayKickConfirm() {
  var overlayPopupConfirm = document.getElementById("overlay-popup2");
  overlayPopupConfirm.style.display = "flex";
  var kickPopupConfirm = document.getElementById("kickConfirm");
  console.log(kickPopupConfirm)
  kickPopupConfirm.style.display = "flex"
}
var playerToKickID = null;
function kickPlayer(element) {
  var playerContainer = element.parentElement;
  var playerBubble = playerContainer.children[0];
  if (playerBubble.id !== null || playerBubble.id !== undefined) {
    displayKickConfirm();
    document.getElementById("playerToKick").innerText = "Kick " + playerBubble.innerText + " from lobby?"
    playerToKickID = playerBubble.id;
  }
}
function kickConfirm() {
  if (playerToKickID !== null) {
    socket.emit("kickPlayer", getPlayerID(), playerToKickID)
    hideKick();
    setTimeout(() => {
      socket.emit("fetchHostRoom", getPlayerID());
      socket.on("hostRoom", (roomCode) => {

        socket.emit("checkRoomCode", roomCode, getPlayerID(), "press");
          socket.on("roomCodeResponsePress", (status) => {
            if (status == "full") {
              displayKick();
            } else {
              setLocation(`lobby/${roomCode}`, false);
            }
          });
      })
    }, 100)
  }
  playerToKickID = null;
}


function showChangeUsername(toShow = false) {
  if (toShow == true) {
    document.getElementById("changeUsername").style.display = "flex";
    document.getElementById("links").style.marginTop = "2.9rem";
  } else if (toShow == false) {
    document.getElementById("links").style.marginTop = "5rem";
    document.getElementById("changeUsername").style.display = "none";
  }
}

socket.on("showChangeUsername", (toShow) => {
  showChangeUsername(toShow);
});

function addEventListeners() {
  var theCodeInput = document.getElementById("code");
  var theUserInput = document.getElementById("inputUser");
  var theChangeNameInput = document.getElementById("inputChangeName");
  var theHostInput = document.getElementById("inputHost");
  theCodeInput.addEventListener("keydown", (e) => {
    if (!e.repeat) {
      if (e.key !== null) {
        if (e.key == "Enter") {
          checkRoomCode();
        }
      }
    }
  });
  theUserInput.addEventListener("keydown", (e) => {
    if (!e.repeat) {
      if (e.key !== null) {
        if (e.key == "Enter") {
          checkName(false);
        }
      }
    }
  });
  theChangeNameInput.addEventListener("keydown", (e) => {
    if (!e.repeat) {
      if (e.key !== null) {
        if (e.key == "Enter") {
          changeName();
        }
      }
    }
  });
  theHostInput.addEventListener("keydown", (e) => {
    if (!e.repeat) {
      if (e.key !== null) {
        if (e.key == "Enter") {
          checkName(true);
        }
      }
    }
  });
}

function animateTitle() {
  var title = document.getElementsByClassName("title-eyesopen")[0];

  setInterval(() => {
    if (title.id == "title-frame1") {
      title.src = "/assets/icons/eyesopen_title2.svg";
      title.id = "title-frame2";
    } else if (title.id == "title-frame2") {
      title.src = "/assets/icons/eyesopen_title3.svg";
      title.id = "title-frame3";
    } else if (title.id == "title-frame3") {
      title.src = "/assets/icons/eyesopen_title1.svg";
      title.id = "title-frame1";
    }
  }, 200);
}

animateEyes();
function animateEyes() {
  animateTitle();
  var eyes = document.getElementsByClassName("animated-eye");
  for (let i = 0; i < eyes.length; i++) {
    let rand = random(250, 750);
    let eye = eyes[i];
    setInterval(() => {
      if (eye.id == "eye-frame1") {
        eye.src = "/assets/icons/eye2.svg";
        eye.id = "eye-frame2";
      } else if (eye.id == "eye-frame2") {
        eye.src = "/assets/icons/eye3.svg";
        eye.id = "eye-frame3";
      } else if (eye.id == "eye-frame3") {
        eye.src = "/assets/icons/eye4.svg";
        eye.id = "eye-frame4";
      } else if (eye.id == "eye-frame4") {
        eye.src = "/assets/icons/eye5.svg";
        eye.id = "eye-frame5";
      } else if (eye.id == "eye-frame5") {
        eye.src = "/assets/icons/eye6.svg";
        eye.id = "eye-frame6";
      } else if (eye.id == "eye-frame6") {
        eye.src = "/assets/icons/eye1.svg";
        eye.id = "eye-frame1";
      }
    }, rand);
  }
}

function random(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

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
  navigator.clipboard.writeText(domain + URL);
  window.location.href = URL;
}

const fiveHours = 60 * 60 * 5;

function requestID(inputVal = "", isHost = "") {
  console.log("You connect with id", socket.id);
  socket.emit("requestID", socket.id, getPlayerID());
  socket.on("playerID", (playerID) => {
    if (playerID == null) {
      window.location.reload();
    } else {
      console.log("playerID from server:", playerID);
      if (getPlayerID() == "null") {
        document.cookie = `eyesopenID=${playerID}; path=/; max-age=${fiveHours}; SameSite=Lax`;
        socket.emit("completedID", getPlayerID());
      }
      if (isHost == true) {
        createUserHost(inputVal);
      } else if (isHost == false) {
        createUserNotHost(inputVal);
      }
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
  hideChangeUsername();
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
function displayChangeUsername() {
  if (checkIfSessionExists()) {
    document.getElementById("overlay").style.display = "block";
    document.getElementById("changeName").style.display = "flex";
    document.getElementById("inputChangeName").focus();
  }
}
function hideUser() {
  document.getElementById("inputUser").blur();
  document.getElementById("overlay").style.display = "none";
  document.getElementById("user").style.display = "none";
  document.getElementById("user-help").style.display = "none";
  document.getElementById("inputUser").value = "";
  document.getElementById("inputUser").style.border = "2px solid #b1b1b1";
}
function hideChangeUsername() {
  document.getElementById("inputChangeName").blur();
  document.getElementById("overlay").style.display = "none";
  document.getElementById("changeName").style.display = "none";
  document.getElementById("changeName-help").style.display = "none";
  document.getElementById("inputChangeName").value = "";
  document.getElementById("inputChangeName").style.border = "2px solid #b1b1b1";
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
      if (roomCode == null) {
        window.location.reload();
      } else {
        console.log(roomCode);
        socket.emit("checkRoomCode", roomCode, getPlayerID(), "press");
        socket.on("roomCodeResponsePress", (status) => {
          if (status == "full") {
            displayKick();
          } else {
            setLocation(`lobby/${roomCode}`, false);
          }
        });
      }
    });
  }
}
function hideHost() {
  document.getElementById("inputHost").blur();
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
function ChangeUsernameDone() {
  hideChangeUsername();
  showNotification("newName");
}

function UserInputDoneHost(roomCode) {
  hideHost();
  // to a new room
  setLocation(`lobby/${roomCode}`, false);
}

function displayJoin() {
  document.getElementById("overlay").style.display = "block";
  document.getElementById("join-room").style.display = "flex";
  document.getElementById("code").focus();
}

function hideJoin() {
  document.getElementById("code").blur();
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
  setLocation(`lobby/${inputVal}`, false);
}

function checkRoomCode() {
  requestID();
  var inputVal = document.getElementById("code").value.toUpperCase();
  socket.emit("checkRoomCode", inputVal, getPlayerID(), "press");
  if (inputVal.length !== 5) {
    roomCodeError();
  } else {
    socket.emit("checkUserApartOfGame", getPlayerID(), "index");
    socket.on("apartOfGameIndex", (apartOfGame, inProgress, code) => {
      if (apartOfGame) {
        roomCodeCorrect();
        join(inputVal);
      }
    });
    socket.on("roomCodeResponsePress", (status) => {
      if (status == "valid") {
        roomCodeCorrect();
        join(inputVal);
      } else if (status == "invalid") {
        roomCodeInvalid();
      } else if (status == "full") {
        roomFull();
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
    "Username needs to be at least 1 character(s) long";
}
function userNameShortError() {
  document.getElementById("user-help").style.display = "flex";
  document.getElementById("inputUser").style.border =
    "2px solid hsl(0, 100%, 45%)";
  document.getElementById("user-help").innerText =
    "Username needs to be at least 1 character(s) long";
}
function changeUsernameShortError() {
  document.getElementById("changeName-help").style.display = "flex";
  document.getElementById("inputChangeName").style.border =
    "2px solid hsl(0, 100%, 45%)";
  document.getElementById("changeName-help").innerText =
    "Username needs to be at least 1 character(s) long";
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

function changeName() {
  var inputVal = document.getElementById("inputChangeName").value;
  if (inputVal.length < 1) {
    changeUsernameShortError();
  } else {
    socket.emit("changeUsername", getPlayerID(), inputVal);
    ChangeUsernameDone();
  }
}

function showNotification(type) {
  if (type == "newName") {
    var theNotification = document.getElementById("index-notification");
    theNotification.style.display = "flex";
    theNotification.innerText = "Username has been updated! (~‾⌣‾)~";
    setTimeout(() => {
      theNotification.style.display = "none";
    }, 5000);
  }
}

function hideNotification() {
  var theNotification = document.getElementById("index-notification");
  theNotification.style.display = "none";
}

function checkName(isHost) {
  if (isHost) {
    var inputVal = document.getElementById("inputHost").value;
    if (inputVal.length < 1) {
      hostNameShortError();
    } else {
      requestID(inputVal, true);
    }
  } else {
    var inputVal = document.getElementById("inputUser").value;
    if (inputVal.length < 1) {
      userNameShortError();
    } else {
      requestID(inputVal, false);
    }
  }
  // check if room exists (has been created)
}

function createUserHost(inputVal) {
  socket.emit("createUser", inputVal, getPlayerID());
  socket.emit("createRoom", getPlayerID());
  hostNameCorrect();
  socket.emit("fetchHostRoom", getPlayerID());
  socket.on("hostRoom", (roomCode) => {
    if (roomCode == null) {
      window.location.reload();
    } else {
      console.log(roomCode);
      UserInputDoneHost(roomCode);
    }
  });
}
function createUserNotHost(inputVal) {
  socket.emit("createUser", inputVal, getPlayerID());
  userNameCorrect();
  UserInputDone();
}
