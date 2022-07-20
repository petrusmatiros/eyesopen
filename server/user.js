class User {
  constructor(
    playerID=undefined,
    name = "",
  ) {
    this.playerID = playerID;
    this.name = name;
    this.player = null;
    this.ready = false;
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
