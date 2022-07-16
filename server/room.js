class Room {
  constructor(host) {
    this.users = [];
    this.roles = [];
    this.slots = {
      slot1: {
        taken: false,
        userID: undefined,
        userName: null,
      },
      slot2: {
        taken: false,
        userID: undefined,
        userName: null,
      },
      slot3: {
        taken: false,
        userID: undefined,
        userName: null,
      },
      slot4: {
        taken: false,
        userID: undefined,
        userName: null,
      },
      slot5: {
        taken: false,
        userID: undefined,
        userName: null,
      },
      slot6: {
        taken: false,
        userID: undefined,
        userName: null,
      },
      slot7: {
        taken: false,
        userID: undefined,
        userName: null,
      },
      slot8: {
        taken: false,
        userID: undefined,
        userName: null,
      },
      slot9: {
        taken: false,
        userID: undefined,
        userName: null,
      },
      slot10: {
        taken: false,
        userID: undefined,
        userName: null,
      },
      slot11: {
        taken: false,
        userID: undefined,
        userName: null,
      },
      slot12: {
        taken: false,
        userID: undefined,
        userName: null,
      },
      slot13: {
        taken: false,
        userID: undefined,
        userName: null,
      },
      slot14: {
        taken: false,
        userID: undefined,
        userName: null,
      },
    };
    this.inProgress = false;
    this.isDone = false;
    this.host = host;
  }

  getProgress() {
    return this.inProgress;
  }

  setProgress(progress) {
    this.inProgress = progress;
  }

  getDone() {
    return this.isDone;
  }

  setDone(done) {
    this.isDone = done;
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
