var { Game } = require("./game");

class Room {
  constructor(host) {
    this.users = [];
    this.roles = [];
    this.slots = {
      slot1: {
        taken: false,
        userID: undefined,
        userName: "",
      },
      slot2: {
        taken: false,
        userID: undefined,
        userName: "",
      },
      slot3: {
        taken: false,
        userID: undefined,
        userName: "",
      },
      slot4: {
        taken: false,
        userID: undefined,
        userName: "",
      },
      slot5: {
        taken: false,
        userID: undefined,
        userName: "",
      },
      slot6: {
        taken: false,
        userID: undefined,
        userName: "",
      },
      slot7: {
        taken: false,
        userID: undefined,
        userName: "",
      },
      slot8: {
        taken: false,
        userID: undefined,
        userName: "",
      },
      slot9: {
        taken: false,
        userID: undefined,
        userName: "",
      },
      slot10: {
        taken: false,
        userID: undefined,
        userName: "",
      },
      slot11: {
        taken: false,
        userID: undefined,
        userName: "",
      },
      slot12: {
        taken: false,
        userID: undefined,
        userName: "",
      },
      slot13: {
        taken: false,
        userID: undefined,
        userName: "",
      },
      slot14: {
        taken: false,
        userID: undefined,
        userName: "",
      },
    };
    this.game = new Game();
    this.host = host;
  }

  getUsers() {
    return this.users;
  }
  
  addUser(user) {
    this.users.push(user);
  }

  removeUser(user) {
    this.users.splice(this.users.indexOf(user), 1);
  }

  userCount() {
    this.users.length;
  }

  getRoles() {
    return this.roles;
  }

  addRole(role) {
    this.roles.push(role);
  }

  removeRole(role) {
    this.roles.splice(this.roles.indexOf(role), 1);
  }

  roleCount() {
    this.roles.length;
  }

  getHost() {
    return this.host;
  }

  setHost(host) {
    this.host = host;
  }
}
module.exports = {
  Room,
};
