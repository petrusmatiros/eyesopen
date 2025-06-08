const domain = "https://eyesopen.petrusmatiros.com";
const socket = io(domain, {secure: true});

const lobby = `${domain}/lobby/`;

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

const theHeader = document.getElementById("header");
const preFix = "Beep Boop";
const robotFrames = ["└[∵]┘", "┌[∵]┐"];

setInterval(() => {
  const rand = random(0, robotFrames.length - 1);
  theHeader.innerText = `${preFix} ${robotFrames[rand]}`;
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
    } else if (getPlayerID() === undefined) {
      console.log("ID is undefined, setting to null");
      document.cookie = "eyesopenID=null; path=/";
    } else if (getPlayerID() === "null") {
      console.log("ID is already null");
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
