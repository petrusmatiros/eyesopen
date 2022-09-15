var { Player } = require("./player");

class User {
  constructor(playerID = undefined, name = "") {
    this.playerID = playerID;
    this.name = name;
    // reset every game
    this.player = new Map();
    // reset depending on state
    this.readyLobby = false;
    // Previous games
    this.previous = [];
    // reset every time
    this.inGame = false;
    // depends on room
    this.currentRoom = null;
  }

  reset() {
    this.readyLobby = false;
    this.inGame = false;
  }

  getPlayerID() {
    return this.playerID;
  }
  getName() {
    return this.name;
  }

  getPlayer() {
    return this.player;
  }
  getReadyLobby() {
    return this.readyLobby;
  }

  getInGame() {
    return this.inGame;
  }
  getPrevious() {
    return this.previous;
  }
  addPrevious(previous) {
    this.previous.push(previous);
  }
  removePrevious(previous) {
    this.previous.splice(this.previous.indexOf(previous), 1);
  }
  setPrevious(previous) {
    this.previous = previous;
  }
  getCurrentRoom() {
    return this.currentRoom;
  }
  setPlayerID(playerID) {
    this.playerID = playerID;
  }
  setName(name) {
    this.name = name;
  }
  setPlayer(room, player) {
    this.player.set(room, player);
  }
  getPlayer(room) {
    return this.player.get(room);
  }
  removePlayer(player) {
    this.player.delete(player);
  }
  setReadyLobby(readyLobby) {
    this.readyLobby = readyLobby;
  }

  setInGame(inGame) {
    this.inGame = inGame;
  }
  setCurrentRoom(currentRoom) {
    this.currentRoom = currentRoom;
  }
}

module.exports = {
  User,
};
