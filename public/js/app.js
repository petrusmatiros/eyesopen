const socket = io("http://localhost:3000");
// const socket = io("http://192.168.1.203:3000/");

/**
 * [resetCookie resets the playerID cookie to null]
 */
 function resetCookie(override = false) {
  // !! PERHAPS REMOVE?
  if (override) {
    console.log("cookie was reset to null");
    document.cookie = "eyesopenID=null";
  } else {
    if (getPlayerID() !== 'null' && getPlayerID() !== undefined) {
      console.log("ID exists before user, setting to null");
      document.cookie = "eyesopenID=null";
    } else if (getPlayerID() == undefined) {
      console.log("ID is undefined, setting to null")
      document.cookie = "eyesopenID=null";
    } else if (getPlayerID() == "null") {
      console.log("ID is already null");
    }
  }
}

socket.on("connect", () => {
  socket.emit("checkUser", getPlayerID())
  socket.on("userExists", (userExists) => {
    if (!userExists) {
      resetCookie();
      if (window.location.href !== 'http://localhost:3000/lobby/') {
        window.location.href =  window.location.href + '/join'; 
      }
    } else {
      // USER EXISTS
      // !! IMPLEMENT AJAX
      socket.emit("setRoom", getPlayerID());
      socket.emit("joinedLobby", getPlayerID());
      socket.on("viewRoom", (roomCode) => {
        document.getElementById("roomcode-copy").innerText = roomCode;
      });
      socket.on("joinPlayerSlot", (user) => {
        socket.emit("requestPlayerSlot", getPlayerID());
      });
      socket.on("playerSlots", (slots) => {
        updatePlayerSlots(slots);
      });
    };
  });
});

function updatePlayerSlots(slots) {
  for (var [key, value] of Object.entries(slots)) {
    if (value.taken == true) {
      var slot = document.getElementById(key);
      slot.innerText = value.userName;
      slot.id = value.userID;
      slot.parentElement.id = "joined";
      var status = slot.parentElement.children[1];
      status.id = "status-notready";
      // status.innerText = "not ready";
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
