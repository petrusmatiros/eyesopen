// const domain = "https://84.216.161.205/";
const domain = "https://eyesopen.ml/";
const socket = io(domain, {secure: true});
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
var test = false;
socket.on("connect", () => {
  socket.emit("checkUser", getPlayerID());
  socket.on("userExists", (userExists) => {
    if (!userExists) {
      resetCookie();
      if (window.location.href !== lobby) {
        window.location.href = window.location.href + "/join";
      }
    } else {

      socket.emit("checkUserApartOfGame", getPlayerID(), "app");

      socket.on("apartOfGameApp", (apartOfGame, inProgress, code) => {
        if (
          (!apartOfGame && inProgress == false) ||
          (apartOfGame && inProgress == true)
        ) {
          if (apartOfGame && inProgress == true) {
            if (window.location.href.includes("/game") == false) {
              window.location.href += "/game";
            }
          } else if (apartOfGame == false && inProgress == true) {
            window.location.href = lobby + code + "/inProgress";
          }

          if (window.location.href !== lobby) {
            var URL = window.location.href.replace("http://", "");
            var room = URL.split("/")[URL.split("/").length - 1];
            socket.emit("setRoom", getPlayerID());
            socket.emit("directJoin", getPlayerID(), room);
          } else {
            // USER EXISTS
            socket.emit("setRoom", getPlayerID());
            socket.emit("joinedLobby", getPlayerID());
          }
          // socket.emit("checkInGame", getPlayerID());
          // socket.on("isInGame", (inGame) => {

          // })

          socket.on("viewRoom", (roomCode) => {
            document.getElementById("roomcode-copy").innerText = roomCode;
          });
          socket.on("joinPlayerSlot", () => {
            socket.emit("requestPlayerSlot", getPlayerID());
          });
          socket.on("playerSlots", (host, slots) => {
            updatePlayerSlots(host, slots);
            console.log("updated player slots");
          });

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
                document.getElementById(
                  "lobby-req-check-players"
                ).style.display = "inline";
                document.getElementById(
                  "lobby-req-cross-players"
                ).style.display = "none";
              } else if (totalUsers < minPlayers) {
                document.getElementById(
                  "lobby-req-check-players"
                ).style.display = "none";
                document.getElementById(
                  "lobby-req-cross-players"
                ).style.display = "inline";
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

          
        }
      });
    }
  });
});

function hideInfo() {
  document.getElementById("overlay").style.display = "none";
  document.getElementById("lobby-rolecard-container").style.display = "none";
}
function showInfo() {
  // show overlay
  document.getElementById("overlay").style.display = "block";
  document.getElementById("lobby-rolecard-container").style.display = "block";
  // overlay should close everything
  // show caroseul with scroll snap of all role cards
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
  var lobbyButtons = document.getElementsByClassName("lobby-button-container")[0];
  lobbyButtons.style.display = "flex";
  for (var i = 0; i < users.length; i++) {
    if (users[i].readyLobby) {
      var status = document.getElementById(users[i].playerID).parentElement
        .children[1];
      status.innerText = "ready";
      status.id = "status-ready";
    } else if (!users[i].readyLobby) {
      var status = document.getElementById(users[i].playerID).parentElement
        .children[1];
      status.innerText = "not ready";
      status.id = "status-notready";
    }
  }
});

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

function updatePlayerSlots(host, slots) {
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
          "2px solid var(--light-fg)";
      } else if (value.userID == getPlayerID()) {
        slot.parentElement.parentElement.style.border =
          "2px dashed var(--light-fg)";
      } else {
        slot.parentElement.parentElement.style.border =
          "2px dashed var(--slot-joined)";
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
        "2px solid var(--slot-empty)";
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
      "var(--dark-fg)";
    document.getElementById("roomcode-copy").style.color = "var(--light-fg)";
    document.getElementById("copy-code").style.border = "2px solid var(--light-fg)";
  } else {
    document.getElementById("copy-code").style.backgroundColor =
      "hsl(100, 100%, 90%)";
    document.getElementById("roomcode-copy").style.color =
      "hsl(100, 100%, 35%)";
    document.getElementById("copy-code").style.border =
      "2px solid hsl(100, 100%, 90%)";
  }
}
