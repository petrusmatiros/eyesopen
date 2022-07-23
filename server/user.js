class User {
  constructor(
    playerID=undefined,
    name = "",
  ) {
    this.playerID = playerID;
    this.name = name;
    this.player = null;
    this.readyLobby = false;
    this.readyGame = false;
    this.inGame = false;
    this.currentRoom = null;
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
  getReadyGame() {
    return this.readyGame;
  }
  getInGame() {
    return this.inGame;
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
  setPlayer(player) {
    this.player = player;
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
