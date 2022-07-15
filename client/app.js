
const socket = io("http://localhost:3000");
// const socket = io("http://192.168.1.203:3000/");

/**
 * [resetCookie resets the playerID cookie to null]
 */
 function resetCookie(override=false) {
  if (override) {
    console.log("cookie was reset to null");
    document.cookie = "eyesopenID=null";
  }
  if (!document.cookie.valueOf("eyesopenID")) {
    console.log("cookie was set to null");
    document.cookie = "eyesopenID=null";
  } else {
    console.log("cookie is already null");
  }
}

socket.on("connect", () => {
  resetCookie();
  socket.on("clearCookie", () => {
    var override = true;
    resetCookie(override)
  })
  if (getPlayerID() !== "null") {
    socket.emit("setRoom", getPlayerID());
  }
  socket.emit("joinedLobby", getPlayerID());
  socket.on("viewRoom", (roomCode) => {
    document.getElementById("roomcode-copy").innerText = roomCode;
  });
  socket.on("joinPlayerSlot", (user) => {
    socket.emit("requestPlayerSlot", getPlayerID());
  })
  socket.on("playerSlots", (slots) => {
    updatePlayerSlots(slots);
  })
});


function updatePlayerSlots(slots) {
  console.log(slots)
  for  (var [key, value] of Object.entries(slots)) {
    if (value.taken == true) {
      var slot = document.getElementById(key);
      slot.innerText = value.userName;
      slot.id = value.userID;
      slot.parentElement.id = "joined"
    }
  }
}

function getPlayerID() {
  var cookie = document.cookie.valueOf("eyesopenID");
  var wantedCookie = cookie.split("=");
  return wantedCookie[1];
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
    document.getElementById("copy-code").style.boxShadow = "0 0 0 0px hsl(100, 100%, 40%)";
  } else {
    document.getElementById("copy-code").style.boxShadow =
      "0 0 0 2px hsl(100, 100%, 40%)";
  }
}
