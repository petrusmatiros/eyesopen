export default class User {
  constructor(playerID, name, player) {
    this.playerID = playerID;
    this.name = name;
    this.player = player;
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
  setInGame(inGame) {
    this.inGame = inGame;
  }
  setCurrentRoom(currentRoom) {
    this.currentRoom = currentRoom;
  }
}
