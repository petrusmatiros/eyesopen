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

function revealLobby() {
  var theLobby = document.getElementById("lobby-without-eyes");
  var theLobbyCode = document.getElementById("lobby-code-container");
  theLobby.style.display = "flex";
  theLobbyCode.style.display = "flex";
}

var test = false;
socket.on("connect", () => {
  socket.emit("checkUser", getPlayerID());
  socket.on("userExists", (userExists) => {
    if (!userExists) {
      resetCookie();
      window.location.href = window.location.href + "/join";
    } else {
      revealLobby();
      var URL = "";
      var room = "";
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
      socket.emit("checkUserApartOfGame", getPlayerID(), room, "app");
      socket.on("apartOfGameApp", (apartOfGame, inProgress, code) => {
        if (apartOfGame && inProgress == true) {
          if (window.location.href.includes("/game") == false) {
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

        // socket.emit("checkInGame", getPlayerID());
        // socket.on("isInGame", (inGame) => {

        // })
        // Copy URL to clipboard

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
        }

        navigator.clipboard.writeText(window.location.href);
        showNotification("copy");

        socket.emit("checkIfHost", getPlayerID(), "visibility");
        socket.on("isHost", (isHost) => {
          if (isHost) {
            canPickRole = isHost;
            console.log("SETTING HOST VISIBILITY");
            document.getElementById("roles").classList.add("selectable");
            var array = document.getElementsByClassName("lobby-role-tag");
            for (var i = 0; i < array.length; i++) {
              array[i].setAttribute("onclick", "selectRole(this)");
              array[i].style.cursor = "pointer";
            }
            var startButton =
              document.getElementsByClassName("lobby-button start");
            startButton[0].style.display = "inline";
          } else {
            console.log("REMOVING HOST VISIBILITY");
            document.getElementById("roles").classList.remove("selectable");
            var array = document.getElementsByClassName("lobby-role-tag");
            for (var i = 0; i < array.length; i++) {
              array[i].setAttribute("onclick", "");
              array[i].style.cursor = "not-allowed";
            }
            var startButton =
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
            } else if (totalUsers < minPlayers) {
              document.getElementById("lobby-req-check-players").style.display =
                "none";
              document.getElementById("lobby-req-cross-players").style.display =
                "inline";
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
                  "Everyone is ready, " + host;
                document.getElementById("player-count").style.color =
                  "var(--good-bg)";
              } else {
                document.getElementById("player-count").style.color =
                  "var(--light-fg)";
                document.getElementById("player-count").innerText =
                  amountUnready + " player(s) not ready";
              }
            }

            socket.on("reqSatisfied", (valid) => {
              if (valid) {
                var start = document.getElementById("start-button");

                start.style.opacity = "100%";
                start.style.cursor = "pointer";
                start.setAttribute("onclick", "startGame()");
              } else {
                var start = document.getElementById("start-button");

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
        // socket.on("roleCountBefore", (roleAmount, amountOfUsers) => {
        //   roleCount = roleAmount;
        //   userCount = amountOfUsers;
        // });

        // // socket.on("roleCountAfter", (userAmount, roleAmount) => {
        // //   roleReqHandler(roleAmount, userAmount);
        // // });

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

        setTimeout(() => {
          socket.emit("refreshReady", getPlayerID());
        }, 300);
        socket.on("ready-status-lobby-refresh", (users) => {
          readyStatusLobby(users)
        });

      });
    }
  });
});

function showNotification(type) {
  if (type == "copy") {
    var theNotification = document.getElementById("lobby-notification");
    theNotification.style.display = "flex";
    theNotification.innerText = "Copied link to clipboard. Share it! ᕕ( ᐛ )ᕗ"
    setTimeout(() => {
      theNotification.style.display = "none";
    }, 5000)
  }
}

function hideNotification() {
  var theNotification = document.getElementById("lobby-notification");
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
  // show caroseul with scroll snap of all role cards
}
function hideCard() {
  var displayContainer = document.getElementById("lobby-rolecard-display-container");
  var displayRole = document.getElementById("lobby-rolecard-display-role");
  var displayDescription = document.getElementById("lobby-rolecard-display-description");
  var displayImage = document.getElementById("lobby-rolecard-display-image");
  var displayMission = document.getElementById("lobby-rolecard-display-mission");
  displayContainer.style.display = "none";
  displayRole.style.display = "none";
  displayDescription.style.display = "none";
  displayImage.style.display = "none";
  displayMission.style.display = "none";
  document.getElementById("overlay-rolecardinfo").style.display = "none";
  document.getElementById("overlay-rolecards").setAttribute("onclick", "hideCard()");
  document.getElementById("adjusted-close").setAttribute("onclick", "hideCard()");
}
function showCard(element) {
  // show overlay
  document.getElementById("overlay-rolecards").setAttribute("onclick", "");
  document.getElementById("adjusted-close").setAttribute("onclick", "");
  var displayContainer = document.getElementById("lobby-rolecard-display-container");
  var displayRole = document.getElementById("lobby-rolecard-display-role");
  var displayDescription = document.getElementById("lobby-rolecard-display-description");
  var displayImage = document.getElementById("lobby-rolecard-display-image");
  var displayMission = document.getElementById("lobby-rolecard-display-mission");
  var targetElementID = element.id.replace("-card", "");
  socket.emit("requestLobbyDisplayCard", getPlayerID(), targetElementID);
  socket.on("fetchedLobbyDisplayCard", (name, team, description, mission) => {
    displayRole.innerText = name;
    displayDescription.innerText = description;
    displayMission.innerText = mission;
    var theSrc = "/assets/rolecards/" + name + ".svg"
    displayImage.src = theSrc;
    if (team.includes("good")) {
      displayRole.classList.add("good-selected-color");
      displayRole.classList.remove("evil-selected-color", "neutral-selected-color");
      displayMission.classList.add("good-selected-color");
      displayMission.classList.remove("evil-selected-color", "neutral-selected-color");
    }
    else if (team.includes("evil")) {
      displayRole.classList.add("evil-selected-color");
      displayRole.classList.remove("good-selected-color", "neutral-selected-color");
      displayMission.classList.add("evil-selected-color");
      displayMission.classList.remove("good-selected-color", "neutral-selected-color");
    }
    else if (team.includes("neutral")) {
      displayRole.classList.add("neutral-selected-color");
      displayRole.classList.remove("good-selected-color", "evil-selected-color");
      displayMission.classList.add("neutral-selected-color");
      displayMission.classList.remove("good-selected-color", "evil-selected-color");
    }
  })
  displayContainer.style.display = "flex";
  displayRole.style.display = "flex";
  displayDescription.style.display = "flex";
  displayImage.style.display = "flex";
  displayMission.style.display = "flex";
  document.getElementById("overlay-rolecardinfo").style.display = "block";
  // overlay should close everything
  // show caroseul with scroll snap of all role cards
}

socket.on("beginClearEvilRoom", (roomToClear) => {
  clearEvilRoom(roomToClear);
});

function clearEvilRoom() {
  socket.emit("clearEvilRoom", getPlayerID(), roomToClear);
}

socket.on("enterGame", () => {
  window.location.href += "/game";
});

function startGame() {
  // if user = inGame true, menu display none
  // if user ingame false, menu display flex
  // navbar, remove lobby code, display none
  // navbar change theme depending on cycle
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
  var lobbyButtons = document.getElementsByClassName(
    "lobby-button-container"
  )[0];
  lobbyButtons.style.display = "flex";
  for (var i = 0; i < users.length; i++) {
    if (users[i].thePlayerID !== undefined && users[i].thePlayerID !== null) {
      if (users[i].readyLobby) {
        var status = document.getElementById(users[i].thePlayerID).parentElement
          .children[1];
        status.innerText = "ready";
        status.id = "status-ready";
      } else if (!users[i].readyLobby) {
        var status = document.getElementById(users[i].thePlayerID).parentElement
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
  if (roles == users) {
    //? same amount of roles as players
    socket.emit("reqHandler", getPlayerID(), "rolesEqualUsers", true);
    document.getElementById("lobby-req-check-roles").style.display = "inline";
    document.getElementById("lobby-req-cross-roles").style.display = "none";
  } else {
    socket.emit("reqHandler", getPlayerID(), "rolesEqualUsers", false);
    document.getElementById("lobby-req-check-roles").style.display = "none";
    document.getElementById("lobby-req-cross-roles").style.display = "inline";
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
  var array = document.getElementsByClassName("lobby-role-tag");
  for (var i = 0; i < array.length; i++) {
    var element = array[i];
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
  var role = element.id;
  socket.emit("pickRole", getPlayerID(), role, op);
}

function toggleLobbyButton(element) {
  if (element.classList.contains("ready")) {
    if (element.classList.toggle("not-ready")) {
      element.innerText = "Unready";
      socket.emit("player-ready", getPlayerID(), "lobby");
    } else {
      element.innerText = "Ready";
      socket.emit("player-unready", getPlayerID(), "lobby");
    }
  }
}

function updatePlayerSlots(host, slots, proxyID) {
  for (var [key, value] of Object.entries(slots)) {
    if (value.taken == true) {
      var slot = document.getElementById(key);
      slot.innerText = value.userName;
      if (value.userID !== undefined) {
        slot.parentElement.id = value.userID;
      }
      slot.parentElement.parentElement.id = "joined";
      var status = slot.parentElement.parentElement.children[1];
      if (value.userID == host) {
        slot.parentElement.parentElement.style.border =
          "2px solid var(--slot-border-joined)";
          slot.parentElement.parentElement.style.backgroundColor = "var(--slot-joined)";
        } else if (value.userID == proxyID) {
          slot.parentElement.parentElement.style.border =
          "2px dashed var(--slot-border-joined)";
          slot.parentElement.parentElement.style.backgroundColor = "var(--slot-joined)";
      } else {
        slot.parentElement.parentElement.style.border =
          "2px solid var(--slot-border-other)";

        
      }
      // status.innerText = "not ready";
    } else if (value.taken == false) {
      var slot = document.getElementById(key);
      slot.innerText = value.userName;
      slot.parentElement.id = value.userID;
      slot.parentElement.parentElement.id = "";
      var status = slot.parentElement.parentElement.children[1];
      status.id = "";
      slot.parentElement.parentElement.style.border =
        "2px solid var(--slot-border-empty)";
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

function copyToClipboard() {
  var copyText = document.getElementById("roomcode-copy");
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
