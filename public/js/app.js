const socket = io("http://localhost:3000");
// const socket = io("http://192.168.1.203:3000/");

const domain = "http://localhost:3000/";
const lobby = "http://localhost:3000/lobby/";
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