const domain = "https://eyesopen.ml/";
const socket = io(domain, {secure: true});

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

function pauseAudio(toPause) {
  var audio = document.getElementById(toPause);
  var pausePromise = audio.pause();
  if (pausePromise !== undefined) {
    pausePromise.then(_ => {
    })
    .catch(error => {
    });
  }
}
function playMusic(toPlay, vol=1, wait=false) {
  if (musicToggle) {
    playAudio(toPlay, vol, wait);
  }
}
function playSFX(toPlay, vol=1, wait=false) {
  if (audioToggle) {
    playAudio(toPlay, vol, wait);
  }
}
function playAudio(toPlay, vol=1, wait=false) {
  var audio = document.getElementById(toPlay);
  audio.volume = vol;
  if (!wait) {
    var playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.then(_ => {
      })
      .catch(error => {
      });
    }
  } else {
    if (audio.paused) {
      var playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.then(_ => {
        })
        .catch(error => {
        });
      }
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
      var URL = "";
      var room = "";
      if (window.location.href.endsWith("/game")) {
        URL = window.location.href.replace("http://", "");
        room = URL.split("/")[URL.split("/").length - 2];
      }
      socket.emit("setRoom", getPlayerID());
      socket.emit("checkUserApartOfGame", getPlayerID(), room, "app");

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
            (players, cycle, phase, isDead, socketPlayer, socketRole, proxyID) => {
              setPlayers(players, cycle, phase, isDead, socketPlayer, socketRole, proxyID);
            }
          );
          socket.emit("checkIfDead", getPlayerID(), "refresh");
          socket.on("isPlayerDeadRefresh", (phase, isDead) => {
            checkIfDead(phase, isDead);
          });

          socket.emit("endGameRefresh", getPlayerID());
          socket.on("endGameRefreshed", (win, winType, lawyerWin, winners) => {
            console.log("ending game");
            socket.emit("requestProxy", getPlayerID(), "app");
            socket.on("fetchedProxyApp", (proxyID) => {
              endGame(proxyID, win, winType, lawyerWin, winners);
            });
          });

          socket.emit("fetchMessages", getPlayerID());
          socket.on("savedMessages", (messages, cycle) => {
            loadSavedMessages(messages, cycle);
          });
          socket.emit("fetchCemetery", getPlayerID());
          socket.on("savedCemetery", (burried) => {
            loadCemetery(burried);
          });

          addEventListeners();
        } else if (
          (apartOfGame == false && inProgress == true) ||
          (apartOfGame == false && inProgress == false)
        ) {
          if (window.location.href.endsWith("/game")) {
            URL = window.location.href.replace("http://", "");
            room = URL.split("/")[URL.split("/").length - 2];
            socket.emit("directJoin", getPlayerID(), code, "app");
            window.location.href = lobby + room;
          }
        }
      });
    }
  });
});

function addEventListeners() {
  document.addEventListener("visibilitychange", (e) => {
    if (document.visibilityState === 'visible') {
    } else {
      pauseAll();
    }
  });
}

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

socket.on("returnToLobby", () => {
  returnToLobby();
});

function showLeave() {
  var leavePopup = document.getElementById("leave");
  var leaveOverlay = document.getElementById("overlay-leave");
  leavePopup.style.display = "flex";
  leaveOverlay.style.display = "flex";
  playSFX("popAudio", 0.25);
}

function hideLeave() {
  var leavePopup = document.getElementById("leave");
  var leaveOverlay = document.getElementById("overlay-leave");
  leavePopup.style.display = "none";
  leaveOverlay.style.display = "none";
  playSFX("popAudio", 0.25);
}

function leaveGame() {
  socket.emit("leaveGame", getPlayerID());
  playSFX("popAudio", 0.25);
}

function returnToLobby() {
  if (window.location.href.endsWith("/game")) {
    var URL = window.location.href.replace("http://", "");
    var room = URL.split("/")[URL.split("/").length - 2];
    window.location.href = lobby + room;
  }
}

socket.on("endGame", (win, winType, lawyerWin, winners) => {
  console.log("ending game");
  socket.emit("requestProxy", getPlayerID(), "app");
  socket.on("fetchedProxyApp", (proxyID) => {
    endGame(proxyID, win, winType, lawyerWin, winners);
  });
});

function endGame(proxyID, win, winType, lawyerWin, winners) {
  var theState = document.getElementById("winState");
  var theWinningMessage = document.getElementById("winningMessage");
  var theWinners = document.getElementById("winners");
  // Clear winners so the string doesn't get duplicates
  theWinners.innerText = "";
  var victory = false;
  var listOfWinners = "";
  var seen = [];
  if (win) {
    for (var i = 0; i < winners.length; i++) {
      if (!seen.includes(winners[i].theID)) {
        if (winners[i].theID == proxyID) {
          victory = true;
        }
        listOfWinners += winners[i].theName + ", ";
        seen.push(winners[i].theID)
      }
    }

    // Remove last comma with whitespace
    listOfWinners = listOfWinners.substring(0, listOfWinners.length - 2);
    var state = "";
    var winningMessage = "";
    if (winType !== "timeout" && winType !== "draw") {
      // VICTORY AND DEFEAT
      if (victory) {
        state = "VICTORY";
        playSFX("victoryAudio");
        // display victory
      } else {
        state = "DEFEAT";
        playSFX("defeatAudio");
        // display defeat
      }

      if (winType == "good") {
        winningMessage = "Good team wins";
      } else if (winType == "evil") {
        if (lawyerWin) {
          winningMessage = "Evil team + Lawyer wins";
        } else {
          winningMessage = "Evil team wins";
        }
      } else if (winType == "neutral") {
        winningMessage = "Neutral roles wins";
      } else if (winType == "jester") {
        if (lawyerWin) {
          winningMessage = "Jester + Lawyer wins";
        } else {
          winningMessage = "Jester wins";
        }
      } else if (winType == "serial killer") {
        if (lawyerWin) {
          winningMessage = "Serial Killer + Lawyer wins";
        } else {
          winningMessage = "Serial Killer wins";
        }
      } else if (winType == "executioner") {
        if (lawyerWin) {
          winningMessage = "Executioner + Lawyer wins";
        } else {
          winningMessage = "Executioner wins";
        }
      }
    } else if (winType == "timeout" && winType !== "draw") {
      // display timeout
      state = "TIMEOUT";
    } else if (winType !== "timeout" && winType == "draw") {
      // display draw
      state = "DRAW";
    }

    if (winType == "good") {
      theWinningMessage.style.color = "var(--good-bg-selected)";
    } else if (winType == "evil") {
      theWinningMessage.style.color = "var(--evil-bg-selected)";
    } else if (winType == "neutral") {
      theWinningMessage.style.color = "var(--neutral-bg-selected)";
    } else {
      theWinningMessage.style.color = "var(--dark-fg)";
    }
    theState.innerText = state;
    theWinningMessage.innerText = winningMessage;
    theWinners.innerText = listOfWinners;
    var popupWin = document.getElementById("win");
    var overlayWin = document.getElementById("overlay-win");
    if (winType == "timeout" || winType == "draw") {
      theState.style.display = "flex";
      theWinningMessage.style.display = "none";
      theWinners.style.display = "none";
    } else {
      theState.style.display = "flex";
      theWinningMessage.style.display = "flex";
      theWinners.style.display = "flex";
    }
    popupWin.style.display = "flex";
    overlayWin.style.display = "flex";
  } else {
    var popupWin = document.getElementById("win");
    var overlayWin = document.getElementById("overlay-win");
    theState.style.display = "none";
    theWinningMessage.style.display = "none";
    theWinners.style.display = "none";
    popupWin.style.display = "none";
    overlayWin.style.display = "none";
  }
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
  playSFX("dealCardAudio", 0.35);
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
  playSFX("popAudio", 0.25);
}

// Remove top margin from the first message recieved
var firstMessageRecieved = false;
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
    if (cycle.includes("Day")) {
      newMessage.classList.add(messageType + "-day");
      newMessage.classList.remove(messageType + "-night");
    } else if (cycle.includes("Night")) {
      newMessage.classList.remove(messageType + "-day");
      newMessage.classList.add(messageType + "-night");
    }
  } else if (type.includes("info")) {
    messageType += "info";
    newMessage.classList.add(messageType);
    if (cycle.includes("Day")) {
      newMessage.classList.add(messageType + "-day");
      newMessage.classList.remove(messageType + "-night");
    } else if (cycle.includes("Night")) {
      newMessage.classList.remove(messageType + "-day");
      newMessage.classList.add(messageType + "-night");
    }
  } else if (type.includes("alert")) {
    messageType += "alert";
    newMessage.classList.add(messageType);
    if (cycle.includes("Day")) {
      newMessage.classList.add(messageType + "-day");
      newMessage.classList.remove(messageType + "-night");
    } else if (cycle.includes("Night")) {
      newMessage.classList.remove(messageType + "-day");
      newMessage.classList.add(messageType + "-night");
    }
  } else if (type.includes("important")) {
    messageType += "important";
    newMessage.classList.add(messageType);
    if (cycle.includes("Day")) {
      newMessage.classList.add(messageType + "-day");
      newMessage.classList.remove(messageType + "-night");
    } else if (cycle.includes("Night")) {
      newMessage.classList.remove(messageType + "-day");
      newMessage.classList.add(messageType + "-night");
    }
  } else if (type.includes("extra")) {
    messageType += "extra";
    newMessage.classList.add(messageType);
    if (cycle.includes("Day")) {
      newMessage.classList.add(messageType + "-day");
      newMessage.classList.remove(messageType + "-night");
    } else if (cycle.includes("Night")) {
      newMessage.classList.remove(messageType + "-day");
      newMessage.classList.add(messageType + "-night");
    }
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
    newMessage.style.marginTop = "1rem";
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

  // Set margin top to be 0 for the first message
  if (!firstMessageRecieved) {
    newMessage.style.marginTop = "0";
    firstMessageRecieved = true;
  }

  newMessage.innerText = message;
  messages.appendChild(newMessage);
  if (!manualScroll) {
    messages.scrollTop = messages.scrollHeight;
  }
  playSFX("messageAudio", 0.75);
});

socket.on("cemetery", (burried) => {
  loadCemetery(burried);
  playSFX("deathAudio");
});

function loadCemetery(burried) {
  var deceasedElement = document.getElementById("game-deceased");
  var deceasedList = deceasedElement.children;

  for (var i = 0; i < burried.length; i++) {
    if (burried[i].burriedPlayerRole == "") {
      deceasedList[
        i
      ].innerText = `${burried[i].burriedPlayerName}`;
    } else {
      deceasedList[
        i
      ].innerText = `${burried[i].burriedPlayerName} (${burried[i].burriedPlayerRole})`;
    }
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
      if (cycle.includes("Day")) {
        newMessage.classList.add(messageType + "-day");
        newMessage.classList.remove(messageType + "-night");
      } else if (cycle.includes("Night")) {
        newMessage.classList.remove(messageType + "-day");
        newMessage.classList.add(messageType + "-night");
      }
    } else if (messages[i].type.includes("info")) {
      messageType += "info";
      newMessage.classList.add(messageType);
      if (cycle.includes("Day")) {
        newMessage.classList.add(messageType + "-day");
        newMessage.classList.remove(messageType + "-night");
      } else if (cycle.includes("Night")) {
        newMessage.classList.remove(messageType + "-day");
        newMessage.classList.add(messageType + "-night");
      }
    } else if (messages[i].type.includes("alert")) {
      messageType += "alert";
      newMessage.classList.add(messageType);
      if (cycle.includes("Day")) {
        newMessage.classList.add(messageType + "-day");
        newMessage.classList.remove(messageType + "-night");
      } else if (cycle.includes("Night")) {
        newMessage.classList.remove(messageType + "-day");
        newMessage.classList.add(messageType + "-night");
      }
    } else if (messages[i].type.includes("important")) {
      messageType += "important";
      newMessage.classList.add(messageType);
      if (cycle.includes("Day")) {
        newMessage.classList.add(messageType + "-day");
        newMessage.classList.remove(messageType + "-night");
      } else if (cycle.includes("Night")) {
        newMessage.classList.remove(messageType + "-day");
        newMessage.classList.add(messageType + "-night");
      }
    } else if (messages[i].type.includes("extra")) {
      messageType += "extra";
      newMessage.classList.add(messageType);
      if (cycle.includes("Day")) {
        newMessage.classList.add(messageType + "-day");
        newMessage.classList.remove(messageType + "-night");
      } else if (cycle.includes("Night")) {
        newMessage.classList.remove(messageType + "-day");
        newMessage.classList.add(messageType + "-night");
      }
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
      newMessage.style.marginTop = "1rem";
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

    // Remove top margin from the first message
    if (i == 0) {
      newMessage.style.marginTop = "0";
    }

    newMessage.innerText = messages[i].message;
    messageScroller.appendChild(newMessage);
    messageScroller.scrollTop = messageScroller.scrollHeight;
  }
}

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
  console.log("player target handler")
  var allPlayers = document.getElementById("game-players-container").children;

  var players = Array.from(allPlayers[0].children).concat(
    Array.from(allPlayers[1].children)
  );
  for (var i = 0; i < players.length; i++) {

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
      playerElement.classList.remove("game-player-selection-ability");
      nameContainer.classList.remove("game-player-selection-vote");
      abilityButton.innerText = "ability";
      abilityButton.style.fontWeight = "400";
      voteButton.style.fontWeight = "700";
      voteButton.innerText = "undo";
    } else if (players[i].id !== socketPlayer.voteTarget) {
      nameContainer.classList.remove("game-player-selection-vote");
      playerElement.classList.remove("game-player-selection-ability");
      abilityButton.innerText = "undo";
      abilityButton.style.fontWeight = "700";
      voteButton.style.fontWeight = "400";
      voteButton.innerText = "vote";
    }

    if (
      players[i].id == socketPlayer.abilityTarget &&
      players[i].id == socketPlayer.voteTarget
    ) {
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
function actionHandler(element, skip=false) {
  if (!skip) {
    var button = element;
    var buttonsContainer = element.parentElement;
    var playerElement = buttonsContainer.parentElement;
    var playerNameContainer = playerElement.children[0];
    var playerName = playerNameContainer.children[1];
    console.log("action", button.innerText, "taken on", playerName.innerText);
    if (!button.id.includes("game-button-state")) {
      socket.emit("playerAction", getPlayerID(), element.id, playerElement.id);
    }
  } else if (skip) {
    if (element.parentElement.classList.contains("game-skip-button-container")) {
      socket.emit("playerAction", getPlayerID(), "skip", "skip");
    }
  }
  
  

}

socket.on("updateSetPlayers", () => {
  updateSetPlayers();
  
});

function fetchCurrentPlayerTargets() {
  socket.emit("fetchCurrentPlayerTargets", getPlayerID());
  socket.on("fetchedCurrentPlayerTargets", (theAbilityTarget, theVoteTarget, socketPlayer) => {
    playerTargetHandler(theAbilityTarget, theVoteTarget, socketPlayer);
  })
}

function updateSetPlayers() {
  socket.emit("setPlayers", getPlayerID(), "clock");
}

socket.on(
  "setPlayersClock",
  (players, cycle, phase, isDead, socketPlayer, socketRole, proxyID) => {
    setPlayers(players, cycle, phase, isDead, socketPlayer, socketRole, proxyID);
    // fetchCurrentPlayerTargets();
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

function setPlayers(players, cycle, phase, isDead, socketPlayer, socketRole, proxyID) {
  console.log("Setting players");
  var playersContainer = document.getElementById("game-players-container");
  var slots = playersContainer.children;
  var colCount = 0;
  var playerSlot = 0;
  var checkCount = 0;

  for (var theCol = 0; theCol < slots.length; theCol++) {
    var thePlayers = slots[theCol].children;
    for (var playerDiv = 0; playerDiv < thePlayers.length; playerDiv++) {
      let playerElement = thePlayers[playerDiv];
      playerElement.classList.add("game-player-hidden");
    }
  }
  var skipButton = document.getElementById("game-skip-button");
  var skipButtonContainer = skipButton.parentElement;
  if (cycle == "Day" && phase == "voting") {
    skipButtonContainer.style.display = "flex";
    skipButtonContainer.id = "skip";
    skipButton.setAttribute("onclick", "actionHandler(this, true)")
  } else {
    skipButtonContainer.style.display = "none";
    skipButtonContainer.id = "";
    skipButton.setAttribute("onclick", "")
  }
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
    element.children[2].innerText = players[i].userName;

    if (players[i].userID !== socketPlayer.abilityTarget && players[i].userID !== socketPlayer.voteTarget) {
      currentElement.classList.remove("game-player-selection-ability")
      element.classList.remove("game-player-selection-vote");
    } else if (players[i].userID == socketPlayer.abilityTarget && players[i].userID == socketPlayer.voteTarget) {
      currentElement.classList.add("game-player-selection-ability")
      element.classList.add("game-player-selection-vote");
    }
     else if (players[i].userID == socketPlayer.abilityTarget && players[i].userID !== socketPlayer.voteTarget) {
      currentElement.classList.add("game-player-selection-ability")
      element.classList.remove("game-player-selection-vote");
    } else if (players[i].userID !== socketPlayer.abilityTarget && players[i].userID == socketPlayer.voteTarget) {
      currentElement.classList.remove("game-player-selection-ability")
      element.classList.add("game-player-selection-vote");
    }

    abilityButton.classList.remove("game-button-ability-norounding");
    voteButton.classList.remove("game-button-vote-norounding");
    if (players[i].userID == proxyID) {
      currentElement.style.fontWeight = 800;
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
          if (players[i].type == "evil+dead") {
            // dead evil
            currentElement.classList.add(
              "game-player-evil",
              "game-player-dead"
            );
            element.classList.add("game-player-dead");
            element.classList.remove("game-player-unselectable");
          } 
          else if (players[i].type == "mayor+dead") {
            element.children[1].id = "game-show-mark";
            element.children[1].src = "/assets/icons/megaphone.svg";
            currentElement.classList.add("game-player-dead");
            currentElement.classList.remove("game-player-evil");
            element.classList.add("game-player-dead");
            element.classList.remove("game-player-unselectable");
          }  
          else {
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
          } 
          else if (socketRole.type.includes("mayor")) {
            if (players[i].type == "mayor") {
              element.classList.add("game-player-unselectable");
              abilityButton.setAttribute("onclick", "");
              voteButton.setAttribute("onclick", "");
              abilityButton.style.display = "none";
              voteButton.style.display = "none";
              stateButton.style.display = "flex";
              stateButton.classList.remove("game-button-dead");
              stateButton.classList.add("game-button-unselectable");
              stateButton.innerText = "unselectable";
              element.children[1].id = "game-show-mark";
              element.children[1].src = "/assets/icons/megaphone.svg";
            } else if (players[i].type == "none") {
              element.classList.add("game-player-unselectable");
              abilityButton.setAttribute("onclick", "");
              voteButton.setAttribute("onclick", "");
              abilityButton.style.display = "none";
              voteButton.style.display = "none";
              stateButton.style.display = "flex";
              stateButton.classList.remove("game-button-dead");
              stateButton.classList.add("game-button-unselectable");
              stateButton.innerText = "unselectable";
              element.children[0].id = "";
              element.children[0].src = "";
            }
          } 
          else {
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
          if (players[i].type == "evil+dead") {
            // dead evil
            currentElement.classList.add(
              "game-player-evil",
              "game-player-dead"
            );
            element.classList.add("game-player-dead");
            element.classList.remove("game-player-unselectable");
          } else if (players[i].type == "mayor+dead") {
            element.children[1].id = "game-show-mark";
            element.children[1].src = "/assets/icons/megaphone.svg";
            currentElement.classList.add("game-player-dead");
            currentElement.classList.remove("game-player-evil");
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
          // Evil (variations), None
          if (players[i].type == "evil") {
            currentElement.classList.add("game-player-evil");
            element.classList.remove("game-player-unselectable");
          } else if (socketRole.type.includes("mayor")) {
            if (socketRole.hasOwnProperty("hasDayAbility")) {
              if (socketRole.hasDayAbility == true) {
                if (socketRole.revealed == false) {
                  abilityButton.setAttribute("onclick", "actionHandler(this)");
                  abilityButton.style.display = "flex";
                  abilityButton.classList.add("game-button-ability-norounding");
                  voteButton.classList.add("game-button-vote-norounding");
                  element.children[1].id = "";
                  element.children[1].src = "";
                } else if (socketRole.revealed == true) {
                  abilityButton.setAttribute("onclick", "");
                  abilityButton.style.display = "none";
                  abilityButton.classList.remove(
                    "game-button-ability-norounding"
                  );
                  voteButton.classList.remove("game-button-vote-norounding");
                  element.children[1].id = "game-show-mark";
                  element.children[1].src = "/assets/icons/megaphone.svg";
                }
                element.classList.remove("game-player-unselectable");
              }
            }
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
          if (players[i].type == "evil+dead") {
            // dead evil
            currentElement.classList.add(
              "game-player-evil",
              "game-player-dead"
            );
            element.classList.add("game-player-dead");
            element.classList.remove("game-player-unselectable");
          } else if (players[i].type == "client+dead") {
            element.children[0].id = "game-show-mark";
            element.children[0].src = "/assets/icons/briefcase.svg";
            currentElement.classList.add("game-player-dead");
            currentElement.classList.remove("game-player-evil");
            element.classList.add("game-player-dead");
            element.classList.remove("game-player-unselectable");
          } else if (players[i].type == "target+dead") {
            element.children[0].id = "game-show-mark";
            element.children[0].src = "/assets/icons/target.svg";
            currentElement.classList.add("game-player-dead");
            currentElement.classList.remove("game-player-evil");
            element.classList.add("game-player-dead");
            element.classList.remove("game-player-unselectable");
          } 
          else if (players[i].type == "mayor+dead") {
            element.children[1].id = "game-show-mark";
            element.children[1].src = "/assets/icons/megaphone.svg";
            currentElement.classList.add("game-player-dead");
            currentElement.classList.remove("game-player-evil");
            element.classList.add("game-player-dead");
            element.classList.remove("game-player-unselectable");
          } 
          else if (players[i].type == "mayor+dead+target") {
            element.children[0].id = "game-show-mark";
            element.children[0].src = "/assets/icons/target.svg";
            element.children[1].id = "game-show-mark";
            element.children[1].src = "/assets/icons/megaphone.svg";
            currentElement.classList.add("game-player-dead");
            currentElement.classList.remove("game-player-evil");
            element.classList.add("game-player-dead");
            element.classList.remove("game-player-unselectable");
          } 
          else {
            // dead everyone else
            element.children[0].id = "";
            element.children[0].src = "";
            currentElement.classList.add("game-player-dead");
            currentElement.classList.remove("game-player-evil");
            element.classList.add("game-player-dead");
            element.classList.remove("game-player-unselectable");
          }
        } else {
          if (players[i].type == "evil") {
            currentElement.classList.add("game-player-evil");
          } else {
            if (players[i].type == "client") {
              element.children[0].id = "game-show-mark";
              element.children[0].src = "/assets/icons/briefcase.svg";
            } 
            else if (players[i].type == "target") {
              element.children[0].id = "game-show-mark";
              element.children[0].src = "/assets/icons/target.svg";
            } 
            else if (players[i].type == "mayor") {
              element.children[1].id = "game-show-mark";
              element.children[1].src = "/assets/icons/megaphone.svg";
            } 
            else if (players[i].type == "mayor+target") {
              element.children[0].id = "game-show-mark";
              element.children[0].src = "/assets/icons/target.svg";
              element.children[1].id = "game-show-mark";
              element.children[1].src = "/assets/icons/megaphone.svg";
            }
            currentElement.classList.remove("game-player-evil"); 
          }
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
            if (players[i].type == "evil+dead") {
              // dead evil
              currentElement.classList.add(
                "game-player-evil",
                "game-player-dead"
              );
              element.classList.add("game-player-dead");
              element.classList.remove("game-player-unselectable");
            } else if (players[i].type == "client+dead") {
              element.children[0].id = "game-show-mark";
              element.children[0].src = "/assets/icons/briefcase.svg";
              currentElement.classList.add("game-player-dead");
              currentElement.classList.remove("game-player-evil");
              element.classList.add("game-player-dead");
              element.classList.remove("game-player-unselectable");
            } else if (players[i].type == "target+dead") {
              element.children[0].id = "game-show-mark";
              element.children[0].src = "/assets/icons/target.svg";
              currentElement.classList.add("game-player-dead");
              currentElement.classList.remove("game-player-evil");
              element.classList.add("game-player-dead");
              element.classList.remove("game-player-unselectable");
            } 
            else if (players[i].type == "mayor+dead") {
              element.children[1].id = "game-show-mark";
              element.children[1].src = "/assets/icons/megaphone.svg";
              currentElement.classList.add("game-player-dead");
              currentElement.classList.remove("game-player-evil");
              element.classList.add("game-player-dead");
              element.classList.remove("game-player-unselectable");
            } 
            else if (players[i].type == "mayor+dead+target") {
              element.children[0].id = "game-show-mark";
            element.children[0].src = "/assets/icons/target.svg";
              element.children[1].id = "game-show-mark";
              element.children[1].src = "/assets/icons/megaphone.svg";
              currentElement.classList.add("game-player-dead");
              currentElement.classList.remove("game-player-evil");
              element.classList.add("game-player-dead");
              element.classList.remove("game-player-unselectable");
            } 
            else {
              // dead everyone else
              element.children[0].id = "";
              element.children[0].src = "";
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
            if (players[i].type == "client") {
              element.children[0].id = "game-show-mark";
              element.children[0].src = "/assets/icons/briefcase.svg";
            } else if (players[i].type == "target") {
              element.children[0].id = "game-show-mark";
              element.children[0].src = "/assets/icons/target.svg";
            } 
            else if (players[i].type == "mayor") {
              element.children[1].id = "game-show-mark";
              element.children[1].src = "/assets/icons/megaphone.svg";
            } 
            else if (players[i].type == "mayor+target") {
              element.children[0].id = "game-show-mark";
              element.children[0].src = "/assets/icons/target.svg";
              element.children[1].id = "game-show-mark";
              element.children[1].src = "/assets/icons/megaphone.svg";
            } 
            else {
              element.children[0].id = "";
              element.children[0].src = "";
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
            if (players[i].type == "evil+dead") {
              // dead evil
              currentElement.classList.add(
                "game-player-evil",
                "game-player-dead"
              );
              element.classList.add("game-player-dead");
              element.classList.remove("game-player-unselectable");
            } else if (players[i].type == "client+dead") {
              element.children[0].id = "game-show-mark";
              element.children[0].src = "/assets/icons/briefcase.svg";
              currentElement.classList.add("game-player-dead");
              currentElement.classList.remove("game-player-evil");
              element.classList.add("game-player-dead");
              element.classList.remove("game-player-unselectable");
            } else if (players[i].type == "target+dead") {
              element.children[0].id = "game-show-mark";
              element.children[0].src = "/assets/icons/target.svg";
              currentElement.classList.add("game-player-dead");
              currentElement.classList.remove("game-player-evil");
              element.classList.add("game-player-dead");
              element.classList.remove("game-player-unselectable");
            } 
            else if (players[i].type == "mayor+dead") {
              element.children[1].id = "game-show-mark";
              element.children[1].src = "/assets/icons/megaphone.svg";
              currentElement.classList.add("game-player-dead");
              currentElement.classList.remove("game-player-evil");
              element.classList.add("game-player-dead");
              element.classList.remove("game-player-unselectable");
            } 
            else if (players[i].type == "mayor+dead+target") {
              element.children[0].id = "game-show-mark";
              element.children[0].src = "/assets/icons/target.svg";
              element.children[1].id = "game-show-mark";
              element.children[1].src = "/assets/icons/megaphone.svg";
              currentElement.classList.add("game-player-dead");
              currentElement.classList.remove("game-player-evil");
              element.classList.add("game-player-dead");
              element.classList.remove("game-player-unselectable");
            } 
            else {
              // dead everyone else
              element.children[0].id = "";
              element.children[0].src = "";
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
            if (players[i].type == "client") {
              element.children[0].id = "game-show-mark";
              element.children[0].src = "/assets/icons/briefcase.svg";
            } else if (players[i].type == "target") {
              element.children[0].id = "game-show-mark";
              element.children[0].src = "/assets/icons/target.svg";
            } 
            else if (players[i].type == "mayor") {
              element.children[1].id = "game-show-mark";
              element.children[1].src = "/assets/icons/megaphone.svg";
            } 
            else if (players[i].type == "mayor+target") {
              element.children[0].id = "game-show-mark";
              element.children[0].src = "/assets/icons/target.svg";
              element.children[1].id = "game-show-mark";
              element.children[1].src = "/assets/icons/megaphone.svg";
            } 
            else if (players[i].type == "evil") {
              element.children[0].id = "";
              element.children[0].src = "";
              currentElement.classList.add("game-player-evil");
              element.classList.remove("game-player-unselectable");
            } else if (players[i].type == "none") {
              element.children[0].id = "";
              element.children[0].src = "";
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
  playerIcon.src = "/assets/rolecards/" + name + ".webp";
  playerRole.innerText = name + ` (${playerTeam})`;
  playerMission.innerText = mission;
});

function showGameUI(toShow) {
  if (toShow) {
    var body = document.getElementById("game-body");
    body.classList.add("game-background");
    var game = document.getElementById("game");
    game.style.display = "flex";
  } else {
    var body = document.getElementById("game-body");
    body.classList.remove("game-background");
    var game = document.getElementById("game");
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
    roleCardMission.style.backgroundColor = `var(--${team}-bg-mission`
    roleCardMission.innerText = mission;
    var readyButton = document.getElementsByClassName("game-ready-button")[0];
    var icon = document.getElementsByClassName("game-rolecard-icon")[0];
    icon.src = "/assets/rolecards/" + name + ".webp";

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
    body.classList.remove("game-background-day");
    body.classList.add("game-background-night");
    playerCard.classList.remove("game-day-bg", "game-day-fg");
    playerCard.classList.add("game-night-bg", "game-night-fg");
    playerCardQuestionMark.classList.remove("game-day-fg");
    playerCardQuestionMark.classList.add("game-night-fg");
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
      if (messages[i].className.includes("alert")) {
        if (theme.includes("Day")) {
          messages[i].classList.add("game-message-alert" + "-day");
          messages[i].classList.remove("game-message-alert" + "-night");
        } else if (theme.includes("Night")) {
          messages[i].classList.remove("game-message-alert" + "-day");
          messages[i].classList.add("game-message-alert" + "-night");
        }
      } else if (messages[i].className.includes("info")) {
        if (theme.includes("Day")) {
          messages[i].classList.add("game-message-info" + "-day");
          messages[i].classList.remove("game-message-info" + "-night");
        } else if (theme.includes("Night")) {
          messages[i].classList.remove("game-message-info" + "-day");
          messages[i].classList.add("game-message-info" + "-night");
        }
      } else if (messages[i].className.includes("confirm")) {
        if (theme.includes("Day")) {
          messages[i].classList.add("game-message-confirm" + "-day");
          messages[i].classList.remove("game-message-confirm" + "-night");
        } else if (theme.includes("Night")) {
          messages[i].classList.remove("game-message-confirm" + "-day");
          messages[i].classList.add("game-message-confirm" + "-night");
        }
      } else if (messages[i].className.includes("important")) {
        if (theme.includes("Day")) {
          messages[i].classList.add("game-message-important" + "-day");
          messages[i].classList.remove("game-message-important" + "-night");
        } else if (theme.includes("Night")) {
          messages[i].classList.remove("game-message-important" + "-day");
          messages[i].classList.add("game-message-important" + "-night");
        }
      } else if (messages[i].className.includes("extra")) {
        if (theme.includes("Day")) {
          messages[i].classList.add("game-message-extra" + "-day");
          messages[i].classList.remove("game-message-extra" + "-night");
        } else if (theme.includes("Night")) {
          messages[i].classList.remove("game-message-extra" + "-day");
          messages[i].classList.add("game-message-extra" + "-night");
        }
      }
    }
    scrollDown.classList.remove("game-day-fg");
    scrollDown.classList.add("game-night-fg");
  } else if (theme.includes("Day")) {
    body.classList.remove("game-background-night");
    body.classList.add("game-background-day");
    playerCard.classList.remove("game-night-bg", "game-night-fg");
    playerCard.classList.add("game-day-bg", "game-day-fg");
    playerCardQuestionMark.classList.remove("game-night-fg");
    playerCardQuestionMark.classList.add("game-day-fg");
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
      if (messages[i].className.includes("alert")) {
        if (theme.includes("Day")) {
          messages[i].classList.add("game-message-alert" + "-day");
          messages[i].classList.remove("game-message-alert" + "-night");
        } else if (theme.includes("Night")) {
          messages[i].classList.remove("game-message-alert" + "-day");
          messages[i].classList.add("game-message-alert" + "-night");
        }
      } else if (messages[i].className.includes("info")) {
        if (theme.includes("Day")) {
          messages[i].classList.add("game-message-info" + "-day");
          messages[i].classList.remove("game-message-info" + "-night");
        } else if (theme.includes("Night")) {
          messages[i].classList.remove("game-message-info" + "-day");
          messages[i].classList.add("game-message-info" + "-night");
        }
      } else if (messages[i].className.includes("confirm")) {
        if (theme.includes("Day")) {
          messages[i].classList.add("game-message-confirm" + "-day");
          messages[i].classList.remove("game-message-confirm" + "-night");
        } else if (theme.includes("Night")) {
          messages[i].classList.remove("game-message-confirm" + "-day");
          messages[i].classList.add("game-message-confirm" + "-night");
        }
      } else if (messages[i].className.includes("important")) {
        if (theme.includes("Day")) {
          messages[i].classList.add("game-message-important" + "-day");
          messages[i].classList.remove("game-message-important" + "-night");
        } else if (theme.includes("Night")) {
          messages[i].classList.remove("game-message-important" + "-day");
          messages[i].classList.add("game-message-important" + "-night");
        }
      } else if (messages[i].className.includes("extra")) {
        if (theme.includes("Day")) {
          messages[i].classList.add("game-message-extra" + "-day");
          messages[i].classList.remove("game-message-extra" + "-night");
        } else if (theme.includes("Night")) {
          messages[i].classList.remove("game-message-extra" + "-day");
          messages[i].classList.add("game-message-extra" + "-night");
        }
      }
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
    playersContainer.style.opacity = "100%";
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
      playerIcon.src = "/assets/rolecards/" + name + ".webp";
      playerRole.innerText = name + ` (${playerTeam})`;
      playerMission.innerText = mission;
    });
    socket.emit("setPlayers", getPlayerID(), "first");
    socket.on(
      "setPlayersFirst",
      (players, cycle, phase, isDead, socketPlayer, socketRole, proxyID) => {
        setPlayers(players, cycle, phase, isDead, socketPlayer, socketRole, proxyID);
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

audioToggle = true;
musicToggle = true;
function toggleAudio() {
  playSFX("popAudio", 0.25);
  var audio = document.getElementById("game-audio-toggle");
  if (audioToggle) {
    audioToggle = false;
    audio.src = "/assets/icons/audio_off.svg";
    pauseAudio("dealCardAudio");
    pauseAudio("messageAudio");
    pauseAudio("popAudio");
    pauseAudio("votingAudio");
    pauseAudio("clockAudio");
    pauseAudio("deathAudio");
    pauseAudio("lynchAudio");
    pauseAudio("dayAudio");
    pauseAudio("nightAudio");
    pauseAudio("victoryAudio");
    pauseAudio("defeatAudio");
  } else {
    audioToggle = true;
    audio.src = "/assets/icons/audio_on.svg";
  }
}
function toggleMusic() {
  playSFX("popAudio", 0.25);
  var music = document.getElementById("game-music-toggle");
  if (musicToggle) {
    musicToggle = false;
    music.src = "/assets/icons/music_off.svg";
    pauseAudio("nightMusic");
    pauseAudio("dayMusic");
  } else {
    musicToggle = true;
    music.src = "/assets/icons/music_on.svg";
  }
}

function pauseAll() {
  pauseAudio("dealCardAudio");
  pauseAudio("messageAudio");
  pauseAudio("popAudio");
  pauseAudio("votingAudio");
  pauseAudio("clockAudio");
  pauseAudio("deathAudio");
  pauseAudio("lynchAudio");
  pauseAudio("dayAudio");
  pauseAudio("nightAudio");
  pauseAudio("victoryAudio");
  pauseAudio("defeatAudio");

  pauseAudio("nightMusic");
  pauseAudio("dayMusic");
} 
socket.on("clock", (counter, phase, cycle, cycleCount, theDurations) => {
  var clock = document.getElementById("game-time");
  var theMinutes = document.getElementById("game-time-minutes");
  var theSeconds = document.getElementById("game-time-seconds");
  var gameCycle = document.getElementById("game-cycle-text");
  var durations = Object.values(theDurations);
  if (phase == "voting" || phase == "actions") {
    if (counter == 10) {
      playSFX("clockAudio");
    }
  }
  if (cycle == "Day") {
    playMusic("dayMusic", 0.6, true)
    if (phase == "voting") {
      if (counter == durations[1].voting) {
        playSFX("votingAudio");
      }
    }
  } else {
    pauseAudio("dayMusic");
  }
  if (cycle == "Night") {
    playMusic("nightMusic", 0.4, true)
    if (phase == "actions") {
      if (counter == durations[0].actions) {
        playSFX("nightAudio");
      }
    }
  } else {
    pauseAudio("nightMusic")
  }
  if (phase == "recap") {
    if (counter == durations[1].recap) {
      playSFX("dayAudio");
    }
  }
  
  var minutes = Math.floor(counter/60);
  var seconds = counter - (minutes * 60)
  if (minutes < 10 && seconds < 10) {
    // 0M:0S
    theMinutes.innerText = "0" + minutes;
    theSeconds.innerText = "0" + seconds;
    // clock.innerText = "0" + minutes + ":0" + seconds;
  } 
  else if (minutes >= 10 && seconds >= 10) {
    // MM:SS
    theMinutes.innerText = minutes;
    theSeconds.innerText = seconds;
    // clock.innerText = minutes + ":" + seconds;
  } 
  else if (minutes >= 10 && seconds < 10) {
    // MM:0S
    theMinutes.innerText = minutes;
    theSeconds.innerText = "0" + seconds;
    // clock.innerText = minutes + ":0" + seconds;
  } 
  else if (minutes < 10 && seconds >= 10) {
    // 0M:SS
    theMinutes.innerText = "0" + minutes;
    theSeconds.innerText = seconds;
    // clock.innerText = "0" + minutes + ":" + seconds;
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
      playSFX("dealCardAudio");
      showWaiting(false);
    } else if (playerIsReady && !allReady) {
      showGameUI(false);
      showRoleCard(false);
      showWaiting(true);
    }
  }
);
