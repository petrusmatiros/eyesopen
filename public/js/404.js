// const domain = "https://84.216.161.205/";
const domain = "https://eyesopen.ml/";
const socket = io(domain, {secure: true});
// const socket = io(domain);


const lobby = domain + "lobby/";


socket.on("connect", () => {
  socket.emit("checkUser", getPlayerID());
  socket.on("userExists", (userExists) => {
    if (!userExists) {
      resetCookie();
    } else {
      socket.emit("setRoom", getPlayerID());
    }
    animateRobot();
  });
});

function random(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function animateRobot() {
  var theHeader = document.getElementById("header");
  var preFix = "Beep Boop";
  var robotFrames = ["└[∵]┘", "┌[∵]┐"];
  
  setInterval(() => {
    var rand = random(0, robotFrames.length - 1);
    theHeader.innerText = preFix + " " + robotFrames[rand]
  }, 850)
}

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
