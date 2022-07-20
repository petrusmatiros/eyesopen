const socket = io("http://localhost:3000");
// const socket = io("http://192.168.1.203:3000/");

const domain = "http://localhost:3000/";
const lobby = "http://localhost:3000/lobby/";

/**
 * [resetCookie resets the playerID cookie to null]
 */
 function resetCookie(override = false) {
  if (override) {
    console.log("cookie was reset to null");
    document.cookie = "eyesopenID=null; path=/";
  } else {
    if (getPlayerID() !== 'null' && getPlayerID() !== undefined) {
      console.log("ID exists before user, setting to null");
      document.cookie = "eyesopenID=null; path=/";
    } else if (getPlayerID() == undefined) {
      console.log("ID is undefined, setting to null")
      document.cookie = "eyesopenID=null; path=/";
    } else if (getPlayerID() == "null") {
      console.log("ID is already null");
    }
  }
}
var test = false;
socket.on("connect", () => {
  socket.emit("checkUser", getPlayerID())
  socket.on("userExists", (userExists) => {
    if (!userExists) {
      resetCookie();
      if (window.location.href !== lobby) {
        window.location.href =  window.location.href + '/join'; 
      }
    } else {
      if (window.location.href !== lobby) {
        var URL = window.location.href.replace("http://", "");
        var room = URL.split("/")[URL.split("/").length - 1];
        socket.emit("setRoom", getPlayerID());
        socket.emit("directJoin", getPlayerID(), room);
      } else {
        // USER EXISTS
        // !! IMPLEMENT AJAX
        socket.emit("setRoom", getPlayerID());
        socket.emit("joinedLobby", getPlayerID());
      }
      socket.on("viewRoom", (roomCode) => {
        document.getElementById("roomcode-copy").innerText = roomCode;
      });
      socket.on("joinPlayerSlot", () => {
        socket.emit("requestPlayerSlot", getPlayerID());
      });
      socket.on("playerSlots", (host, slots) => {
        updatePlayerSlots(host, slots);
        console.log("updated player slots")
      });
      socket.on("getPlayerCount", getPlayerID());
      socket.on("viewPlayerCount", (amountUnready, hostExists) => {
        if (!hostExists) {
          document.getElementById("player-count").innerText = "Host is not in room";
        } else {
          if (amountUnready == 0) {
            document.getElementById("player-count").innerText = "Everyone is ready!";
          } else {
            document.getElementById("player-count").innerText = amountUnready + " player(s) not ready";
          }
        }
      })
    };
  });
});


function updatePlayerSlots(host, slots) {
  for (var [key, value] of Object.entries(slots)) {
    if (value.taken == true) {
      var slot = document.getElementById(key);
      slot.innerText = value.userName;
      slot.parentElement.id = value.userID;
      slot.parentElement.parentElement.id = "joined";
      var status = slot.parentElement.parentElement.children[1];
      status.id = "status-notready";
      if (value.userID == host) {
        slot.parentElement.parentElement.style.border = "2px solid var(--dark-fg)";
      }
      // status.innerText = "not ready";
    } else if (value.taken == false) {
      var slot = document.getElementById(key);
      slot.innerText = value.userName;
      slot.parentElement.id = value.userID;
      slot.parentElement.parentElement.id = "";
      var status = slot.parentElement.parentElement.children[1];
      status.id = "";
      slot.parentElement.parentElement.style.border = "0px solid var(--dark-fg)";
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
      "var(--light-bg)";
    document.getElementById("roomcode-copy").style.color = "var(--dark-fg)";
  } else {
    document.getElementById("copy-code").style.backgroundColor =
      "hsl(100, 100%, 90%)";
    document.getElementById("roomcode-copy").style.color =
      "hsl(100, 100%, 35%)";
  }
}
