// ? Change this
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

          socket.emit("fetchMessages", getPlayerID());
          socket.on("savedMessages", (messages) => {
            var messages = document.getElementById("game-message-scroller");
            for (var i = 0; i < messages.length; i++) {
              var messageType = "game-message-";
              var newMessage = document.createElement("div");
              newMessage.classList.add("game-message");
              if (messages[i].type.includes("day")) {
                messageType += "day";
                newMessage.classList.add(messageType);
              } else if (messages[i].type.includes("night")) {
                messageType += "night";
                newMessage.classList.add(messageType);
              } else if (messages[i].type.includes("confirm")) {
                messageType += "confirm";
                newMessage.classList.add(messageType);
              } else if (messages[i].type.includes("info")) {
                messageType += "info";
                newMessage.classList.add(messageType);
              } else if (messages[i].type.includes("alert")) {
                messageType += "alert";
                newMessage.classList.add(messageType);
              }
              newMessage.innerText = messages[i].message;
              messages.appendChild(newMessage);
            }
          });
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

// // !! FIX THI

function readyCardButton() {
  socket.emit("player-ready", getPlayerID(), "game");
  socket.emit("checkForRoleCard", getPlayerID());
}

function endGame() {
  // show win screen
  // change to lobby
  // document.getElementById("inGame").id = "inLobby";
  // document.getElementsByClassName("lobby-code-container")[0].style.display = "flex";
}

function togglePlayerCard(element) {
  var toHide = element.children[1];
  var questionMark = element.children[0];
  if (toHide.style.display == "none") {
    toHide.style.display = "flex";
    questionMark.style.display = "none";
  } else {
    toHide.style.display = "none";
    questionMark.style.display = "flex";
  }
  socket.emit("requestPlayerCard", getPlayerID(), "press");
}

socket.on("recieveMessage", (message, type) => {
  var messages = document.getElementById("game-message-scroller");
  var messageType = "game-message-";
  var newMessage = document.createElement("div");
  newMessage.classList.add("game-message");

  if (type.includes("day")) {
    messageType += "day";
    newMessage.classList.add(messageType);
  } else if (type.includes("night")) {
    messageType += "night";
    newMessage.classList.add(messageType);
  } else if (type.includes("confirm")) {
    messageType += "confirm";
    newMessage.classList.add(messageType);
  } else if (type.includes("info")) {
    messageType += "info";
    newMessage.classList.add(messageType);
  } else if (type.includes("alert")) {
    messageType += "alert";
    newMessage.classList.add(messageType);
  }
  newMessage.innerText = message;
  messages.appendChild(newMessage);
});

function messageBoxHandler() {}

socket.on("fetchedPlayerCardPress", (name, mission) => {
  var playerIcon = document.getElementById("game-player-card-icon");
  var playerRole = document.getElementById("game-player-card-role");
  var playerMission = document.getElementById("game-player-card-mission");
  playerIcon.src = "/assets/rolecards/" + name + ".svg";
  playerRole.innerText = name;
  playerMission.innerText = mission;
});

function showGameUI(toShow) {
  if (toShow) {
    var body = document.getElementsByClassName("body-light")[0];
    body.classList.add("game-background");
    var game = document.getElementsByClassName("game")[0];
    game.style.display = "flex";
  } else {
    var body = document.getElementsByClassName("body-light")[0];
    body.classList.remove("game-background");
    var game = document.getElementsByClassName("game")[0];
    game.style.display = "none";
  }
}

function showWaiting(toShow = false) {
  var waiting = document.getElementsByClassName("game-waiting-container")[0];
  if (toShow) {
    waiting.style.display = "flex";
  } else {
    waiting.style.display = "none";
  }
}

function showRoleCard(
  toShow,
  role = "",
  name = "",
  team = "",
  description = "",
  mission = ""
) {
  if (toShow) {
    console.log("showing card");
    var roleCardContainer = document.getElementsByClassName(
      "game-rolecard-container"
    )[0];
    var roleCard = document.getElementsByClassName("game-rolecard")[0];
    roleCardContainer.style.display = "flex";
    roleCard.id = role;
    var roleCardTitle = document.getElementsByClassName(
      "game-rolecard-title"
    )[0];
    roleCardTitle.innerText = name;
    var roleCardDescription = document.getElementsByClassName(
      "game-rolecard-description"
    )[0];
    roleCardDescription.innerText = description;
    var roleCardMission = document.getElementsByClassName(
      "game-rolecard-mission"
    )[0];
    roleCardMission.innerText = mission;
    var readyButton = document.getElementsByClassName("game-button")[0];
    var icon = document.getElementsByClassName("game-rolecard-icon")[0];
    icon.src = "/assets/rolecards/" + name + "_bordered.svg";

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
    var roleCardContainer = document.getElementsByClassName(
      "game-rolecard-container"
    )[0];
    var roleCard = document.getElementsByClassName("game-rolecard")[0];
    roleCardContainer.style.display = "none";
    roleCard.id = role;
    var roleCardTitle = document.getElementsByClassName(
      "game-rolecard-title"
    )[0];
    roleCardTitle.innerText = name;
    var roleCardDescription = document.getElementsByClassName(
      "game-rolecard-description"
    )[0];
    roleCardDescription.innerText = description;
    var roleCardMission = document.getElementsByClassName(
      "game-rolecard-mission"
    )[0];
    roleCardMission.innerText = mission;
  }
}
function changeUI(theme) {
  var navbar = document.getElementById("game-navbar");
  var body = document.getElementById("game-body");
  var playerCard = document.getElementById("game-player-card");
  var playerCardQuestionMark = document.getElementById(
    "game-player-card-questionmark"
  );
  var playerCardDivider = document.getElementById("game-player-card-divider");
  var playerCardButton = document.getElementById("game-player-card-button");
  var messageBox = document.getElementById("game-messagebox");
  var gamePanel = document.getElementById("game-panel");
  var gameClock = document.getElementById("game-clock");
  var gameClockDivider = document.getElementById("game-clock-divider");
  var messages = document.getElementById("game-message-scroller").children;

  if (theme.includes("Night")) {
    navbar.className = "navbar-dark";
    body.classList.remove("game-background-day");
    body.classList.add("game-background-night");
    playerCard.classList.remove("game-day-bg", "game-day-fg");
    playerCard.classList.add("game-night-bg", "game-night-fg");
    playerCardQuestionMark.classList.remove("game-day-bg", "game-day-fg");
    playerCardQuestionMark.classList.add("game-night-bg", "game-night-fg");
    playerCardDivider.classList.remove("game-day-border");
    playerCardDivider.classList.add("game-night-border");
    playerCardButton.classList.remove("game-day-secondary");
    playerCardButton.classList.add("game-night-secondary");
    messageBox.classList.remove("game-day-bg", "game-day-fg");
    messageBox.classList.add("game-night-bg", "game-night-fg");
    gamePanel.classList.remove("game-panel-day");
    gamePanel.classList.add("game-panel-night");
    gameClock.classList.remove("game-day-bg", "game-day-fg");
    gameClock.classList.add("game-night-bg", "game-night-fg");
    gameClockDivider.classList.remove("game-day-border");
    gameClockDivider.classList.add("game-night-border");
    for (var i = 0; i < messages.length; i++) {
      messages[i].classList.add("game-message-night");
      messages[i].classList.remove("game-message-day");
    }
  } else if (theme.includes("Day")) {
    navbar.className = "navbar-light";
    body.classList.remove("game-background-night");
    body.classList.add("game-background-day");
    playerCard.classList.remove("game-night-bg", "game-night-fg");
    playerCard.classList.add("game-day-bg", "game-day-fg");
    playerCardQuestionMark.classList.remove("game-night-bg", "game-night-fg");
    playerCardQuestionMark.classList.add("game-day-bg", "game-day-fg");
    playerCardDivider.classList.remove("game-night-border");
    playerCardDivider.classList.add("game-day-border");
    playerCardButton.classList.remove("game-night-secondary");
    playerCardButton.classList.add("game-day-secondary");
    messageBox.classList.remove("game-night-bg", "game-night-fg");
    messageBox.classList.add("game-day-bg", "game-day-fg");
    gamePanel.classList.remove("game-panel-night");
    gamePanel.classList.add("game-panel-day");
    gameClock.classList.remove("game-night-bg", "game-night-fg");
    gameClock.classList.add("game-day-bg", "game-day-fg");
    gameClockDivider.classList.remove("game-night-border");
    gameClockDivider.classList.add("game-day-border");
    for (var i = 0; i < messages.length; i++) {
      messages[i].classList.remove("game-message-night");
      messages[i].classList.add("game-message-day");
    }
  }
}
socket.on("changeUI", (theme) => {
  changeUI(theme);
});

socket.on("showGame", (allReady) => {
  if (allReady) {
    showGameUI(true);
    showRoleCard(false);
    showWaiting(false);

    socket.emit("initGame", getPlayerID());
    socket.emit("requestPlayerCard", getPlayerID(), "first");
    socket.on("fetchedPlayerCardFirst", (name, mission) => {
      var playerIcon = document.getElementById("game-player-card-icon");
      var playerRole = document.getElementById("game-player-card-role");
      var playerMission = document.getElementById("game-player-card-mission");
      playerIcon.src = "/assets/rolecards/" + name + ".svg";
      playerRole.innerText = name;
      playerMission.innerText = mission;
    });
    socket.emit("updateUI", getPlayerID());
  }
});

socket.on("clock", (counter, phase, cycle, cycleCount) => {
  var clock = document.getElementById("game-time");
  var gameCycle = document.getElementById("game-cycle-text");
  if (counter < 10) {
    clock.innerText = "00:0" + counter;
  } else if (counter >= 10) {
    clock.innerText = "00:" + counter;
  }
  if (cycle.includes("Night")) {
    document.getElementById("game-cycle-icon").src = "/assets/icons/night.svg";
  } else if (cycle.includes("Day")) {
    document.getElementById("game-cycle-icon").src = "/assets/icons/day.svg";
  }
  gameCycle.innerText = cycle + " " + cycleCount;
});

// socket.emit("checkForRoleCard", getPlayerID());
socket.on(
  "displayRoleCard",
  (playerIsReady, allReady, role, name, team, description, mission) => {
    if (!playerIsReady) {
      showGameUI(false);
      showRoleCard(true, role, name, team, description, mission);
      showWaiting(false);
    } else if (playerIsReady && !allReady) {
      showGameUI(false);
      showRoleCard(false);
      showWaiting(true);
    }
  }
);
