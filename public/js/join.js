const domain = "https://eyesopen.petrusmatiros.com";
const socket = io(domain, { secure: true });

const lobby = `${domain}/lobby/`;

socket.on("connect", () => {
	socket.emit("checkUser", getPlayerID());
	socket.on("userExists", (userExists) => {
		if (!userExists) {
			resetCookiePlayerID();
		} else {
			socket.emit("setRoom", getPlayerID());
			const URL = window.location.href.replace("http://", "");
			const room = URL.split("/")[URL.split("/").length - 2];
			socket.emit("checkRoomCode", room, getPlayerID(), "first");
			socket.on("roomCodeResponseFirst", (status) => {
				console.log("roomCodeResponseFirst", status);
				console.log("lobby", lobby);
				console.log("room", room);
				console.log("playerID", getPlayerID());
				if (status === "full") {
					window.location.href = domain;
				} else if (status === "valid") {
					window.location.href = lobby + room;
				}
			});
		}
	});
	addEventListeners();
	setFocus();
});

function addEventListeners() {
	const theUserInput = document.getElementById("inputUser");
	theUserInput.addEventListener("keydown", (e) => {
		if (!e.repeat) {
			if (e.key !== null) {
				if (e.key === "Enter") {
					checkDirectName();
				}
			}
		}
	});
}

function setFocus() {
	const user = document.getElementById("user");
	user.style.display = "flex";
	document.getElementById("inputUser").focus();
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
function setLocation(URL) {
  window.location.href = URL;
}

const fiveHours = 60 * 60 * 5;

function requestID(inputVal) {
	console.log("You connect with id", socket.id);
	socket.emit("requestID", socket.id, getPlayerID());
	socket.on("playerID", (playerID) => {
		console.log("playerID from server:", playerID);
		if (playerID == null) {
			window.location.reload();
		} else {
			if (getPlayerID() === "null") {
				document.cookie = `eyesopenID=${playerID}; path=/; max-age=${fiveHours}; SameSite=Lax`;
				socket.emit("completedID", getPlayerID());
			}

			socket.emit("createUser", inputVal, getPlayerID());
			const URL = window.location.href.replace("http://", "");
			const room = URL.split("/")[URL.split("/").length - 2];
			socket.emit("checkRoomCode", room, getPlayerID(), "press");
			socket.on("roomCodeResponsePress", (status) => {
				if (status === "full") {
					roomFull();
				} else if (status === "valid") {
					join(room);
				}
			});
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
}

function checkIfSessionExists() {
	socket.emit("checkUser", getPlayerID());
	socket.on("userExists", (userExists) => {
		if (userExists) {
			return true;
		}
		return false;
	});
}

function hideUser() {
	document.getElementById("overlay").style.display = "none";
	document.getElementById("user").style.display = "none";
	document.getElementById("join-help").style.display = "none";
	document.getElementById("inputUser").value = "";
	document.getElementById("inputUser").style.border = "2px solid #b1b1b1";
}

function UserInputDone() {
	hideUser();
}

function roomFull() {
	document.getElementById("join-help").style.display = "flex";
	document.getElementById("inputUser").style.border =
		"2px solid hsl(0, 100%, 45%)";
	document.getElementById("join-help").innerText = "The room is full";
}
function roomInProgress() {
	document.getElementById("join-help").style.display = "flex";
	document.getElementById("inputUser").style.border =
		"2px solid hsl(0, 100%, 45%)";
	document.getElementById("join-help").innerText =
		"The room is currently in progress";
}

function userNameShortError() {
	document.getElementById("join-help").style.display = "flex";
	document.getElementById("inputUser").style.border =
		"2px solid hsl(0, 100%, 45%)";
	document.getElementById("join-help").innerText =
		"Username needs to be at least 1 character(s) long";
}

function userNameCorrect() {
	document.getElementById("join-help").style.display = "none";
	document.getElementById("inputUser").style.border =
		"2px solid hsl(123, 100%, 45%)";
}

function join(room) {
	userNameCorrect();
	UserInputDone();
	setLocation(lobby + room);
}

function checkDirectName() {
	const inputVal = document.getElementById("inputUser").value;
	if (inputVal.length < 1) {
		userNameShortError();
	} else {
		requestID(inputVal);
	}
	// check if room exists (has been created)
}
