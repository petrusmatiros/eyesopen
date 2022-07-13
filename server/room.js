class Room {
  constructor(host) {
    this.users = [];
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
