if (document.cookie.split(";").length <= 1) {
  document.cookie = "eyesopenID=null";
}
console.log(document.cookie.split(";").length)

function displayUsername() {
  document.getElementById("overlay").style.display = "block";
  document.getElementById("username").style.display = "flex";
}
function hideUsername() {
  document.getElementById("overlay").style.display = "none";
  document.getElementById("username").style.display = "none";
  document.getElementById("username-help").style.display = "none";
  document.getElementById("inputUsername").value = "";
  document.getElementById("inputUsername").style.border = "2px solid #b1b1b1";
}

function displayHost() {
  document.getElementById("overlay").style.display = "block";
  document.getElementById("host").style.display = "flex";
}
function hideHost() {
  document.getElementById("overlay").style.display = "none";
  document.getElementById("host").style.display = "none";
  document.getElementById("host-help").style.display = "none";
  document.getElementById("inputHost").value = "";
  document.getElementById("inputHost").style.border = "2px solid #b1b1b1";
}

function UserInputDone() {
  hideUsername();
  displayJoin();
}

function UserInputDoneHost() {
  hideHost();
  // to a new room
  window.location = "/lobby.html";
}

function displayJoin() {
  document.getElementById("overlay").style.display = "block";
  document.getElementById("join-room").style.display = "flex";
}

function hideJoin() {
  document.getElementById("overlay").style.display = "none";
  document.getElementById("join-room").style.display = "none";
  document.getElementById("join-help").style.display = "none";
  document.getElementById("code").value = "";
  document.getElementById("code").style.border = "2px solid #b1b1b1";
}

function checkRoomCode() {
  var inputVal = document.getElementById("code").value;
  if (inputVal.length !== 5) {
    document.getElementById("join-help").style.display = "flex";
    document.getElementById("code").style.border =
      "2px solid hsl(0, 100%, 45%)";
    document.getElementById("join-help").innerText =
      "Code needs to be 5 characters long";
  } else {
    document.getElementById("join-help").style.display = "none";
    document.getElementById("code").style.border =
      "2px solid hsl(123, 100%, 45%)";
  }
  // check if room exists (has been created)
  // to the room that already exists
  window.location = "/lobby.html";
}

function checkUsername(isHost) {
  if (isHost) {
    var inputVal = document.getElementById("inputHost").value;
    if (inputVal.length < 1) {
      document.getElementById("host-help").style.display = "flex";
      document.getElementById("inputHost").style.border =
        "2px solid hsl(0, 100%, 45%)";
      document.getElementById("host-help").innerText =
        "Username needs to be atleast 1 character(s) long";
    } else {
      document.getElementById("host-help").style.display = "none";
      document.getElementById("inputHost").style.border =
        "2px solid hsl(123, 100%, 45%)";
      UserInputDoneHost();
    }
  } else {
    var inputVal = document.getElementById("inputUsername").value;
    if (inputVal.length < 1) {
      document.getElementById("username-help").style.display = "flex";
      document.getElementById("inputUsername").style.border =
        "2px solid hsl(0, 100%, 45%)";
      document.getElementById("username-help").innerText =
        "Username needs to be atleast 1 character(s) long";
    } else {
      document.getElementById("username-help").style.display = "none";
      document.getElementById("inputUsername").style.border =
        "2px solid hsl(123, 100%, 45%)";
      UserInputDone();
    }
  }
  // check if room exists (has been created)
}
