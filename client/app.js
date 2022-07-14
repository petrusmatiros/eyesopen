const socket = io(`http://localhost:3000/`);
// const socket = io("http://192.168.1.203:3000/");


// const oneHour = 60 * 60;
// const five = 5;
// import Player from "./player.js";
// import User from "./user.js";
socket.on("connect", () => {
  if (getPlayerID() !== "null") {
    socket.emit("setOwnRoom", getPlayerID());
    socket.emit("setCreatedRoom", getPlayerID());
    socket.on("joiningRoom", (roomCode) => {
      socket.emit("joinedRoom", getPlayerID(), roomCode);
    } )
  }
  socket.emit("joinedLobby", getPlayerID());
  socket.on("viewRoom", (roomCode) => {
    document.getElementById("roomcode-copy").innerText = roomCode;
  });
});


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
