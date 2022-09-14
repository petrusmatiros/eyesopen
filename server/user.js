var { Player } = require("./player");

class User {
  constructor(
    playerID=undefined,
    name = "",
  ) {
    this.playerID = playerID;
    this.name = name;
    // clear after every game
    this.messages = [];
    // reset every game
    this.player = new Map();
    // reset depending on state
    this.readyLobby = false;
    this.readyGame = false;
    // Previous games
    this.previous = [];
    // reset every time
    this.inGame = false;
    // depends on room
    this.currentRoom = null;
  }

  reset() {
    this.messages = [];
    this.readyGame = false;
    this.readyLobby = false;
    this.inGame = false;
  }

  getPlayerID() {
    return this.playerID;
  }
  getName() {
    return this.name;
  }
  getMessages() {
    return this.messages;
  }
  addMessage(message) {
    this.messages.push(message)
  }
  removeMessage(message) {
    this.messages.splice(this.messages.indexOf(message), 1);
  }
  getPlayer() {
    return this.player;
  }
  getReadyLobby() {
    return this.readyLobby;
  }
  getReadyGame() {
    return this.readyGame;
  }
  getInGame() {
    return this.inGame;
  }
  getPrevious() {
    return this.previous;
  }
  addPrevious(previous) {
    this.previous.push(previous)
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
  setReadyGame(readyGame) {
    this.readyGame = readyGame;
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
