const domain = "https://eyesopen.petrusmatiros.com";
const socket = io(domain, {secure: true});

const lobby = `${domain}/lobby/`;

const minPlayers = 3;

/**
 * [resetCookiePlayerID resets the playerID cookie to null]
 */
function resetCookiePlayerID(override = false) {
  if (override) {
    console.log("cookie was reset to null");
    document.cookie = "eyesopenID=null; path=/";
  } else {
    if (getPlayerID() !== "null" && getPlayerID() !== undefined) {
      console.log("ID exists before user, setting to null");
      document.cookie = "eyesopenID=null; path=/";
    } else if (getPlayerID() === undefined) {
      console.log("ID is undefined, setting to null");
      document.cookie = "eyesopenID=null; path=/";
    } else if (getPlayerID() === "null") {
      console.log("ID is already null");
    }
  }
}

function revealLobby() {
  const theLobby = document.getElementById("lobby-without-logo");
  const theLobbyCode = document.getElementById("lobby-code-container");
  theLobby.style.display = "flex";
  theLobbyCode.style.display = "flex";
}

socket.on("connect", () => {
  socket.emit("checkUser", getPlayerID());
  socket.on("userExists", (userExists) => {
    if (!userExists) {
      resetCookiePlayerID();
      window.location.href = `${window.location.href}/join`;
    } else {
      let URL = "";
      let room = "";

      if (window.location.href.endsWith("/")) {
        URL = window.location.href.replace("http://", "");
        room = URL.split("/")[URL.split("/").length - 2];
        socket.emit("checkRoomCode", room, getPlayerID(), "press");
      } else if (!window.location.href.endsWith("/")) {
        URL = window.location.href.replace("http://", "");
        room = URL.split("/")[URL.split("/").length - 1];
        socket.emit("checkRoomCode", room, getPlayerID(), "press");
      }
      socket.on("roomCodeResponsePress", (status) => {
        if (status === "full") {
          window.location.href = domain;
        }
      });
      
      if (window.location.href.endsWith("/")) {
        URL = window.location.href.replace("http://", "");
        room = URL.split("/")[URL.split("/").length - 2];
        console.log("directJoining1", getPlayerID());
        socket.emit("setRoom", getPlayerID());
        socket.emit("directJoin", getPlayerID(), room, "lobby");
      } else if (!window.location.href.endsWith("/")) {
        URL = window.location.href.replace("http://", "");
        room = URL.split("/")[URL.split("/").length - 1];
        console.log("directJoining2", getPlayerID());
        socket.emit("setRoom", getPlayerID());
        socket.emit("directJoin", getPlayerID(), room, "lobby");
      }
      revealLobby();
      socket.emit("checkUserApartOfGame", getPlayerID(), room, "app");
      socket.on("apartOfGameApp", (apartOfGame, inProgress, code) => {
        if (apartOfGame && inProgress === true) {
          if (window.location.href.includes("/game") === false) {
            if (window.location.href.endsWith("/")) {
              window.location.href += "game";
            } else if (!window.location.href.endsWith("/")) {
              window.location.href += "/game";
            }
          }
        }

        if (window.location.href.endsWith("/")) {
          URL = window.location.href.replace("http://", "");
          room = URL.split("/")[URL.split("/").length - 2];
          console.log("directJoining3", getPlayerID());
          socket.emit("setRoom", getPlayerID());
          socket.emit("directJoin", getPlayerID(), room, "lobby");
        } else if (!window.location.href.endsWith("/")) {
          URL = window.location.href.replace("http://", "");
          room = URL.split("/")[URL.split("/").length - 1];
          console.log("directJoining4", getPlayerID());
          socket.emit("setRoom", getPlayerID());
          socket.emit("directJoin", getPlayerID(), room, "lobby");
        }

        socket.on("viewRoom", (roomCode) => {
          document.getElementById("roomcode-copy").innerText = roomCode;
        });
        socket.on("joinPlayerSlot", () => {
          socket.emit("requestPlayerSlot", getPlayerID());
        });
        socket.on("playerSlots", (host, slots) => {
          updatePlayerSlotsWithProxy(host, slots);
        });

        function updatePlayerSlotsWithProxy(host, slots) {
          socket.emit("requestProxy", getPlayerID(), "lobby");
          socket.on("fetchedProxyLobby", (proxyID) => {
            updatePlayerSlots(host, slots, proxyID);
            console.log("updated player slots");
          });
          refreshReady();
        }

        function refreshReady() {
          socket.emit("refreshReady", getPlayerID(), "all");
          socket.on("ready-status-lobby-refresh", (users) => {
            readyStatusLobby(users);
          });
        }

        socket.emit("checkIfHost", getPlayerID(), "visibility");
        socket.on("isHost", (isHost) => {
          if (isHost) {
            canPickRole = isHost;
            console.log("SETTING HOST VISIBILITY");
            document.getElementById("roles").classList.add("selectable");
            const array = document.getElementsByClassName("lobby-role-tag");
            for (let i = 0; i < array.length; i++) {
              array[i].setAttribute("onclick", "selectRole(this)");
              array[i].style.cursor = "pointer";
            }
            const startButton =
              document.getElementsByClassName("lobby-button start");
            startButton[0].style.display = "inline";
            revealSettingsButtons();
            showNotification("copy");
          } else {
            console.log("REMOVING HOST VISIBILITY");
            document.getElementById("roles").classList.remove("selectable");
            const array = document.getElementsByClassName("lobby-role-tag");
            for (let i = 0; i < array.length; i++) {
              array[i].setAttribute("onclick", "");
              array[i].style.cursor = "not-allowed";
            }
            const startButton =
              document.getElementsByClassName("lobby-button start");
            startButton[0].style.display = "none";
          }
        });

        socket.on(
          "viewPlayerCount",
          (
            amountUnready,
            hostExists,
            host,
            allReady,
            totalUsers,
            totalRoles
          ) => {
            document.getElementById("player-card").style.border =
              "2px solid var(--evil-bg)";
            roleReqHandler(totalRoles, totalUsers);

            if (totalUsers >= minPlayers) {
              //? 3 minimum check
              document.getElementById("lobby-req-check-players").style.display =
                "inline";
              document.getElementById("lobby-req-cross-players").style.display =
                "none";
                document.getElementById("player-req").style.color = "var(--good-bg)"
            } else if (totalUsers < minPlayers) {
              document.getElementById("lobby-req-check-players").style.display =
                "none";
              document.getElementById("lobby-req-cross-players").style.display =
                "inline";
                document.getElementById("player-req").style.color = "var(--evil-bg)"
            }
            if (!hostExists) {
              document.getElementById("player-count").style.color =
                "var(--light-fg)";
              document.getElementById("player-count").innerText =
                "Host is not in room";
            } else {
              //? host is in room
              if (allReady) {
                //? all ready check
                document.getElementById("player-card").style.border =
                  "2px solid var(--good-bg)";
                document.getElementById("player-count").innerText =
                  "Everyone is ready";
                document.getElementById("player-count").style.color =
                  "var(--good-bg)";
              } else {
                document.getElementById("player-count").style.color =
                  "var(--light-fg)";
                document.getElementById("player-count").innerText =
                  `${amountUnready} player(s) not ready`;
              }
            }

            socket.on("reqSatisfied", (valid) => {
              if (valid) {
                const start = document.getElementById("start-button");

                start.style.opacity = "100%";
                start.style.cursor = "pointer";
                start.setAttribute("onclick", "startGame()");
              } else {
                const start = document.getElementById("start-button");

                start.style.opacity = "35%";
                start.style.cursor = "not-allowed";
                start.setAttribute("onclick", "");
              }
            });
          }
        );

        socket.emit("fetchRoles", getPlayerID(), "connect");
        socket.on("fetchedRolesConnect", (roles) => {
          updateRoles(roles);
        });

        socket.on("fetchedRolesAfter", (roles) => {
          updateRoles(roles);
        });

        socket.emit("checkRoleCount", getPlayerID());

        socket.on("rolePickCondition", (valid) => {
          rolePickConditionHandler(valid);
        });

        socket.emit("checkRolePick", getPlayerID(), "connect");
        socket.on("rolePickConditionConnect", (valid) => {
          rolePickConditionHandler(valid);
        });
        socket.on("rolePickConditionDisconnect", (valid) => {
          rolePickConditionHandler(valid);
        });
        socket.on("fetchedRolesDisconnect", (roles) => {
          updateRoles(roles);
        });
      });
      addEventListeners();
    }
  });
});

function addEventListeners() {
  document.addEventListener("visibilitychange", (e) => {
    if (document.visibilityState === 'visible') {
      // playLobby();
    } else {
      pauseAll();
    }
  });
}

function playMusic(toPlay, vol=100, wait=false, loop=false) {
  playAudio(toPlay, vol, wait, loop);
}
function playSFX(toPlay, vol=100, wait=false, loop=false) {
  playAudio(toPlay, vol, wait, loop);
}

function pauseAll() {
  pauseAudio("readyAudio");
  pauseAudio("unreadyAudio");
  pauseAudio("popAudio");
  pauseAudio("dealCardAudio");
}

function pauseAudio(toPause) {
  const audio = document.getElementById(toPause);
  const pausePromise = audio.pause();
  if (pausePromise !== undefined) {
    pausePromise.then(_ => {
    })
    .catch(error => {
    });
  }
}

function handleVol(vol) {
  let num = Number(vol);
  
  if (Number.isNaN(num) || num < 0 || num > 100) {
    num = 0.5;
  }
  
  num = Math.round(num * 10) / 10;
  
  if (num >= 1 && num <= 100) {
    num /= 100;
  }
  
  return num;
}

function playAudio(toPlay, vol=100, wait=false, loop=false) {
  const audio = document.getElementById(toPlay);
  const volume = handleVol(vol);
  if (wait) {
    audio.volume = volume;
    audio.loop = loop;
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.then(_ => {
      })
      .catch(error => {
      });
    }
  } else {
    if (audio.paused) {
      audio.volume = volume;
      audio.loop = loop;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.then(_ => {
        })
        .catch(error => {
        });
      }
    }
  }
}

socket.on("hostKick", () => {
  console.log("kicked")
  window.location.href = domain;
})

function resetGameSettingsError(type = "") {
  document.getElementById("lobby-gamesettings-help").style.opacity = "0%";
  document.getElementById("lobby-gamesettings-help").innerText = "";

  const actionInput = document.getElementById("actionInput");
  const discussionInput = document.getElementById("discussionInput");
  const votingInput = document.getElementById("votingInput");
  if (type === "all") {
    actionInput.style.border = "2px solid #b1b1b1";
    actionInput.classList.remove("lobby-gamesetting-error");

    discussionInput.style.border = "2px solid #b1b1b1";
    discussionInput.classList.remove("lobby-gamesetting-error");

    votingInput.style.border = "2px solid #b1b1b1";
    votingInput.classList.remove("lobby-gamesetting-error");
  }
  else {
    if (type === "action") {
      if (actionInput.className.includes("lobby-gamesetting-error")) {
        actionInput.style.border = "2px solid #b1b1b1";
        actionInput.classList.remove("lobby-gamesetting-error");
      } 
    }
    else if (type === "discussion") {
      if (discussionInput.className.includes("lobby-gamesetting-error")) {
        discussionInput.style.border = "2px solid #b1b1b1";
        discussionInput.classList.remove("lobby-gamesetting-error");
      } 
    }
    else if (type === "voting") {
      if (discussionInput.className.includes("lobby-gamesetting-error")) {
        discussionInput.style.border = "2px solid #b1b1b1";
        discussionInput.classList.remove("lobby-gamesetting-error");
      } 
    }
    else {
      if (actionInput.className.includes("lobby-gamesetting-error")) {
        actionInput.style.border = "2px solid #b1b1b1";
        actionInput.classList.remove("lobby-gamesetting-error");
      } 
      if (discussionInput.className.includes("lobby-gamesetting-error")) {
        discussionInput.style.border = "2px solid #b1b1b1";
        discussionInput.classList.remove("lobby-gamesetting-error");
      } 
      if (votingInput.className.includes("lobby-gamesetting-error")) {
        votingInput.style.border = "2px solid #b1b1b1";
        votingInput.classList.remove("lobby-gamesetting-error");
      }
    }
  }
}

function gameSettingError(type) {
  let theElementId = "";

  if (type === "action") {
    theElementId = `${type}Input`;
  } else if (type === "discussion") {
    theElementId = `${type}Input`;
  } else if (type === "voting") {
    theElementId = `${type}Input`;
  }
  document.getElementById("lobby-gamesettings-help").style.opacity = "100%";
  const theElement = document.getElementById(theElementId);
  theElement.classList.add("lobby-gamesetting-error");
  theElement.style.border = "2px solid hsl(0, 100%, 45%)";
  document.getElementById("lobby-gamesettings-help").innerText =
    "The duration must be between 5s and 300s";
}

function selectShowRole() {
  const showRoleInput = document.getElementsByClassName("lobby-gamesettings-checkbox")[0];
  const showRoleCheck = document.getElementById("checkbox-check");
  let toShow = false;
  if (showRoleInput.id === "showrole-checked") {
    showRoleInput.id = "";
    showRoleCheck.style.opacity = "0%";
    toShow = false;
  } else if (showRoleInput.id !== "showrole-checked") {
    showRoleInput.id = "showrole-checked";
    showRoleCheck.style.opacity = "100%";
    toShow = true;
  }
  socket.emit("setShowRoles", getPlayerID(), toShow)
}


function selectVoteMessageSettings(element) {
  const theButtonContainer = element.children[0]
  const theButton = theButtonContainer.children[0];
  if (
    theButton.id === "voteMessagesHidden" ||
    theButton.id === "voteMessagesAnonymous" ||
    theButton.id === "voteMessagesVisible"
  ) {
    let inputType = "";
    const radioHidden = document.getElementById("voteMessagesHidden");
    const radioAnonymous = document.getElementById("voteMessagesAnonymous");
    const radioVisible = document.getElementById("voteMessagesVisible");
    const radioHiddenParentContainer = radioHidden.parentElement.parentElement;
    const radioAnonymousParentContainer = radioAnonymous.parentElement.parentElement;
    const radioVisibleParentContainer = radioVisible.parentElement.parentElement;
    if (theButton.id === "voteMessagesHidden") {
      inputType = "hidden";
      radioHiddenParentContainer.id = "votemessage-checked";
      radioHidden.style.backgroundColor = "var(--game-setting-clicked)";
      radioAnonymous.style.backgroundColor = "var(--game-setting)";
      radioVisible.style.backgroundColor = "var(--game-setting)";
      radioAnonymousParentContainer.id = "";
      radioVisibleParentContainer.id = "";
    } else if (theButton.id === "voteMessagesAnonymous") {
      inputType = "anonymous";
      radioHiddenParentContainer.id = "";
      radioHidden.style.backgroundColor = "var(--game-setting)";
      radioAnonymous.style.backgroundColor = "var(--game-setting-clicked)";
      radioVisible.style.backgroundColor = "var(--game-setting)";
      radioAnonymousParentContainer.id = "votemessage-checked";
      radioVisibleParentContainer.id = "";
    } else if (theButton.id === "voteMessagesVisible") {
      inputType = "visible";
      radioHidden.style.backgroundColor = "var(--game-setting)";
      radioAnonymous.style.backgroundColor = "var(--game-setting)";
      radioVisible.style.backgroundColor = "var(--game-setting-clicked)";
      radioHiddenParentContainer.id = "";
      radioAnonymousParentContainer.id = "";
      radioVisibleParentContainer.id = "votemessage-checked";
    }

    socket.emit("setVoteMessages", getPlayerID(), inputType)
  }
}

function checkNumber(element) {
  // do something
  if (
    element.id === "actionInput" ||
    element.id === "discussionInput" ||
    element.id === "votingInput"
  ) {
    const MIN_SECONDS = 5;
    const MAX_SECONDS = 300;
    let inputType = "";
    let durationToChange = "";
    if (element.id === "actionInput") {
      inputType = "action";
      durationToChange = "actions";
    } else if (element.id === "discussionInput") {
      inputType = "discussion";
      durationToChange = "discussion";
    } else if (element.id === "votingInput") {
      inputType = "voting";
      durationToChange = "voting";
    }

    if (element.value < MIN_SECONDS || element.value > MAX_SECONDS) {
      gameSettingError(inputType);
      return false;
    }
    resetGameSettingsError(inputType);
    document.getElementById(`${inputType}Input`).style.border =
      "2px solid #b1b1b1";
      socket.emit(
        "setDuration",
        getPlayerID(),
        element.valueAsNumber,
        durationToChange
      );
    
    return true;
  }
}

function resetNotSavedGameSettings() {
  socket.emit("resetNotSavedGameSettings", getPlayerID());
}

function resetGameSettings() {
  resetGameSettingsError("all");
  socket.emit("resetGameSettings", getPlayerID());
  loadGameSettings();
}
function saveGameSettings() {
  const actionsInput = document.getElementById("actionInput");
  const discussionInput = document.getElementById("discussionInput");
  const votingInput = document.getElementById("votingInput");
  if (
    checkNumber(actionsInput) &&
    checkNumber(discussionInput) &&
    checkNumber(votingInput)
  ) {
    socket.emit("saveGameSettings", getPlayerID());
    hideGameSettings();
  }
}

function hideGameSettings() {
  resetNotSavedGameSettings();
  resetGameSettingsError();
  const gameSettingsContainer = document.getElementById(
    "lobby-gamesettings-container"
  );
  const gameSettingsOverlay = document.getElementById("overlay-gamesettings");
  gameSettingsContainer.style.display = "none";
  gameSettingsOverlay.style.display = "none";
}

function loadPlayersInLobby(slots) {
  const thePlayers = document.getElementById("kick-players");
  const columns = thePlayers.children;
  for (let col = 0; col < columns.length; col++) {
    const array = columns[col];
    for (let i = 0; i < array.length; i++) {
      const currentPlayer = array[i];
      currentPlayer.id = "player-hidden";
      currentPlayer.children[0].id = "";
      currentPlayer.children[0].innerText = "";
    }
  }
  let playerCount = 0;
  let colCount = 0;
  const col1 = document.getElementById("players-col1").children
  const col2 = document.getElementById("players-col2").children
  let playersInLobby = 0;
  let currentColumn = col1;
  for (const [key, value] of Object.entries(slots)) {
    
    if (playerCount === 2) {
      colCount++;
      playerCount = 0;
    }

    const playerElement = currentColumn[colCount];
    if (value.userID !== undefined) {
      playerElement.id = "";
      playerElement.children[0].id = `kick+${value.userID}`;
      playerElement.children[0].innerText = value.userName;
      playersInLobby++;
      if (currentColumn === col1) {
        currentColumn = col2
        playerCount++;
      }
      else if (currentColumn === col2) {
        currentColumn = col1;
        playerCount++;
      }
    } else {
      playerElement.id = "player-hidden";
      playerElement.children[0].id = "";
      playerElement.children[0].innerText = "";
    }
  }

  if (playersInLobby === 1) {
    thePlayers.classList.add("no-gap");
  } else {
    thePlayers.classList.remove("no-gap");
  }
}

socket.on("updateLobbyPlayers", (slots) => {
  loadPlayersInLobby(slots);
})

function hideKick() {
  const overlayPopup = document.getElementById("overlay-popup1");
  overlayPopup.style.display = "none";
  const overlayPopupConfirm = document.getElementById("overlay-popup2");
  overlayPopupConfirm.style.display = "none";
  const kickPopup = document.getElementById("kick");
  kickPopup.style.display = "none";
  const kickPopupConfirm = document.getElementById("kickConfirm");
  kickPopupConfirm.style.display = "none"
}
function displayKick() {
  socket.emit("requestLobbyPlayers", getPlayerID());
  socket.on("fetchLobbyPlayers", (slots) => {
    loadPlayersInLobby(slots)
  })
  const overlayPopup = document.getElementById("overlay-popup1");
  overlayPopup.style.display = "flex";
  
  const kickPopup = document.getElementById("kick");
  kickPopup.style.display = "flex";
}
function hideKickConfirm() {
  const overlayPopupConfirm = document.getElementById("overlay-popup2");
  overlayPopupConfirm.style.display = "none";
  const kickPopupConfirm = document.getElementById("kickConfirm");
  kickPopupConfirm.style.display = "none"
}
function displayKickConfirm() {
  const overlayPopupConfirm = document.getElementById("overlay-popup2");
  overlayPopupConfirm.style.display = "flex";
  const kickPopupConfirm = document.getElementById("kickConfirm");
  kickPopupConfirm.style.display = "flex"
}
let playerToKickID = null;
function kickPlayer(element) {
  const playerContainer = element.parentElement;
  const playerBubble = playerContainer.children[0];
  if (playerBubble.id !== null || playerBubble.id !== undefined) {
    displayKickConfirm();
    document.getElementById("playerToKick").innerText = `Kick ${playerBubble.innerText} from lobby?`
    playerToKickID = playerBubble.id;
  }
}
function kickConfirm() {
  if (playerToKickID !== null) {
    playerToKickID = playerToKickID.replace("kick+", "")
    socket.emit("kickPlayer", getPlayerID(), playerToKickID)
    hideKickConfirm();
  }
  playerToKickID = null;
}

function revealSettingsButtons() {
  document.getElementById("lobby-gamesettings-icon").style.display = "flex";
  document.getElementById("lobby-kickpanel-icon").style.display = "flex";
}
socket.on("fetchedGameSettings", (settings) => {
  const actionsInput = document.getElementById("actionInput");
  const discussionInput = document.getElementById("discussionInput");
  const votingInput = document.getElementById("votingInput");
  const showRoleInput = document.getElementsByClassName("lobby-gamesettings-checkbox")[0];
  const showRoleCheck = document.getElementById("checkbox-check");
  const radioHidden = document.getElementById("voteMessagesHidden");
  const radioAnonymous = document.getElementById("voteMessagesAnonymous");
  const radioVisible = document.getElementById("voteMessagesVisible");
  const radioHiddenParentContainer = radioHidden.parentElement.parentElement;
  const radioAnonymousParentContainer = radioAnonymous.parentElement.parentElement;
  const radioVisibleParentContainer = radioVisible.parentElement.parentElement;
  // Durations
  actionsInput.value = settings.actions.value;
  discussionInput.value = settings.discussion.value;
  votingInput.value = settings.voting.value;

  // Show roles?
  if (settings.showRoles.value) {
    showRoleInput.id = "showrole-checked";
    showRoleCheck.style.opacity = "100%";
  } else {
    showRoleInput.id = "";
    showRoleCheck.style.opacity = "0%";
    
  }

  // Vote messages
  if (settings.voteMessages.value === "hidden") {
    radioHiddenParentContainer.id = "votemessage-checked";
      radioHidden.style.backgroundColor = "var(--game-setting-clicked)";
      radioAnonymous.style.backgroundColor = "var(--game-setting)";
      radioVisible.style.backgroundColor = "var(--game-setting)";
      radioAnonymousParentContainer.id = "";
      radioVisibleParentContainer.id = "";
  } else if (settings.voteMessages.value === "anonymous") {
    radioHiddenParentContainer.id = "";
      radioHidden.style.backgroundColor = "var(--game-setting)";
      radioAnonymous.style.backgroundColor = "var(--game-setting-clicked)";
      radioVisible.style.backgroundColor = "var(--game-setting)";
      radioAnonymousParentContainer.id = "votemessage-checked";
      radioVisibleParentContainer.id = "";
  } else if (settings.voteMessages.value === "visible") {
    radioHidden.style.backgroundColor = "var(--game-setting)";
      radioAnonymous.style.backgroundColor = "var(--game-setting)";
      radioVisible.style.backgroundColor = "var(--game-setting-clicked)";
      radioHiddenParentContainer.id = "";
      radioAnonymousParentContainer.id = "";
      radioVisibleParentContainer.id = "votemessage-checked";
  }
});
function loadGameSettings() {
  socket.emit("loadGameSettings", getPlayerID());
}

function showGameSettings() {
  loadGameSettings();
  const gameSettingsContainer = document.getElementById(
    "lobby-gamesettings-container"
  );
  const gameSettingsOverlay = document.getElementById("overlay-gamesettings");
  gameSettingsContainer.style.display = "flex";
  gameSettingsOverlay.style.display = "flex";
}

function getSeenNotification() {
  const cookies = document.cookie.split(";");
  for (let i = 0; i < cookies.length; i++) {
    if (cookies[i].includes("seenNotification")) {
      return cookies[i].split("=")[1];
    }
  }
}

const fiveHours = 60 * 60 * 5;

function showNotification(type) {
  if (type === "copy") {
    if (getSeenNotification() !== "true") {
      navigator.clipboard.writeText(window.location.href);
      document.cookie = `seenNotification=true; path=/; max-age=${fiveHours}; SameSite=Lax`;
      const theNotification = document.getElementById("lobby-notification");
      theNotification.style.display = "flex";
      theNotification.innerText = "Copied link to clipboard. Share it! ᕕ( ᐛ )ᕗ";
      setTimeout(() => {
        theNotification.style.display = "none";
      }, 5000);
    }
  }
}

function hideNotification() {
  const theNotification = document.getElementById("lobby-notification");
  theNotification.style.display = "none";
}

function hideInfo() {
  document.getElementById("overlay-rolecards").style.display = "none";
  document.getElementById("lobby-rolecard-container").style.display = "none";
}
function showInfo() {
  // show overlay
  document.getElementById("overlay-rolecards").style.display = "block";
  document.getElementById("lobby-rolecard-container").style.display = "block";
  // overlay should close everything
}
function hideCard() {
  document
    .getElementById("overlay-rolecards")
    .setAttribute("onclick", "hideInfo()");
  document
    .getElementById("adjusted-close-button")
    .setAttribute("onclick", "hideInfo()");
  const displayContainer = document.getElementById(
    "lobby-rolecard-display-container"
  );
  const displayRole = document.getElementById("lobby-rolecard-display-role");
  const displayDescription = document.getElementById(
    "lobby-rolecard-display-description"
  );
  const displayImage = document.getElementById("lobby-rolecard-display-image");
  const displayMission = document.getElementById(
    "lobby-rolecard-display-mission"
  );
  displayContainer.style.display = "none";
  displayRole.style.display = "none";
  displayDescription.style.display = "none";
  displayImage.style.display = "none";
  displayMission.style.display = "none";
  document.getElementById("overlay-rolecardinfo").style.display = "none";
}
function showCard(element) {
  // show overlay
  document.getElementById("overlay-rolecards").setAttribute("onclick", "");
  document.getElementById("adjusted-close").setAttribute("onclick", "");
  const displayContainer = document.getElementById(
    "lobby-rolecard-display-container"
  );
  const displayRole = document.getElementById("lobby-rolecard-display-role");
  const displayDescription = document.getElementById(
    "lobby-rolecard-display-description"
  );
  const displayImage = document.getElementById("lobby-rolecard-display-image");
  const displayMission = document.getElementById(
    "lobby-rolecard-display-mission"
  );
  const targetElementID = element.id.replace("-card", "");
  socket.emit("requestLobbyDisplayCard", getPlayerID(), targetElementID);
  socket.on("fetchedLobbyDisplayCard", (name, team, description, mission) => {
    displayRole.innerText = name;
    displayDescription.innerText = description;
    displayMission.innerText = mission;
    displayMission.style.backgroundColor = `var(--${team}-bg-mission`;
    theSrc = `/assets/rolecards/${name}.webp`;
    displayImage.src = theSrc;
    if (team.includes("good")) {
      displayRole.classList.add("good-selected-color");
      displayRole.classList.remove(
        "evil-selected-color",
        "neutral-selected-color"
      );
      displayMission.classList.add("good-selected-color");
      displayMission.classList.remove(
        "evil-selected-color",
        "neutral-selected-color"
      );
    } else if (team.includes("evil")) {
      displayRole.classList.add("evil-selected-color");
      displayRole.classList.remove(
        "good-selected-color",
        "neutral-selected-color"
      );
      displayMission.classList.add("evil-selected-color");
      displayMission.classList.remove(
        "good-selected-color",
        "neutral-selected-color"
      );
    } else if (team.includes("neutral")) {
      displayRole.classList.add("neutral-selected-color");
      displayRole.classList.remove(
        "good-selected-color",
        "evil-selected-color"
      );
      displayMission.classList.add("neutral-selected-color");
      displayMission.classList.remove(
        "good-selected-color",
        "evil-selected-color"
      );
    }
  });
  displayContainer.style.display = "flex";
  displayRole.style.display = "flex";
  displayDescription.style.display = "flex";
  displayImage.style.display = "flex";
  displayMission.style.display = "flex";
  document.getElementById("overlay-rolecardinfo").style.display = "block";
  playSFX("dealCardAudio", 40);
}

socket.on("beginClearEvilRoom", (roomToClear) => {
  clearEvilRoom(roomToClear);
});
socket.on("beginClearCemeteryRoom", (roomToClear) => {
  clearEvilRoom(roomToClear);
});

function clearEvilRoom() {
  socket.emit("clearSpecificRoom", getPlayerID(), roomToClear);
}
function clearCemeteryRoom() {
  socket.emit("clearSpecificRoom", getPlayerID(), roomToClear);
}

socket.on("enterGame", () => {
  window.location.href += "/game";
});

function startGame() {
  socket.emit("checkIfHost", getPlayerID(), "start");
  socket.on("isHostStart", (isHost) => {
    if (isHost) {
      socket.emit("startGame", getPlayerID());
    }
  });
}

socket.on("ready-status-lobby", (users) => {
  readyStatusLobby(users);
});

function readyStatusLobby(users) {
  const lobbyButtons = document.getElementsByClassName(
    "lobby-button-container"
  )[0];
  lobbyButtons.style.display = "flex";
  for (let i = 0; i < users.length; i++) {
    if (document.getElementById(users[i].thePlayerID) !== null) {
      if (users[i].readyLobby) {
        const status = document.getElementById(users[i].thePlayerID).parentElement
          .children[1];
        status.innerText = "ready";
        status.id = "status-ready";
        
      } else if (!users[i].readyLobby) {
        const status = document.getElementById(users[i].thePlayerID).parentElement
        .children[1];
        status.innerText = "not ready";
        status.id = "status-notready";
      }
    }
  }
}

socket.on("currentRoleCount", (amountOfRoles, amountOfUsers) => {
  roleCount = amountOfRoles;
  userCount = amountOfUsers;
  roleReqHandler(roleCount, userCount);
});

function selectRole(element) {
  roleCounter(element);
}

function rolePickConditionHandler(isValid) {
  if (isValid) {
    //? valid pick condition
    document.getElementById("role-card").style.border =
      "2px solid var(--good-bg)";
  } else {
    document.getElementById("role-card").style.border =
      "2px solid var(--evil-bg)";
  }
}

function roleCounter(element) {
  roleHandler(element);
  socket.emit("fetchRoles", getPlayerID(), "after");
  socket.emit("checkRolePick", getPlayerID(), "pick");
}

function roleReqHandler(roles, users) {
  if (roles === users) {
    //? same amount of roles as players
    socket.emit("reqHandler", getPlayerID(), "rolesEqualUsers", true);
    document.getElementById("lobby-req-check-roles").style.display = "inline";
    document.getElementById("lobby-req-cross-roles").style.display = "none";
    document.getElementById("role-req").style.color = "var(--good-bg)"
  } else {
    socket.emit("reqHandler", getPlayerID(), "rolesEqualUsers", false);
    document.getElementById("lobby-req-check-roles").style.display = "none";
    document.getElementById("lobby-req-cross-roles").style.display = "inline";
    document.getElementById("role-req").style.color = "var(--evil-bg)"
  }
}

function roleHandler(element) {
  if (canPickRole) {
    // CHECK IF HOST OTHER WISE CANNOT CHANGE
    if (element.classList.contains("good")) {
      if (roleCount < userCount) {
        if (element.classList.toggle("good-selected")) {
          element.classList.remove("unpicked");
          pickRole(element, "add");
        } else {
          element.classList.add("unpicked");
          pickRole(element, "remove");
        }
      } else {
        if (!element.classList.contains("unpicked")) {
          element.classList.toggle("good-selected", false);
          element.classList.add("unpicked");
          pickRole(element, "remove");
        }
      }
    } else if (element.classList.contains("evil")) {
      if (roleCount < userCount) {
        if (element.classList.toggle("evil-selected")) {
          element.classList.remove("unpicked");
          pickRole(element, "add");
        } else {
          element.classList.add("unpicked");
          pickRole(element, "remove");
        }
      } else {
        if (!element.classList.contains("unpicked")) {
          element.classList.toggle("evil-selected", false);
          element.classList.add("unpicked");
          pickRole(element, "remove");
        }
      }
    } else if (element.classList.contains("neutral")) {
      if (roleCount < userCount) {
        if (element.classList.toggle("neutral-selected")) {
          element.classList.remove("unpicked");
          pickRole(element, "add");
        } else {
          element.classList.add("unpicked");
          pickRole(element, "remove");
        }
      } else {
        if (!element.classList.contains("unpicked")) {
          element.classList.toggle("neutral-selected", false);
          element.classList.add("unpicked");
          pickRole(element, "remove");
        }
      }
    }
  }
}

function updateRoles(roles) {
  const array = document.getElementsByClassName("lobby-role-tag");
  for (let i = 0; i < array.length; i++) {
    const element = array[i];
    if (roles.includes(element.id)) {
      if (element.className.includes("good")) {
        element.classList.add("good-selected");
      } else if (element.className.includes("evil")) {
        element.classList.add("evil-selected");
      } else if (element.className.includes("neutral")) {
        element.classList.add("neutral-selected");
      }
      element.classList.remove("unpicked");
    } else {
      if (element.className.includes("good")) {
        element.classList.remove("good-selected");
      } else if (element.className.includes("evil")) {
        element.classList.remove("evil-selected");
      } else if (element.className.includes("neutral")) {
        element.classList.remove("neutral-selected");
      }
      element.classList.add("unpicked");
    }
  }
}

function pickRole(element, op) {
  const role = element.id;
  socket.emit("pickRole", getPlayerID(), role, op);
}

function toggleLobbyButton(element) {
  if (element.classList.contains("ready")) {
    if (element.classList.toggle("not-ready")) {
      element.innerText = "Unready";
      socket.emit("player-ready", getPlayerID(), "lobby");
      playSFX("readyAudio");
    } else {
      element.innerText = "Ready";
      socket.emit("player-unready", getPlayerID(), "lobby");
      playSFX("unreadyAudio");
    }
  }
}

function updatePlayerSlots(host, slots, proxyID) {
  for (const [key, value] of Object.entries(slots)) {
    if (value.taken === true) {
      const slot = document.getElementById(key);
      slot.innerText = value.userName;
      if (value.userID !== undefined) {
        slot.parentElement.id = value.userID;
        slot.parentElement.parentElement.id = "joined";
        const status = slot.parentElement.parentElement.children[1];
        if (value.userID === host) {
          slot.parentElement.parentElement.classList.add("joined-host");
          slot.parentElement.parentElement.classList.remove("joined-self", "joined-other", "empty");
        } else if (value.userID === proxyID) {
          slot.parentElement.parentElement.classList.add("joined-self");
          slot.parentElement.parentElement.classList.remove("joined-host", "joined-other", "empty");
        } else {
          slot.parentElement.parentElement.classList.add("joined-other");
          slot.parentElement.parentElement.classList.remove("joined-self", "joined-host", "empty");
        }
      }
      // status.innerText = "not ready";
    } else if (value.taken === false) {
      const slot = document.getElementById(key);
      slot.innerText = value.userName;
      slot.parentElement.id = value.userID;
      slot.parentElement.parentElement.id = "";
      const status = slot.parentElement.parentElement.children[1];
      status.id = "";
      slot.parentElement.parentElement.classList.add("empty");
      slot.parentElement.parentElement.classList.remove("joined-self", "joined-host", "joined-other");
    }
  }
}

function getPlayerID() {
  const cookies = document.cookie.split(";");
  for (let i = 0; i < cookies.length; i++) {
    if (cookies[i].includes("eyesopenID")) {
      return cookies[i].split("=")[1];
    }
  }
}

function copyToClipboard() {
  const copyText = document.getElementById("roomcode-copy");
  navigator.clipboard.writeText(copyText.innerText);
  copyButtonAnimate();
  showClearCheck();
  setTimeout(() => {
    copyButtonAnimate(true);
    showClearCheck(true);
  }, 1500);
}
function showClearCheck(reset = false) {
  if (reset) {
    document.getElementById("check-circle-icon").style.display = "none";
    document.getElementById("copy-button").style.display = "inline";
  } else {
    document.getElementById("copy-button").style.display = "none";
    document.getElementById("check-circle-icon").style.display = "inline";
  }
}
function copyButtonAnimate(reset = false) {
  if (reset) {
    document.getElementById("copy-code").style.backgroundColor =
      "var(--dark-fg-opaque)";
    document.getElementById("roomcode-copy").style.color = "var(--light-fg)";
    document.getElementById("copy-code").style.border =
      "2px solid var(--light-fg)";
  } else {
    document.getElementById("copy-code").style.backgroundColor =
      "hsl(100, 100%, 90%)";
    document.getElementById("roomcode-copy").style.color =
      "hsl(100, 100%, 35%)";
    document.getElementById("copy-code").style.border =
      "2px solid hsl(100, 100%, 90%)";
  }
}
