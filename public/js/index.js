const domain = "https://eyesopen.petrusmatiros.com";
const socket = io(domain, { secure: true });

const lobby = `${domain}/lobby/`;


socket.on("connect", () => {
  socket.emit("checkUser", getPlayerID());
  socket.on("userExists", (userExists) => {
    if (!userExists) {
      showChangeUsername(false);
      resetCookiePlayerID();
    } else {
      showChangeUsername(true);
      socket.emit("setRoom", getPlayerID());
    }
  });
  addEventListeners();
});

function playIntro() {
  playMusic("introAudio", 60, true);
}
function playMusic(toPlay, vol=100, wait=false) {
  playAudio(toPlay, vol, wait);
}
function playSFX(toPlay, vol=100, wait=false) {
  playAudio(toPlay, vol, wait);
}

function pauseAll() {
  pauseAudio("introAudio");
}

function pauseAudio(toPause) {
  const audio = document.getElementById(toPause);
  const pausePromise = audio.pause();
  if (pausePromise !== undefined) {
    pausePromise.then(_ => {
    })
    .catch(error => {
    });
  }
}

function handleVol(vol) {
  let num = Number(vol);
  
  if (Number.isNaN(num) || num < 0 || num > 100) {
    num = 0.5;
  }
  
  num = Math.round(num * 10) / 10;
  
  if (num >= 1 && num <= 100) {
    num /= 100;
  }
  
  return num;
}

function playAudio(toPlay, vol=100, wait=false) {
  const audio = document.getElementById(toPlay);
  const volume = handleVol(vol);
  if (wait) {
    audio.volume = volume;
    audio.loop = true;
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.then(_ => {
      })
      .catch(error => {
      });
    }
  } else {
    if (audio.paused) {
      audio.volume = volume;
      audio.loop = true;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.then(_ => {
        })
        .catch(error => {
        });
      }
    }
  }
}

function loadPlayersInLobby(slots) {
  const thePlayers = document.getElementById("players");
  const columns = thePlayers.children;
  for (let col = 0; col < columns.length; col++) {
    const array = columns[col];
    for (let i = 0; i < array.length; i++) {
      const currentPlayer = array[i];
      currentPlayer.id = "player-hidden";
      currentPlayer.children[0].id = "";
      currentPlayer.children[0].innerText = "";
    }
  }
  let playerCount = 0;
  let colCount = 0;
  const col1 = document.getElementById("players-col1").children
  const col2 = document.getElementById("players-col2").children
  let currentColumn = col1;
  for (const [key, value] of Object.entries(slots)) {
    
    if (playerCount === 2) {
      colCount++;
      playerCount = 0;
    }

    const playerElement = currentColumn[colCount];
    if (value.userID !== undefined) {
      playerElement.id = "";
      playerElement.children[0].id = value.userID;
      playerElement.children[0].innerText = value.userName;

      if (currentColumn === col1) {
        currentColumn = col2
        playerCount++;
      }
      else if (currentColumn === col2) {
        currentColumn = col1;
        playerCount++;
      }
    } else {
      playerElement.id = "player-hidden";
      playerElement.children[0].id = "";
      playerElement.children[0].innerText = "";
    }
  }
}

socket.on("updateLobbyPlayers", (slots) => {
  loadPlayersInLobby(slots);
})

function hideKick() {
  const overlayPopup = document.getElementById("overlay-popup1");
  overlayPopup.style.display = "none";
  const overlayPopupConfirm = document.getElementById("overlay-popup2");
  overlayPopupConfirm.style.display = "none";
  const kickPopup = document.getElementById("kick");
  kickPopup.style.display = "none";
  const kickPopupConfirm = document.getElementById("kickConfirm");
  kickPopupConfirm.style.display = "none"
}
function displayKick() {
  socket.emit("requestLobbyPlayers", getPlayerID());
  socket.on("fetchLobbyPlayers", (slots) => {
    loadPlayersInLobby(slots)
  })
  const overlayPopup = document.getElementById("overlay-popup1");
  overlayPopup.style.display = "flex";
  
  const kickPopup = document.getElementById("kick");
  kickPopup.style.display = "flex";
}
function hideKickConfirm() {
  const overlayPopupConfirm = document.getElementById("overlay-popup2");
  overlayPopupConfirm.style.display = "none";
  const kickPopupConfirm = document.getElementById("kickConfirm");
  kickPopupConfirm.style.display = "none"
}
function displayKickConfirm() {
  const overlayPopupConfirm = document.getElementById("overlay-popup2");
  overlayPopupConfirm.style.display = "flex";
  const kickPopupConfirm = document.getElementById("kickConfirm");
  kickPopupConfirm.style.display = "flex"
}
let playerToKickID = null;
function kickPlayer(element) {
  const playerContainer = element.parentElement;
  const playerBubble = playerContainer.children[0];
  if (playerBubble.id !== null || playerBubble.id !== undefined) {
    displayKickConfirm();
    document.getElementById("playerToKick").innerText = `Kick ${playerBubble.innerText} from lobby?`
    playerToKickID = playerBubble.id;
  }
}
function kickConfirm() {
  if (playerToKickID !== null) {
    socket.emit("kickPlayer", getPlayerID(), playerToKickID)
    hideKick();
    setTimeout(() => {
      socket.emit("fetchHostRoom", getPlayerID());
      socket.on("hostRoom", (roomCode) => {

        socket.emit("checkRoomCode", roomCode, getPlayerID(), "press");
          socket.on("roomCodeResponsePress", (status) => {
            if (status === "full") {
              displayKick();
            } else {
              setTimeout(() => {
                setLocation(`lobby/${roomCode}`, false);
              }, 100)
            }
          });
      })
    }, 100)
  }
  playerToKickID = null;
}


function showChangeUsername(toShow = false) {
  if (toShow === true) {
    document.getElementById("changeUsername").style.display = "flex";
    document.getElementById("links").style.marginTop = "2.9rem";
  } else if (toShow === false) {
    document.getElementById("links").style.marginTop = "5rem";
    document.getElementById("changeUsername").style.display = "none";
  }
}

socket.on("showChangeUsername", (toShow) => {
  showChangeUsername(toShow);
});


function addEventListeners() {
  const theCodeInput = document.getElementById("code");
  const theUserInput = document.getElementById("inputUser");
  const theChangeNameInput = document.getElementById("inputChangeName");
  const theHostInput = document.getElementById("inputHost");
  document.addEventListener("visibilitychange", (e) => {
    if (document.visibilityState === 'visible') {
      playIntro();
    } else {
      pauseAll();
    }
  });
  theCodeInput.addEventListener("keydown", (e) => {
    if (!e.repeat) {
      if (e.key !== null) {
        if (e.key === "Enter") {
          checkRoomCode();
        }
      }
    }
  });
  theUserInput.addEventListener("keydown", (e) => {
    if (!e.repeat) {
      if (e.key !== null) {
        if (e.key === "Enter") {
          checkName(false);
        }
      }
    }
  });
  theChangeNameInput.addEventListener("keydown", (e) => {
    if (!e.repeat) {
      if (e.key !== null) {
        if (e.key === "Enter") {
          changeName();
        }
      }
    }
  });
  theHostInput.addEventListener("keydown", (e) => {
    if (!e.repeat) {
      if (e.key !== null) {
        if (e.key === "Enter") {
          checkName(true);
        }
      }
    }
  });
}
async function animateCards() {
  const cards = ["Villager", "Investigator", "Doctor", "Mayor", "Trapper", "Godfather", "Mafioso", "Surgeon", "Witch", "Framer", "Jester", "Serial Killer", "Executioner", "Lawyer"];
  const container = document.getElementsByClassName("animated-cards-container")[0];
  for (let row = 0; row < container.children.length; row++) {
    const seen = [];
    let i = 0;
    while (true) {
      if (i === cards.length) {
        break;
      }
      const rand = random(0, cards.length - 1);
      if (!seen.includes(cards[rand])) {
        seen.push(cards[rand]);
        const element = document.createElement("img");
        element.alt = `${cards[rand]} card`
        const imgClass = "animated-card";
        element.classList.add(imgClass)
        element.loading = "lazy";
        element.fetchPriority = "low";
        element.decoding = "async";
        const imgSrc = "/assets/rolecards/";
        element.src = `${imgSrc + cards[rand]}.webp`;
        i++;
        container.children[row].append(element);
      }
    }
  }
}

async function animateTitle() {
  const titles = document.getElementsByClassName("title-eyesopen");
  if (titles) {
    const title1 = titles[0];
    const title2 = titles[1];
    const title3 = titles[2];
    title1.classList.remove("hidden");
    for (let i = 0; i < titles.length; i++) {
      titles[i].classList.remove("gelatine-light");
    }
    title1.setAttribute("data-label","active_title");
    if (title1 && title2 && title3) {

      setInterval(() => {
        if (title1.getAttribute("data-label") === "active_title") {
          title2.setAttribute("data-label","active_title");
          title2.classList.remove("hidden");
          title1.removeAttribute("data-label");
          title1.classList.add("hidden");
          title3.removeAttribute("data-label");
          title3.classList.add("hidden");
        } 
        else if (title2.getAttribute("data-label") === "active_title") {
          title3.setAttribute("data-label","active_title");
          title3.classList.remove("hidden");
          title2.removeAttribute("data-label");
          title2.classList.add("hidden");
          title1.removeAttribute("data-label");
          title1.classList.add("hidden");
        }
        else if (title3.getAttribute("data-label") === "active_title") {
          title1.setAttribute("data-label","active_title");
          title1.classList.remove("hidden");
          title3.removeAttribute("data-label");
          title3.classList.add("hidden");
          title2.removeAttribute("data-label");
          title2.classList.add("hidden");
        }
      }, 200);
    }
  }
}

animateTitle();
animateCards();

function random(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * [resetCookiePlayerID resets the playerID cookie to null]
 */
function resetCookiePlayerID(override = false) {
  if (override) {
    console.log("cookie was reset to null");
    document.cookie = "eyesopenID=null; path=/";
  } else {
    if (getPlayerID() !== "null" && getPlayerID() !== undefined) {
      console.log("ID exists before user, setting to null");
      document.cookie = "eyesopenID=null; path=/";
    } else if (getPlayerID() === undefined) {
      console.log("ID is undefined, setting to null");
      document.cookie = "eyesopenID=null; path=/";
    } else if (getPlayerID() === "null") {
      console.log("ID is already null");
    }
  }
}

/**
 * [setLocation sets the location of the window to the specified URL]
 *
 * @param   {[string]}  URL    [URL is the specified URL string to set the location to]
 * @param   {[boolean]}  reset  [reset sets the playerID cookie to null if true]
 *
 */
function setLocation(URL, reset = false) {
  if (reset) {
    resetCookiePlayerID();
  }
  navigator.clipboard.writeText(domain + URL);
  window.location.href = URL;
}

const fiveHours = 60 * 60 * 5;

function requestID(inputVal = "", isHost = "") {
  console.log("You connect with id", socket.id);
  socket.emit("requestID", socket.id, getPlayerID());
  socket.on("playerID", (playerID) => {
    console.log("playerID received from server:", playerID);
    if (playerID == null) {
      window.location.reload();
    } else {
      console.log("playerID from server:", playerID);
      if (getPlayerID() === "null") {
        document.cookie = `eyesopenID=${playerID}; path=/; max-age=${fiveHours}; SameSite=Lax`;
        socket.emit("completedID", getPlayerID());
      }
      if (isHost === true) {
        createUserHost(inputVal);
      } else if (isHost === false) {
        createUserNotHost(inputVal);
      }
    }
  });
}

function getPlayerID() {
  const cookies = document.cookie.split(";");
  for (let i = 0; i < cookies.length; i++) {
    if (cookies[i].includes("eyesopenID")) {
      return cookies[i].split("=")[1];
    }
  }
}

function closeCard() {
  document.getElementById("overlay").style.display = "none";
  hideUser();
  hideHost();
  hideJoin();
  hideChangeUsername();
}

function checkIfSessionExists() {
  if (getPlayerID() !== "null") {
    return true;
  }
  return false;
}

function displayUser() {
  if (!checkIfSessionExists()) {
    document.getElementById("overlay").style.display = "block";
    document.getElementById("user").style.display = "flex";
    document.getElementById("inputUser").focus();
  } else {
    displayJoin();
  }
}
function displayChangeUsername() {
  if (checkIfSessionExists()) {
    socket.emit("requestUsername", getPlayerID());
    socket.on("fetchedUsername", (username) => {
      const input = document.getElementById("inputChangeName");
      document.getElementById("overlay").style.display = "block";
      document.getElementById("changeName").style.display = "flex";
      input.focus();
      input.value = username;
    });
    
  }
}
function hideUser() {
  document.getElementById("inputUser").blur();
  document.getElementById("overlay").style.display = "none";
  document.getElementById("user").style.display = "none";
  document.getElementById("user-help").style.display = "none";
  document.getElementById("inputUser").value = "";
  document.getElementById("inputUser").style.border = "2px solid #b1b1b1";
}
function hideChangeUsername() {
  document.getElementById("inputChangeName").blur();
  document.getElementById("overlay").style.display = "none";
  document.getElementById("changeName").style.display = "none";
  document.getElementById("changeName-help").style.display = "none";
  document.getElementById("inputChangeName").value = "";
  document.getElementById("inputChangeName").style.border = "2px solid #b1b1b1";
}

function displayHost() {
  if (!checkIfSessionExists()) {
    document.getElementById("overlay").style.display = "block";
    document.getElementById("host").style.display = "flex";
    document.getElementById("inputHost").focus();
  } else {
    socket.emit("createRoom", getPlayerID());
    socket.emit("fetchHostRoom", getPlayerID());
    socket.on("hostRoom", (roomCode) => {
      if (roomCode == null) {
        window.location.reload();
      } else {
        console.log(roomCode);
        socket.emit("checkRoomCode", roomCode, getPlayerID(), "press");
        socket.on("roomCodeResponsePress", (status) => {
          if (status === "full") {
            displayKick();
          } else {
            setTimeout(() => {
              setLocation(`lobby/${roomCode}`, false);
            }, 100)
          }
        });
      }
    });
  }
}
function hideHost() {
  document.getElementById("inputHost").blur();
  document.getElementById("overlay").style.display = "none";
  document.getElementById("host").style.display = "none";
  document.getElementById("host-help").style.display = "none";
  document.getElementById("inputHost").value = "";
  document.getElementById("inputHost").style.border = "2px solid #b1b1b1";
}

function UserInputDone() {
  hideUser();
  displayJoin();
}
function ChangeUsernameDone() {
  hideChangeUsername();
  showNotification("newName");
}

function UserInputDoneHost(roomCode) {
  hideHost();
  // to a new room
  setLocation(`lobby/${roomCode}`, false);
}

function displayJoin() {
  document.getElementById("overlay").style.display = "block";
  document.getElementById("join-room").style.display = "flex";
  document.getElementById("code").focus();
}

function hideJoin() {
  document.getElementById("code").blur();
  document.getElementById("overlay").style.display = "none";
  document.getElementById("join-room").style.display = "none";
  document.getElementById("join-help").style.display = "none";
  document.getElementById("code").value = "";
  document.getElementById("code").style.border = "2px solid #b1b1b1";
}

function roomCodeError() {
  document.getElementById("join-help").style.display = "flex";
  document.getElementById("code").style.border = "2px solid hsl(0, 100%, 45%)";
  document.getElementById("join-help").innerText =
    "Code needs to be 5 characters long";
}

function roomCodeCorrect() {
  document.getElementById("join-help").style.display = "none";
  document.getElementById("code").style.border =
    "2px solid hsl(123, 100%, 45%)";
}

function roomCodeInvalid() {
  document.getElementById("join-help").style.display = "flex";
  document.getElementById("code").style.border = "2px solid hsl(0, 100%, 45%)";
  document.getElementById("join-help").innerText =
    "Code is invalid. Room doesn't exist";
}
function roomFull() {
  document.getElementById("join-help").style.display = "flex";
  document.getElementById("code").style.border = "2px solid hsl(0, 100%, 45%)";
  document.getElementById("join-help").innerText = "The room is full";
}
function roomInProgress() {
  document.getElementById("join-help").style.display = "flex";
  document.getElementById("code").style.border = "2px solid hsl(0, 100%, 45%)";
  document.getElementById("join-help").innerText =
    "The room is currently in progress";
}

function join(inputVal) {
  setLocation(`lobby/${inputVal}`, false);
}

function checkRoomCode() {
  requestID();
  const inputVal = document.getElementById("code").value.toUpperCase();
  socket.emit("checkRoomCode", inputVal, getPlayerID(), "press");
  if (inputVal.length !== 5) {
    roomCodeError();
  } else {
    socket.emit("checkUserApartOfGame", getPlayerID(), "index");
    socket.on("apartOfGameIndex", (apartOfGame, inProgress, code) => {
      if (apartOfGame) {
        roomCodeCorrect();
        join(inputVal);
      }
    });
    socket.on("roomCodeResponsePress", (status) => {
      if (status === "valid") {
        roomCodeCorrect();
        join(inputVal);
      } else if (status === "invalid") {
        roomCodeInvalid();
      } else if (status === "full") {
        roomFull();
      }
    });
  }
  // check if room exists (has been created)
  // to the room that already exists
}

function hostNameShortError() {
  document.getElementById("host-help").style.display = "flex";
  document.getElementById("inputHost").style.border =
    "2px solid hsl(0, 100%, 45%)";
  document.getElementById("host-help").innerText =
    "Username needs to be at least 1 character(s) long";
}
function userNameShortError() {
  document.getElementById("user-help").style.display = "flex";
  document.getElementById("inputUser").style.border =
    "2px solid hsl(0, 100%, 45%)";
  document.getElementById("user-help").innerText =
    "Username needs to be at least 1 character(s) long";
}
function changeUsernameShortError() {
  document.getElementById("changeName-help").style.display = "flex";
  document.getElementById("inputChangeName").style.border =
    "2px solid hsl(0, 100%, 45%)";
  document.getElementById("changeName-help").innerText =
    "Username needs to be at least 1 character(s) long";
}

function hostNameCorrect() {
  document.getElementById("host-help").style.display = "none";
  document.getElementById("inputHost").style.border =
    "2px solid hsl(123, 100%, 45%)";
}
function userNameCorrect() {
  document.getElementById("user-help").style.display = "none";
  document.getElementById("inputUser").style.border =
    "2px solid hsl(123, 100%, 45%)";
}

function changeName() {
  const inputVal = document.getElementById("inputChangeName").value;
  if (inputVal.length < 1) {
    changeUsernameShortError();
  } else {
    socket.emit("changeUsername", getPlayerID(), inputVal);
    ChangeUsernameDone();
  }
}

function showNotification(type) {
  if (type === "newName") {
    const theNotification = document.getElementById("index-notification");
    theNotification.style.display = "flex";
    theNotification.innerText = "Username has been updated! (~‾⌣‾)~";
    setTimeout(() => {
      theNotification.style.display = "none";
    }, 5000);
  }
}

function hideNotification() {
  const theNotification = document.getElementById("index-notification");
  theNotification.style.display = "none";
}

function checkName(isHost) {
  if (isHost) {
    const inputVal = document.getElementById("inputHost").value;
    if (inputVal.length < 1) {
      hostNameShortError();
    } else {
      requestID(inputVal, true);
    }
  } else {
    const inputVal = document.getElementById("inputUser").value;
    if (inputVal.length < 1) {
      userNameShortError();
    } else {
      requestID(inputVal, false);
    }
  }
  // check if room exists (has been created)
}

function createUserHost(inputVal) {
  socket.emit("createUser", inputVal, getPlayerID());
  socket.emit("createRoom", getPlayerID());
  hostNameCorrect();
  socket.emit("fetchHostRoom", getPlayerID());
  socket.on("hostRoom", (roomCode) => {
    if (roomCode == null) {
      window.location.reload();
    } else {
      console.log(roomCode);
      UserInputDoneHost(roomCode);
    }
  });
}
function createUserNotHost(inputVal) {
  socket.emit("createUser", inputVal, getPlayerID());
  userNameCorrect();
  UserInputDone();
}
