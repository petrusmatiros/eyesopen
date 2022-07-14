class User {
  constructor(
    playerID,
    name = "",
    player = null,
    ready = false,
    inGame = false,
    currentRoom = null
  ) {
    this.playerID = playerID;
    this.name = name;
    this.player = player;
    this.ready = ready;
    this.inGame = inGame;
    this.currentRoom = currentRoom;
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
  getReady() {
    return this.ready;
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
  setReady(ready) {
    this.ready = ready;
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
