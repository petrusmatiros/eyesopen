// const domain = "https://84.216.161.205/";
const domain = "https://eyesopen.ml/";
const socket = io(domain, { secure: true });
// const socket = io(domain);

const lobby = domain + "lobby/";

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

      socket.emit("setRoom", getPlayerID());
      socket.emit("checkUserApartOfGame", getPlayerID(), "app");

      socket.on("apartOfGameApp", (apartOfGame, inProgress, code) => {
        console.log("apartOfGame:" + apartOfGame);
        console.log("inProgress:" + inProgress);
        if (apartOfGame && inProgress == true) {
          socket.emit("directJoin", getPlayerID(), code, "app");
          resetActionsOnRefresh();
          socket.emit("setActionsOnPhase", getPlayerID(), "refresh");
          socket.on("removeActionsOnPhaseRefresh", (phase) => {
            removeActionsOnPhase(phase);
          });
          console.log("checking for role card availability");
          socket.emit("checkForRoleCard", getPlayerID(), "refresh");
          socket.on("showGameRefresh", (allReady) => {
            showGame(allReady);
          });
          socket.emit("setEvilRoom", getPlayerID());

          socket.emit("setPlayers", getPlayerID(), "refresh");
          socket.on(
            "setPlayersRefresh",
            (players, cycle, phase, isDead, socketRole, proxyID) => {
              setPlayers(players, cycle, phase, isDead, socketRole, proxyID);
            }
          );
          socket.emit("checkIfDead", getPlayerID(), "refresh");
          socket.on("isPlayerDeadRefresh", (phase, isDead) => {
            checkIfDead(phase, isDead);
          });

          socket.emit("fetchMessages", getPlayerID());
          socket.on("savedMessages", (messages, cycle) => {
            loadSavedMessages(messages, cycle);
          });
          socket.emit("fetchCemetery", getPlayerID());
          socket.on("savedCemetery", (burried) => {
            loadCemetery(burried);
          });
        } else if (apartOfGame == false && inProgress == true || apartOfGame == false && inProgress == false) {
          if (window.location.href.endsWith("/game")) {
            var URL = window.location.href.replace("http://", "");
            var room = URL.split("/")[URL.split("/").length - 2];
            socket.emit("directJoin", getPlayerID(), code, "app");
            window.location.href = lobby + room;
          }
        }
      });
    }
  });
});

function readyCardButton() {
  socket.emit("player-ready", getPlayerID(), "game");
  socket.emit("checkForRoleCard", getPlayerID(), "press");
}

socket.on("showGamePress", (allReady) => {
  showGame(allReady);
});

socket.on("showGameUpdate", (allReady) => {
  showGame(allReady);
});

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

var manualScroll = false;

function overrideSroll() {
  manualScroll = true;
  var scrollDown = document.getElementById("game-messagebox-scrolldown");
  scrollDown.style.display = "flex";
}

function autoScroll() {
  manualScroll = false;
  var scrollDown = document.getElementById("game-messagebox-scrolldown");
  scrollDown.style.display = "none";
  var messages = document.getElementById("game-message-scroller");
  messages.scrollTop = messages.scrollHeight;
}

socket.on("recieveMessage", (message, type, cycle) => {
  var messages = document.getElementById("game-message-scroller");
  var messageType = "game-message-";
  var newMessage = document.createElement("div");
  newMessage.classList.add("game-message");

  if (type.includes("Day")) {
    messageType += "day";
    newMessage.classList.add(messageType);
  } else if (type.includes("Night")) {
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
  } else if (type.includes("important")) {
    messageType += "important";
    newMessage.classList.add(messageType);
  } else if (type.includes("extra")) {
    messageType += "extra";
    newMessage.classList.add(messageType);
  } else if (type.includes("timestamp")) {
    if (cycle.includes("Day")) {
      messageType += "day";
      newMessage.classList.add(messageType);
    } else if (cycle.includes("Night")) {
      messageType += "night";
      newMessage.classList.add(messageType);
    }
    newMessage.style.justifyContent = "center";
    newMessage.style.alignItems = "center";
    newMessage.style.fontWeight = "600";
  } else if (type.includes("lineSeperator")) {
    if (cycle.includes("Day")) {
      messageType += "day";
      newMessage.classList.add(messageType);
    } else if (cycle.includes("Night")) {
      messageType += "night";
      newMessage.classList.add(messageType);
    }
    newMessage.style.justifyContent = "center";
    newMessage.style.alignItems = "center";
  } else if (type.includes("bold")) {
    if (cycle.includes("Day")) {
      messageType += "day";
      newMessage.classList.add(messageType);
    } else if (cycle.includes("Night")) {
      messageType += "night";
      newMessage.classList.add(messageType);
    }
    newMessage.style.fontWeight = "475";
  }

  newMessage.innerText = message;
  messages.appendChild(newMessage);
  if (!manualScroll) {
    messages.scrollTop = messages.scrollHeight;
  }
});

function messageBoxHandler() {
  // used for action messages
}

socket.on("cemetery", (burried) => {
  loadCemetery(burried);
});

function loadCemetery(burried) {
  var deceasedElement = document.getElementById("game-deceased");
  var deceasedList = deceasedElement.children;

  for (var i = 0; i < burried.length; i++) {
    deceasedList[
      i
    ].innerText = `${burried[i].burriedPlayerName} (${burried[i].burriedPlayerRole})`;
  }
}

function loadSavedMessages(messages, cycle) {
  var messageScroller = document.getElementById("game-message-scroller");
  for (var i = 0; i < messages.length; i++) {
    var messageType = "game-message-";
    var newMessage = document.createElement("div");
    newMessage.classList.add("game-message");
    if (messages[i].type.includes("Day")) {
      messageType += "day";
      newMessage.classList.add(messageType);
    } else if (messages[i].type.includes("Night")) {
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
    } else if (messages[i].type.includes("important")) {
      messageType += "important";
      newMessage.classList.add(messageType);
    } else if (messages[i].type.includes("extra")) {
      messageType += "extra";
      newMessage.classList.add(messageType);
    } else if (messages[i].type.includes("timestamp")) {
      if (cycle.includes("Day")) {
        messageType += "day";
        newMessage.classList.add(messageType);
      } else if (cycle.includes("Night")) {
        messageType += "night";
        newMessage.classList.add(messageType);
      }
      newMessage.style.justifyContent = "center";
      newMessage.style.alignItems = "center";
      newMessage.style.fontWeight = "600";
    } else if (messages[i].type.includes("lineSeperator")) {
      if (cycle.includes("Day")) {
        messageType += "day";
        newMessage.classList.add(messageType);
      } else if (cycle.includes("Night")) {
        messageType += "night";
        newMessage.classList.add(messageType);
      }
      newMessage.style.justifyContent = "center";
      newMessage.style.alignItems = "center";
    } else if (messages[i].type.includes("bold")) {
      if (cycle.includes("Day")) {
        messageType += "day";
        newMessage.classList.add(messageType);
      } else if (cycle.includes("Night")) {
        messageType += "night";
        newMessage.classList.add(messageType);
      }
      newMessage.style.fontWeight = "475";
    }

    newMessage.innerText = messages[i].message;
    messageScroller.appendChild(newMessage);
    messageScroller.scrollTop = messageScroller.scrollHeight;
  }
}

// ! FIX THIS

function resetActionsOnRefresh() {
  socket.emit("resetSocketActions", getPlayerID());
}

socket.on(
  "playerTargetButtonsReset",
  (theAbilityTarget, theVoteTarget, socketPlayer) => {
    playerTargetHandler(theAbilityTarget, theVoteTarget, socketPlayer);
  }
);

socket.on(
  "currentPlayerTargets",
  (theAbilityTarget, theVoteTarget, socketPlayer) => {
    playerTargetHandler(theAbilityTarget, theVoteTarget, socketPlayer);
  }
);

function playerTargetHandler(theAbilityTarget, theVoteTarget, socketPlayer) {
  var allPlayers = document.getElementById("game-players-container").children;

  var players = Array.from(allPlayers[0].children).concat(
    Array.from(allPlayers[1].children)
  );
  for (var i = 0; i < players.length; i++) {
    // var playerElement = document.getElementById(players[i].id);
    var playerElement = players[i];
    var nameContainer = playerElement.children[0];
    var buttons = playerElement.children[1];
    var abilityButton = buttons.children[0];
    var voteButton = buttons.children[2];

    if (
      players[i].id !== socketPlayer.abilityTarget &&
      players[i].id !== socketPlayer.voteTarget
    ) {
      nameContainer.classList.remove("game-player-selection-vote");
      playerElement.classList.remove("game-player-selection-ability");
      abilityButton.innerText = "ability";
      voteButton.innerText = "vote";
      abilityButton.style.fontWeight = "400";
      voteButton.style.fontWeight = "400";
    } else if (players[i].id !== socketPlayer.abilityTarget) {
      // nameContainer.classList.remove("game-player-selection-ability");
      playerElement.classList.remove("game-player-selection-ability");
      nameContainer.classList.remove("game-player-selection-vote");

      // nameContainer.classList.remove("game-player-selection-both");
      abilityButton.innerText = "ability";
      abilityButton.style.fontWeight = "400";
      voteButton.style.fontWeight = "700";
      voteButton.innerText = "undo";
    } else if (players[i].id !== socketPlayer.voteTarget) {
      nameContainer.classList.remove("game-player-selection-vote");
      playerElement.classList.remove("game-player-selection-ability");
      // nameContainer.classList.remove("game-player-selection-both");
      abilityButton.innerText = "undo";
      abilityButton.style.fontWeight = "700";
      voteButton.style.fontWeight = "400";
      voteButton.innerText = "vote";
    }

    if (
      players[i].id == socketPlayer.abilityTarget &&
      players[i].id == socketPlayer.voteTarget
    ) {
      // nameContainer.classList.add("game-player-selection-both");
      nameContainer.classList.add("game-player-selection-vote");
      playerElement.classList.add("game-player-selection-ability");
      abilityButton.innerText = "undo";
      voteButton.innerText = "undo";
      abilityButton.style.fontWeight = "700";
      voteButton.style.fontWeight = "700";
    } else if (
      players[i].id == socketPlayer.abilityTarget &&
      players[i].id !== socketPlayer.voteTarget
    ) {
      // nameContainer.classList.add("game-player-selection-ability");
      playerElement.classList.add("game-player-selection-ability");
      abilityButton.innerText = "undo";
      abilityButton.style.fontWeight = "700";
      voteButton.style.fontWeight = "400";
    } else if (
      players[i].id !== socketPlayer.abilityTarget &&
      players[i].id == socketPlayer.voteTarget
    ) {
      nameContainer.classList.add("game-player-selection-vote");
      voteButton.innerText = "undo";
      abilityButton.style.fontWeight = "400";
      voteButton.style.fontWeight = "700";
    }
  }
}

// press respective button to set player target
// click at the same area, remove it, click on new, set new target
// display green ,red or gradient depending on choice
function actionHandler(element) {
  var button = element;
  var buttonsContainer = element.parentElement;
  var playerElement = buttonsContainer.parentElement;
  var playerNameContainer = playerElement.children[0];
  var playerName = playerNameContainer.children[1];
  console.log("action", button.innerText, "taken on", playerName.innerText);

  if (!button.id.includes("game-button-state")) {
    socket.emit("playerAction", getPlayerID(), element.id, playerElement.id);
  }
}

socket.on("updateSetPlayers", () => {
  updateSetPlayers();
});
function updateSetPlayers() {
  socket.emit("setPlayers", getPlayerID(), "clock");
}

socket.on(
  "setPlayersClock",
  (players, cycle, phase, isDead, socketRole, proxyID) => {
    setPlayers(players, cycle, phase, isDead, socketRole, proxyID);
  }
);

socket.on("removeActionsOnPhaseClock", (phase) => {
  removeActionsOnPhase(phase);
});

function removeActionsOnPhase(phase) {
  var playersContainer = document.getElementById("game-players-container");
  var slots = playersContainer.children;

  for (var i = 0; i < slots.length; i++) {
    for (var j = 0; j < slots[i].length; j++) {
      var currentElement = slots[i].children[j];
      var buttons = currentElement.children[1];
      var abilityButton = buttons.children[0];
      var voteButton = buttons.children[2];
      abilityButton.setAttribute("onclick", "");
      if (phase == "voting") {
        voteButton.setAttribute("onclick", "actionHandler(this)");
      } else if (
        phase == "nightMessages" ||
        phase == "recap" ||
        phase == "discussion" ||
        phase == "dayMessages"
      ) {
        voteButton.setAttribute("onclick", "");
      }
    }
  }
}

function setPlayers(players, cycle, phase, isDead, socketRole, proxyID) {
  console.log("Setting players");
  var playersContainer = document.getElementById("game-players-container");
  var slots = playersContainer.children;
  var colCount = 0;
  var playerSlot = 0;
  var checkCount = 0;
  for (var i = 0; i < players.length; i++) {
    if (checkCount == 2) {
      playerSlot++;
      checkCount = 0;
    }

    var currentElement = slots[colCount].children[playerSlot];

    currentElement.classList.remove("game-player-hidden");
    // ID
    currentElement.id = players[i].userID;
    // NAME
    var element = currentElement.children[0];
    var buttons = currentElement.children[1];
    var abilityButton = buttons.children[0];
    var stateButton = buttons.children[1];
    var voteButton = buttons.children[2];
    element.children[1].innerText = players[i].userName;

    element.classList.remove(
      "game-player-selection-ability",
      "game-player-selection-vote",
      "game-player-selection-both"
    );
    abilityButton.classList.remove("game-button-ability-norounding");
    voteButton.classList.remove("game-button-vote-norounding");

    if (players[i].userID == proxyID) {
      currentElement.style.fontWeight = 700;
      if (cycle.includes("Night")) {
        // Dead
        if (players[i].type.includes("dead")) {
          abilityButton.setAttribute("onclick", "");
          voteButton.setAttribute("onclick", "");
          abilityButton.style.display = "none";
          voteButton.style.display = "none";
          stateButton.style.display = "flex";
          stateButton.classList.add("game-button-dead");
          stateButton.classList.remove("game-button-unselectable");
          stateButton.innerText = "dead";
          // if dead
          if (players[i].type == "evil") {
            // dead evil
            currentElement.classList.add(
              "game-player-evil",
              "game-player-dead"
            );
            element.classList.add("game-player-dead");
            element.classList.remove("game-player-unselectable");
          } else {
            // dead everyone else
            currentElement.classList.add("game-player-dead");
            currentElement.classList.remove("game-player-evil");
            element.classList.add("game-player-dead");
            element.classList.remove("game-player-unselectable");
          }
        } else {
          // not dead

          // ! FIX THIS (self, surgeon, doctor)
          element.classList.remove("game-player-dead");
          currentElement.classList.remove("game-player-dead");

          if (socketRole.type.includes("surgeon")) {
            if (players[i].type == "evil+unselectable") {
              currentElement.classList.add("game-player-evil");
              element.classList.add("game-player-unselectable");
              abilityButton.setAttribute("onclick", "");
              voteButton.setAttribute("onclick", "");
              abilityButton.style.display = "none";
              voteButton.style.display = "none";
              stateButton.style.display = "flex";
              stateButton.classList.remove("game-button-dead");
              stateButton.classList.add("game-button-unselectable");
              stateButton.innerText = "unselectable";
            } else if (players[i].type == "evil") {
              currentElement.classList.add("game-player-evil");
              element.classList.remove("game-player-unselectable");
              abilityButton.setAttribute("onclick", "actionHandler(this)");
              voteButton.setAttribute("onclick", "");
              abilityButton.style.display = "flex";
              voteButton.style.display = "none";
              stateButton.style.display = "none";
              stateButton.classList.remove("game-button-dead");
              stateButton.classList.remove("game-button-unselectable");
            }
          } else if (socketRole.type.includes("doctor")) {
            if (players[i].type == "unselectable") {
              element.classList.add("game-player-unselectable");
              abilityButton.setAttribute("onclick", "");
              voteButton.setAttribute("onclick", "");
              abilityButton.style.display = "none";
              voteButton.style.display = "none";
              stateButton.style.display = "flex";
              stateButton.classList.remove("game-button-dead");
              stateButton.classList.add("game-button-unselectable");
              stateButton.innerText = "unselectable";
            } else if (players[i].type == "none") {
              element.classList.remove("game-player-unselectable");
              abilityButton.setAttribute("onclick", "actionHandler(this)");
              voteButton.setAttribute("onclick", "");
              abilityButton.style.display = "flex";
              voteButton.style.display = "none";
              stateButton.style.display = "none";
              stateButton.classList.remove("game-button-dead");
              stateButton.classList.remove("game-button-unselectable");
            }
          } else {
            // NOT SPECIAL roles
            // Evil, None
            if (players[i].type == "evil+unselectable") {
              currentElement.classList.add("game-player-evil");
              element.classList.add("game-player-unselectable");
              abilityButton.setAttribute("onclick", "");
              voteButton.setAttribute("onclick", "");
              abilityButton.style.display = "none";
              voteButton.style.display = "none";
              stateButton.style.display = "flex";
              stateButton.classList.remove("game-button-dead");
              stateButton.classList.add("game-button-unselectable");
              stateButton.innerText = "unselectable";
            } else if (players[i].type == "evil") {
              currentElement.classList.add("game-player-evil");
              element.classList.remove("game-player-unselectable");
              abilityButton.setAttribute("onclick", "");
              voteButton.setAttribute("onclick", "");
              abilityButton.style.display = "none";
              voteButton.style.display = "none";
              stateButton.style.display = "flex";
              stateButton.classList.remove("game-button-dead");
              stateButton.classList.add("game-button-unselectable");
              stateButton.innerText = "unselectable";
            } else if (players[i].type == "unselectable") {
              currentElement.classList.remove("game-player-evil");
              element.classList.add("game-player-unselectable");
              abilityButton.setAttribute("onclick", "");
              voteButton.setAttribute("onclick", "");
              abilityButton.style.display = "none";
              voteButton.style.display = "none";
              stateButton.style.display = "flex";
              stateButton.classList.remove("game-button-dead");
              stateButton.classList.add("game-button-unselectable");
              stateButton.innerText = "unselectable";
            } else if (players[i].type == "none") {
              currentElement.classList.remove("game-player-evil");
              element.classList.add("game-player-unselectable");
              abilityButton.setAttribute("onclick", "");
              voteButton.setAttribute("onclick", "");
              abilityButton.style.display = "none";
              voteButton.style.display = "none";
              stateButton.style.display = "flex";
              stateButton.classList.remove("game-button-dead");
              stateButton.classList.add("game-button-unselectable");
              stateButton.innerText = "unselectable";
            }
          }
        }
      } else if (cycle.includes("Day")) {
        // Dead
        if (players[i].type.includes("dead")) {
          abilityButton.setAttribute("onclick", "");
          voteButton.setAttribute("onclick", "");
          abilityButton.style.display = "none";
          voteButton.style.display = "none";
          stateButton.style.display = "flex";
          stateButton.classList.add("game-button-dead");
          stateButton.classList.remove("game-button-unselectable");
          stateButton.innerText = "dead";
          // if dead
          if (players[i].type == "evil") {
            // dead evil
            currentElement.classList.add(
              "game-player-evil",
              "game-player-dead"
            );
            element.classList.add("game-player-dead");
            element.classList.remove("game-player-unselectable");
          } else {
            // dead everyone else
            currentElement.classList.add("game-player-dead");
            currentElement.classList.remove("game-player-evil");
            element.classList.add("game-player-dead");
            element.classList.remove("game-player-unselectable");
          }
        } else {
          abilityButton.setAttribute("onclick", "");
          voteButton.setAttribute("onclick", "actionHandler(this)");
          abilityButton.style.display = "none";
          voteButton.style.display = "flex";
          stateButton.style.display = "none";
          stateButton.classList.remove("game-button-dead");
          stateButton.classList.remove("game-button-unselectable");
          // not dead
          element.classList.remove("game-player-dead");
          currentElement.classList.remove("game-player-dead");
          // Evil (variations), None
          if (players[i].type == "evil") {
            currentElement.classList.add("game-player-evil");
            element.classList.remove("game-player-unselectable");
          } else if (players[i].type == "none") {
            currentElement.classList.remove("game-player-evil");
            element.classList.remove("game-player-unselectable");
          }
        }
      }
    } else {
      // EVERYONE
      currentElement.style.fontWeight = 400;
      if (isDead) {
          if (players[i].type.includes("dead")) {
            abilityButton.setAttribute("onclick", "");
            voteButton.setAttribute("onclick", "");
            abilityButton.style.display = "none";
            voteButton.style.display = "none";
            stateButton.style.display = "flex";
            stateButton.classList.add("game-button-dead");
            stateButton.classList.remove("game-button-unselectable");
            stateButton.innerText = "dead";
            // if dead
            if (players[i].type == "evil") {
              // dead evil
              currentElement.classList.add(
                "game-player-evil",
                "game-player-dead"
              );
              element.classList.add("game-player-dead");
              element.classList.remove("game-player-unselectable");
            } else {
              // dead everyone else
              currentElement.classList.add("game-player-dead");
              currentElement.classList.remove("game-player-evil");
              element.classList.add("game-player-dead");
              element.classList.remove("game-player-unselectable");
            }
          } else {
            abilityButton.setAttribute("onclick", "");
            voteButton.setAttribute("onclick", "");
            abilityButton.style.display = "none";
            voteButton.style.display = "none";
            stateButton.style.display = "flex";
            stateButton.classList.remove("game-button-dead");
            stateButton.classList.add("game-button-unselectable");
            stateButton.innerText = "unselectable";
            element.classList.add("game-player-unselectable");
          }
      } else {
        if (cycle.includes("Night")) {
          // Dead
          if (players[i].type.includes("dead")) {
            abilityButton.setAttribute("onclick", "");
            voteButton.setAttribute("onclick", "");
            abilityButton.style.display = "none";
            voteButton.style.display = "none";
            stateButton.style.display = "flex";
            stateButton.classList.add("game-button-dead");
            stateButton.classList.remove("game-button-unselectable");
            stateButton.innerText = "dead";
            // if dead
            if (players[i].type == "evil") {
              // dead evil
              currentElement.classList.add(
                "game-player-evil",
                "game-player-dead"
              );
              element.classList.add("game-player-dead");
              element.classList.remove("game-player-unselectable");
            } else {
              // dead everyone else
              currentElement.classList.add("game-player-dead");
              currentElement.classList.remove("game-player-evil");
              element.classList.add("game-player-dead");
              element.classList.remove("game-player-unselectable");
            }
          } else {
            // ! FIX THIS (everyone, night)

            if (socketRole.hasNightAbility) {
              if (socketRole.team == "evil") {
                if (socketRole.type.includes("surgeon")) {
                  if (players[i].type == "evil") {
                    currentElement.classList.add("game-player-evil");
                    element.classList.remove("game-player-unselectable");
                    abilityButton.setAttribute(
                      "onclick",
                      "actionHandler(this)"
                    );
                    voteButton.setAttribute("onclick", "");
                    abilityButton.style.display = "flex";
                    voteButton.style.display = "none";
                    stateButton.style.display = "none";
                    stateButton.classList.remove("game-button-dead");
                    stateButton.classList.remove("game-button-unselectable");
                  } else if (players[i].type == "evil+unselectable") {
                    currentElement.classList.add("game-player-evil");
                    element.classList.add("game-player-unselectable");
                    abilityButton.setAttribute("onclick", "");
                    voteButton.setAttribute("onclick", "");
                    abilityButton.style.display = "none";
                    voteButton.style.display = "none";
                    stateButton.style.display = "flex";
                    stateButton.classList.remove("game-button-dead");
                    stateButton.classList.add("game-button-unselectable");
                    stateButton.innerText = "unselectable";
                  } else {
                    currentElement.classList.remove("game-player-evil");
                    element.classList.remove("game-player-unselectable");
                    abilityButton.setAttribute("onclick", "");
                    voteButton.setAttribute("onclick", "actionHandler(this)");
                    abilityButton.style.display = "none";
                    voteButton.style.display = "flex";
                    stateButton.style.display = "none";
                    stateButton.classList.remove("game-button-dead");
                    stateButton.classList.remove("game-button-unselectable");
                  }
                }
                if (socketRole.type.includes("witch")) {
                  if (players[i].type == "evil+unselectable") {
                    currentElement.classList.add("game-player-evil");
                    element.classList.add("game-player-unselectable");
                    abilityButton.setAttribute("onclick", "");
                    voteButton.setAttribute("onclick", "");
                    abilityButton.style.display = "none";
                    voteButton.style.display = "none";
                    stateButton.style.display = "flex";
                    stateButton.classList.remove("game-button-dead");
                    stateButton.classList.add("game-button-unselectable");
                    stateButton.innerText = "unselectable";
                  } else {
                    currentElement.classList.remove("game-player-evil");
                    element.classList.remove("game-player-unselectable");
                    abilityButton.setAttribute(
                      "onclick",
                      "actionHandler(this)"
                    );
                    voteButton.setAttribute("onclick", "actionHandler(this)");
                    abilityButton.style.display = "flex";
                    voteButton.style.display = "flex";
                    abilityButton.classList.add(
                      "game-button-ability-norounding"
                    );
                    voteButton.classList.add("game-button-vote-norounding");
                    stateButton.style.display = "none";
                    stateButton.classList.remove("game-button-dead");
                    stateButton.classList.remove("game-button-unselectable");
                  }
                }
                if (socketRole.type.includes("framer")) {
                  if (players[i].type == "evil+unselectable") {
                    currentElement.classList.add("game-player-evil");
                    element.classList.add("game-player-unselectable");
                    abilityButton.setAttribute("onclick", "");
                    voteButton.setAttribute("onclick", "");
                    abilityButton.style.display = "none";
                    voteButton.style.display = "none";
                    stateButton.style.display = "flex";
                    stateButton.classList.remove("game-button-dead");
                    stateButton.classList.add("game-button-unselectable");
                    stateButton.innerText = "unselectable";
                  } else {
                    currentElement.classList.remove("game-player-evil");
                    element.classList.remove("game-player-unselectable");
                    abilityButton.setAttribute(
                      "onclick",
                      "actionHandler(this)"
                    );
                    voteButton.setAttribute("onclick", "actionHandler(this)");
                    abilityButton.style.display = "flex";
                    voteButton.style.display = "flex";
                    abilityButton.classList.add(
                      "game-button-ability-norounding"
                    );
                    voteButton.classList.add("game-button-vote-norounding");
                    stateButton.style.display = "none";
                    stateButton.classList.remove("game-button-dead");
                    stateButton.classList.remove("game-button-unselectable");
                  }
                }
              } else {
                abilityButton.setAttribute("onclick", "actionHandler(this)");
                voteButton.setAttribute("onclick", "");
                abilityButton.style.display = "flex";
                voteButton.style.display = "none";
                stateButton.style.display = "none";
                stateButton.classList.remove("game-button-dead");
                stateButton.classList.remove("game-button-unselectable");
              }
            } else {
              if (socketRole.team == "evil") {
                if (players[i].type == "evil+unselectable") {
                  currentElement.classList.add("game-player-evil");
                  element.classList.add("game-player-unselectable");
                  abilityButton.setAttribute("onclick", "");
                  voteButton.setAttribute("onclick", "");
                  abilityButton.style.display = "none";
                  voteButton.style.display = "none";
                  stateButton.style.display = "flex";
                  stateButton.classList.remove("game-button-dead");
                  stateButton.classList.add("game-button-unselectable");
                  stateButton.innerText = "unselectable";
                } else if (players[i].type == "none") {
                  currentElement.classList.remove("game-player-evil");
                  element.classList.remove("game-player-unselectable");
                  abilityButton.setAttribute("onclick", "");
                  voteButton.setAttribute("onclick", "actionHandler(this)");
                  abilityButton.style.display = "none";
                  voteButton.style.display = "flex";
                  stateButton.style.display = "none";
                  stateButton.classList.remove("game-button-dead");
                  stateButton.classList.remove("game-button-unselectable");
                }
              } else {
                element.classList.add("game-player-unselectable");
                abilityButton.setAttribute("onclick", "");
                voteButton.setAttribute("onclick", "");
                abilityButton.style.display = "none";
                voteButton.style.display = "none";
                stateButton.style.display = "flex";
                stateButton.classList.remove("game-button-dead");
                stateButton.classList.add("game-button-unselectable");
                stateButton.innerText = "unselectable";
              }
            }

            // not dead
            // ! THIS MAY NEED A FIX
            element.classList.remove("game-player-dead");
            currentElement.classList.remove("game-player-dead");
            // Client, Target, Evil (variations), None
            if (players[i].type.includes("client")) {
              element.children[0].id = "game-show-mark";
              element.children[0].src = "/assets/icons/briefcase.svg";
            } else if (players[i].type.includes("target")) {
              element.children[0].id = "game-show-mark";
              element.children[0].src = "/assets/icons/target.svg";
            }
          }
        } else if (cycle.includes("Day")) {
          // Dead
          if (players[i].type.includes("dead")) {
            abilityButton.setAttribute("onclick", "");
            voteButton.setAttribute("onclick", "");
            abilityButton.style.display = "none";
            voteButton.style.display = "none";
            stateButton.style.display = "flex";
            stateButton.classList.add("game-button-dead");
            stateButton.classList.remove("game-button-unselectable");
            stateButton.innerText = "dead";
            // if dead
            if (players[i].type == "evil") {
              // dead evil
              currentElement.classList.add(
                "game-player-evil",
                "game-player-dead"
              );
              element.classList.add("game-player-dead");
              element.classList.remove("game-player-unselectable");
            } else {
              // dead everyone else
              currentElement.classList.add("game-player-dead");
              currentElement.classList.remove("game-player-evil");
              element.classList.add("game-player-dead");
              element.classList.remove("game-player-unselectable");
            }
          } else {
            abilityButton.setAttribute("onclick", "");
            voteButton.setAttribute("onclick", "actionHandler(this)");
            abilityButton.style.display = "none";
            voteButton.style.display = "flex";
            stateButton.style.display = "none";
            stateButton.classList.remove("game-button-dead");
            stateButton.classList.remove("game-button-unselectable");
            // not dead
            element.classList.remove("game-player-dead");
            currentElement.classList.remove("game-player-dead");
            element.classList.remove("game-player-unselectable");
            // Client, Target, Evil (variations), None
            if (players[i].type.includes("client")) {
              element.children[0].id = "game-show-mark";
              element.children[0].src = "/assets/icons/briefcase.svg";
            } else if (players[i].type.includes("target")) {
              element.children[0].id = "game-show-mark";
              element.children[0].src = "/assets/icons/target.svg";
            } else if (players[i].type == "evil") {
              currentElement.classList.add("game-player-evil");
              element.classList.remove("game-player-unselectable");
            } else if (players[i].type == "none") {
              currentElement.classList.remove("game-player-evil");
              element.classList.remove("game-player-unselectable");
            }
          }
        }
      }
    }
    if (colCount == 0) {
      checkCount++;
      colCount = 1;
    } else if (colCount == 1) {
      checkCount++;
      colCount = 0;
    }
  }
}

socket.on("fetchedPlayerCardPress", (name, team, mission) => {
  var playerIcon = document.getElementById("game-player-card-icon");
  var playerRole = document.getElementById("game-player-card-role");
  var playerMission = document.getElementById("game-player-card-mission");
  var playerTeam = team.charAt(0).toUpperCase() + team.slice(1);
  playerIcon.src = "/assets/rolecards/" + name + ".svg";
  playerRole.innerText = name + ` (${playerTeam})`;
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
    var readyButton = document.getElementsByClassName("game-ready-button")[0];
    var icon = document.getElementsByClassName("game-rolecard-icon")[0];
    icon.src = "/assets/rolecards/" + name + "_bordered.svg";

    if (team.includes("good")) {
      roleCardTitle.classList.add("game-rolecard-good-fg");
      roleCardMission.classList.add("game-rolecard-good-fg");
      readyButton.classList.add("game-rolecard-good-bg");
    } else if (team == "evil") {
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
  var scrollDown = document.getElementById("game-messagebox-scrolldown");

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
    scrollDown.classList.remove("game-day-fg");
    scrollDown.classList.add("game-night-fg");
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
    scrollDown.classList.add("game-day-fg");
    scrollDown.classList.remove("game-night-fg");
  }
}

function checkIfDead(phase, isDead) {
  var playersContainer = document.getElementById("game-players-container");
  if (isDead) {
    var body = document.getElementById("game-body");
    body.classList.add("game-background-dead");
    playersContainer.style.opacity = "35%";
  } else if (!isDead) {
    if (phase == "voting" || phase == "actions") {
      playersContainer.style.opacity = "100%";
    } else if (
      phase == "nightMessages" ||
      phase == "discussion" ||
      phase == "recap" ||
      phase == "dayMessages"
    ) {
      playersContainer.style.opacity = "35%";
    }
    var body = document.getElementById("game-body");
    body.classList.remove("game-background-dead");
  }
}

socket.on("changeUI", (theme) => {
  changeUI(theme);
  socket.emit("checkIfDead", getPlayerID(), "clock");
  socket.on("isPlayerDeadClock", (phase, isDead) => {
    checkIfDead(phase, isDead);
  });
});

function showGame(allReady) {
  if (allReady) {
    showGameUI(true);
    showRoleCard(false);
    showWaiting(false);

    socket.emit("initGame", getPlayerID());
    socket.emit("requestPlayerCard", getPlayerID(), "first");
    socket.on("fetchedPlayerCardFirst", (name, team, mission) => {
      var playerIcon = document.getElementById("game-player-card-icon");
      var playerRole = document.getElementById("game-player-card-role");
      var playerMission = document.getElementById("game-player-card-mission");
      var playerTeam = team.charAt(0).toUpperCase() + team.slice(1);
      playerIcon.src = "/assets/rolecards/" + name + ".svg";
      playerRole.innerText = name + ` (${playerTeam})`;
      playerMission.innerText = mission;
    });
    socket.emit("setPlayers", getPlayerID(), "first");
    socket.on(
      "setPlayersFirst",
      (players, cycle, phase, isDead, socketRole, proxyID) => {
        setPlayers(players, cycle, phase, isDead, socketRole, proxyID);
      }
    );

    socket.emit("setActionsOnPhase", getPlayerID(), "first");
    socket.on("removeActionsOnPhaseFirst", (phase) => {
      removeActionsOnPhase(phase);
    });
    socket.emit("setEvilRoom", getPlayerID());
    socket.emit("updateUI", getPlayerID());

  }
}

socket.on("showGameFirst", (allReady) => {
  showGame(allReady);
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
