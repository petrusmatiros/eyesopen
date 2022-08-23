const socket = io("http://localhost:3000");
// const socket = io("http://192.168.1.203:3000/");

const domain = "http://localhost:3000/";
const lobby = "http://localhost:3000/lobby/";
const minPlayers = 3;

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

function getPlayerID() {
  var cookies = document.cookie.split(";");
  for (var i = 0; i < cookies.length; i++) {
    if (cookies[i].includes("eyesopenID")) {
      return cookies[i].split("=")[1];
    }
  }
}

socket.on("counter", function (count) {
  var display = document.querySelector("#time");
  // console.log(count);
  display.innerText = count;
});

socket.on("connect", () => {
  socket.emit("checkUser", getPlayerID());
  socket.on("userExists", (userExists) => {
    if (!userExists) {
      var URL = window.location.href.replace("/game", "");
      window.location.href = URL;
      resetCookie();
    } else {
      console.log("user exists");
      if (window.location.href !== lobby) {
        var URL = window.location.href.replace("http://", "");
        var room = URL.split("/")[URL.split("/").length - 2];
        socket.emit("setRoom", getPlayerID());
        socket.emit("directJoin", getPlayerID(), room);
      } else {
        // USER EXISTS
        socket.emit("setRoom", getPlayerID());
        socket.emit("joinedLobby", getPlayerID());
      }
      socket.emit("checkUserApartOfGame", getPlayerID(), "app");

      socket.on("apartOfGameApp", (apartOfGame, inProgress) => {
        console.log("apartOfGame:" + apartOfGame);
        console.log("inProgress:" + inProgress);
        if (apartOfGame && inProgress == true) {
          console.log("checking for role card availability");
          socket.emit("checkForRoleCard", getPlayerID());
        } else if (apartOfGame == false) {
          var URL = window.location.href.replace("/game", "");
          window.location.href = URL;
          console.log("URL:" + URL);
        }
      });
      socket.on("resetURL", () => {
        var URL = window.location.href.replace("/game", "");
        window.location.href = URL;
      });
    }
  });
});

// !! FIX THIS
socket.on("ready-status-game", () => {
  if (users.get(getPlayerID()).readyGame) {
    var status = document.getElementsByClassName("game-button ready");
    status[0].innerText = "ready";
    status[0].id = "status-ready";
  } else if (!users.get(getPlayerID()).readyGame) {
    var status = document.getElementsByClassName("game-button ready");
    status[0].innerText = "not ready";
    status[0].id = "status-notready";
  }
});

function toggleCardButton(element) {
  if (element.classList.contains("ready")) {
    if (element.classList.toggle("not-ready")) {
      element.innerText = "Unready";

      socket.emit("player-ready", getPlayerID(), "game");
    } else {
      element.innerText = "Ready";
      socket.emit("player-unready", getPlayerID(), "game");
    }
  }
}

function endGame() {
  // show win screen
  // change to lobby
  // document.getElementById("inGame").id = "inLobby";
  // document.getElementsByClassName("lobby-code-container")[0].style.display = "flex";
}

function hideGameUI(toHide) {
  if (toHide) {
    // hide GAME UI
    // document.getElementById("inLobby").id = "inGame";
  }
}

function showRoleCard(toShow, role) {
  console.log("toShow is " + toShow);
  if (toShow) {
    console.log("showing card");
    document.getElementsByClassName("game-rolecard")[0].style.display = "flex";
    document.getElementsByClassName("game-rolecard")[0].id = role;
    document.getElementsByClassName("game-rolecard")[0].innerText = role;
  } else {
    console.log("hiding card");
    document.getElementsByClassName("game-rolecard")[0].style.display = "none";
    document.getElementsByClassName("game-rolecard")[0].id = "";
    document.getElementsByClassName("game-rolecard")[0].innerText = "";
  }
}
// socket.emit("checkForRoleCard", getPlayerID());
socket.on("displayRoleCard", (doDisplay, role) => {
  if (doDisplay) {
    hideGameUI(true);
    showRoleCard(true, role);
  } else {
    hideGameUI(false);
    showRoleCard(false, role);
  }
});

// check also if all other requirements are met (checkCanStart)
// startAllowed, true or false
// users, inGame
// game object, inProgress
socket.on("rolesAssigned", () => {
  // ID set to inGame, needs to be reset when game ends

  socket.emit("requestRoleCard", getPlayerID());
  // socket.on("gameStarted", () => {});
});

socket.on("fetchedRoleCard", (role) => {
  console.log("roles have been assigned");
  // this role card needs to be maintained until all players have set ready-game to true and the game starts.
  document.getElementsByClassName("game-rolecard")[0].id = role;
  document.getElementsByClassName("game-rolecard")[0].innerText = role;
});
