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

// // !! FIX THIS
// socket.on("ready-status-game", () => {
//   if (users.get(getPlayerID()).readyGame) {
//     var status = document.getElementsByClassName("game-button");
//     status[0].innerText = "ready";
//     status[0].id = "rolecard-ready";
//   } else if (!users.get(getPlayerID()).readyGame) {
//     var status = document.getElementsByClassName("game-button");
//     status[0].innerText = "not ready";
//     status[0].id = "rolecard-notready";
//   }
// });

function toggleCardButton(element) {
  socket.emit("player-ready", getPlayerID(), "game");
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

function showRoleCard(toShow, role="", name="", team="", description="", mission="") {
  if (toShow) {
    console.log("showing card");
    var roleCard = document.getElementsByClassName("game-rolecard")[0];
    roleCard.style.display = "flex";
    roleCard.id = role;
    var roleCardTitle = document.getElementsByClassName("game-rolecard-title")[0]
    roleCardTitle.innerText = name;
    var roleCardDescription = document.getElementsByClassName("game-rolecard-description")[0];
    roleCardDescription.innerText = description;
    var roleCardMission = document.getElementsByClassName("game-rolecard-mission")[0];
    roleCardMission.innerText = mission;
    var readyButton = document.getElementsByClassName("game-button")[0];
    var icon = document.getElementsByClassName("game-rolecard-icon")[0];
    icon.src = "/assets/rolecards/" + name + ".svg";
    
    if (team.includes("good")) {
      roleCardTitle.classList.add("game-rolecard-good-fg");
      roleCardMission.classList.add("game-rolecard-good-fg");
      readyButton.classList.add("game-rolecard-good-bg");
    } else if (team.includes("evil")) {
      roleCardTitle.classList.add("game-rolecard-evil-fg");
      roleCardMission.classList.add("game-rolecard-evil-fg");
      readyButton.classList.add("game-rolecard-evil-bg");
      
    } else if (team.includes("neutral")) {
      roleCardTitle.classList.add("game-rolecard-neutral-fg");
      roleCardMission.classList.add("game-rolecard-neutral-fg");
      readyButton.classList.add("game-rolecard-neutral-bg");

    }
  } else {
    var roleCard = document.getElementsByClassName("game-rolecard")[0];
    roleCard.style.display = "flex";
    roleCard.id = role;
    var roleCardTitle = document.getElementsByClassName("game-rolecard-title")[0]
    roleCardTitle.innerText = name;
    var roleCardDescription = document.getElementsByClassName("game-rolecard-description")[0];
    roleCardDescription.innerText = description;
    var roleCardMission = document.getElementsByClassName("game-rolecard-mission")[0];
    roleCardMission.innerText = mission;
  }
}
// socket.emit("checkForRoleCard", getPlayerID());
socket.on("displayRoleCard", (doDisplay, role, name, team, description, mission) => {
  if (doDisplay) {
    hideGameUI(true);
    showRoleCard(true, role, name, team, description, mission);
  } else {
    hideGameUI(false);
    showRoleCard(false);
  }
});

// // check also if all other requirements are met (checkCanStart)
// // startAllowed, true or false
// // users, inGame
// // game object, inProgress
// socket.on("rolesAssigned", () => {
//   // ID set to inGame, needs to be reset when game ends

//   socket.emit("requestRoleCard", getPlayerID());
//   // socket.on("gameStarted", () => {});
// });

// socket.on("fetchedRoleCard", (role) => {
//   console.log("roles have been assigned");
//   // this role card needs to be maintained until all players have set ready-game to true and the game starts.
//   document.getElementsByClassName("game-rolecard")[0].id = role;
//   document.getElementsByClassName("game-rolecard")[0].innerText = role;
// });
