const domain = "https://eyesopen.up.railway.app/";
const socket = io(domain, {secure: true});

const lobby = domain + "lobby/";

socket.on("connect", () => {
  socket.emit("checkUser", getPlayerID());
  socket.on("userExists", (userExists) => {
    if (!userExists) {
      resetCookiePlayerID();
    } else {
      socket.emit("setRoom", getPlayerID());
    }
  });
});

var theHeader = document.getElementById("header");
var preFix = "Beep Boop";
var robotFrames = ["└[∵]┘", "┌[∵]┐"];

setInterval(() => {
  var rand = random(0, robotFrames.length - 1);
  theHeader.innerText = preFix + " " + robotFrames[rand];
}, 850);

function random(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

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
