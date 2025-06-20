// server set up
import express from "express";
import fs from "node:fs";
import dotenv from "dotenv";
dotenv.config();
const app = express();
// const port = 3000;
// const port = process.env.PORT | 15000;
const port = process.env.PORT;
// var privateKey = fs.readFileSync("sslcert/private.key", "utf8");
// var certificate = fs.readFileSync("sslcert/certificate.crt", "utf8");
// var ca = fs.readFileSync("sslcert/ca_bundle.crt", "utf8");

// var credentials = { key: privateKey, cert: certificate, ca: ca };
// var credentials = { key: privateKey, cert: certificate };
// const server = require("https").createServer(credentials, app);
import { createServer } from "node:http";
const server = createServer(app);
// const server = require("https").createServer(app);

// const io = require("socket.io")(server, { cors : { origin: '*'}});
import { Server } from "socket.io";

import {
	ACTIONS,
	BREAK_LIMIT,
	DAYMESSAGES,
	DISCUSSION,
	MAX_SECONDS,
	MIN_SECONDS,
	NIGHTMESSAGES,
	RECAP,
	SHOWROLES,
	VOTEMESSAGES,
	VOTING,
	maxNoDeaths,
	maxPlayers,
	minPlayers,
	minRoles,
	roleTypes,
} from "./constants.js";

import { Player } from "./player.js";
import { Role } from "./role.js";
import { Game } from "./game.js";
import { Timer } from "./timer.js";
import { User } from "./user.js";
import { Room } from "./room.js";

const io = new Server(server, {
	cors: {
		origin: "*",
		methods: ["GET", "POST"],
	},
});

server.listen(port, () => {
	console.log("Server listening at port %d", port);
});

// ? Change this
// var __dirname = "/mnt/c/Users/petru/Documents/Code/eyesopen/public/";
const __dirname = `${process.cwd()}/public/`;

// // random string generator
import randomstring from "randomstring";

const rooms = new Map();
const connectedUsers = new Map();
const proxyIdenfication = new Map();

// Clear data every day at 05:00:00
function checkClearData() {
	const current = new Date(Date.now());
	const whenToReset = new Date("2022-08-22T05:00:00");
	const currentTime = current.toLocaleTimeString();
	const whenToResetTime = whenToReset.toLocaleTimeString();
	if (currentTime === whenToResetTime) {
		console.log("clearing data");
		// Clear rooms
		rooms.clear();
		// Clear connected users
		connectedUsers.clear();
		io.emit("hostKick");
	}
}
setInterval(checkClearData, 1000);

app.use((req, res, next) => {
	let err = null;
	try {
		decodeURIComponent(req.path);
	} catch (e) {
		err = e;
	}
	if (err) {
		console.log(err, req.url);
		return res.redirect(["https://", req.get("Host"), "/404"].join(""));
	}
	next();
});

// static folder
app.use(express.static("public"));

app.use((req, res, next) => {
	res.set("Cache-Control", "no-store");
	next();
});

// app.use(express.urlencoded({ extended: true }));

// serving public file
app.get("/", (req, res) => {
	res.sendFile(`${__dirname}index.html`);
});
app.get("/lobby/", (req, res) => {
	res.sendFile(`${__dirname}404.html`);
});
app.get("/lobby/:id", (req, res) => {
	if (rooms.has(req.params.id)) {
		res.sendFile(`${__dirname}lobby.html`);
	} else {
		res.sendFile(`${__dirname}404.html`);
	}
});
app.get("/lobby/:id/inProgress", (req, res) => {
	res.sendFile(`${__dirname}inProgress.html`);
});
app.get("/lobby/:id/game", (req, res) => {
	if (rooms.has(req.params.id)) {
		res.sendFile(`${__dirname}app.html`);
	} else {
		res.sendFile(`${__dirname}404.html`);
	}
});

app.get("/lobby/:id/join", (req, res) => {
	if (rooms.has(req.params.id)) {
		res.sendFile(`${__dirname}join.html`);
	} else {
		res.sendFile(`${__dirname}404.html`);
	}
});
app.get("/sitemap.xml", (req, res) => {
	res.sendFile(`${__dirname}sitemap.xml`);
});
app.get("/robots.txt", (req, res) => {
	res.sendFile(`${__dirname}robots.txt`);
});
app.get("/eyesopen.svg", (req, res) => {
	res.sendFile(`${__dirname}/assets/icons/eyesopen.svg`);
});

// Catch all
app.get(/(.*)/, (req, res) => {
	res.sendFile(`${__dirname}404.html`);
});

import jsonData from "./roles.json" with { type: "json" };

// establish server connection with socket
io.on("connection", async (socket) => {
	const today = new Date();
	const date = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
	const time = `${today.getHours()}:${today.getMinutes()}:${today.getSeconds()}`;
	console.log(date, time, "- a user connected, with socket id:", socket.id);
	// reassign sockets to their playerID rooms (if they have a playerID)
	socket.on("setRoom", (playerID) => {
		console.log(`player ${playerID} is joining their own room`);
		socket.join(playerID);

		for (const [key, value] of rooms) {
			if (value.getHost() === playerID) {
				console.log(`player ${playerID} is joining their created room`);
				socket.join(key);
			}
		}
		console.log("setting rooms");
		console.log(socket.rooms);
	});

	socket.on("disconnect", () => {
		const playerID = socket.data.playerID;
		if (checkUserExist(playerID)) {
			const targetRoom = connectedUsers.get(playerID).getCurrentRoom();
			console.log(
				"targetroom",
				targetRoom,
				connectedUsers.get(playerID).getName(),
			);
			if (targetRoom !== null) {
				connectedUsers.get(playerID).setReadyLobby(false);

				io.to(targetRoom).emit("rolePickConditionDisconnect", false);
				// reqHandler(playerID);
				// remove user from room
				if (
					rooms
						.get(targetRoom)
						.getUsers()
						.includes(connectedUsers.get(playerID))
				) {
					rooms.get(targetRoom).removeUser(connectedUsers.get(playerID));
				}
				clearPlayerSlot(playerID);
				updatePlayerSlot(playerID);
				io.to(targetRoom).emit(
					"ready-status-lobby",
					generateProxyReadyLobby(playerID),
				);
				updatePlayerCount(playerID);
				// TODO: check for requirement instead???
				updateRoles();
				reqHandler(playerID);
				// socket leaves room
				// connectedUsers.get(playerID).setCurrentRoom(null);
				socket.leave(targetRoom);
				console.log(
					"leaving room",
					targetRoom,
					connectedUsers.get(playerID).getName(),
				);
				console.log(socket.rooms);
			}
		}
	});

	socket.on("checkUserApartOfGame", (playerID, theRoom, state) => {
		if (checkUserExist(playerID)) {
			if (theRoom !== null) {
				if (rooms.has(theRoom)) {
					// if (!connectedUsers.get(playerID).getInGame()) {
					const room = rooms.get(theRoom);
					const users = room.getGame().getUsers();
					let apartOfGame = false;
					for (let i = 0; i < users.length; i++) {
						if (
							users[i].getPlayer(theRoom) ===
							connectedUsers.get(playerID).getPlayer(theRoom)
						) {
							if (users[i].getPlayer(theRoom).getDisconnected() === false) {
								apartOfGame = true;
							}
						}
					}
					if (apartOfGame) {
						if (state.includes("index")) {
							console.log(playerID, "(index) is apart of room", theRoom);
							socket.emit(
								"apartOfGameIndex",
								true,
								room.getGame().getProgress(),
								theRoom,
							);
						} else if (state.includes("join")) {
							console.log(playerID, "(join) is apart of room", theRoom);
							socket.emit(
								"apartOfGameJoin",
								true,
								room.getGame().getProgress(),
								theRoom,
							);
						} else if (state.includes("app")) {
							console.log(playerID, "(app) is apart of room", theRoom);
							socket.emit(
								"apartOfGameApp",
								true,
								room.getGame().getProgress(),
								theRoom,
							);
						}
					} else {
						if (state.includes("index")) {
							console.log(playerID, "(index) is NOT APART of room", theRoom);
							socket.emit(
								"apartOfGameIndex",
								false,
								room.getGame().getProgress(),
								theRoom,
							);
						} else if (state.includes("join")) {
							console.log(playerID, "(join) is NOT APART of room", theRoom);
							socket.emit(
								"apartOfGameJoin",
								false,
								room.getGame().getProgress(),
								theRoom,
							);
						} else if (state.includes("app")) {
							console.log(playerID, "(app) is NOT APART of room", theRoom);
							socket.emit(
								"apartOfGameApp",
								false,
								room.getGame().getProgress(),
								theRoom,
							);
						}
					}
				}
			}
		}
	});

	function random(min, max) {
		return Math.floor(Math.random() * (max - min + 1)) + min;
	}

	function shuffle(array) {
		for (let i = array.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[array[i], array[j]] = [array[j], array[i]];
		}
	}

	function setUp(roomCode) {
		const room = rooms.get(roomCode);
		const game = room.getGame();
		const roles = room.getRoles();
		// SHUFFLE ARRAY (ROLES)
		shuffle(roles);
		const users = room.getUsers();
		// reset game
		room.getGame().reset();
		room.getGame().resetGameDone();
		room.getGame().resetGameInterval();
		// set all users ready
		for (let i = 0; i < users.length; i++) {
			users[i].setInGame(true);
		}
		if (roles.length >= minRoles) {
			const seen = [];
			let i = 0;
			// keeping track of lawyer, jester, executioner
			let theLawyer = null;
			let theJester = null;
			let theExecutioner = null;
			console.log("cemetery room created", game.getCemeteryRoom());
			game.setCemeteryRoom(`cemetery-${roomCode}`);
			while (seen.length < roles.length) {
				const rand = random(0, roles.length - 1);
				if (!seen.includes(rand)) {
					// create new player for user, with one of the roles
					users[i].setPlayer(
						roomCode,
						new Player(users[i].getName(), new Role(roles[rand])),
					);
					// Set playerRoom
					users[i].getPlayer(roomCode).setPlayerRoom(roomCode);
					// have used up this role
					seen.push(rand);

					// add user to all in game users
					// add user to all alive players
					room.getGame().addUser(users[i]);
					room.getGame().addAlive(users[i]);
					// Add previous game
					users[i].addPrevious(roomCode);
					// if user has an evil role, add them to evil
					if (users[i].getPlayer(roomCode).role.team === "evil") {
						room.getGame().addEvil(users[i]);
						// if there is at least one evil role, create evil room code
						game.setEvilRoom(`evil-${roomCode}`);
						console.log("evil room created", game.getEvilRoom());
					}

					// assign which user is which neutral role
					if (roles[rand] === "lawyer") {
						theLawyer = users[i];
					} else if (roles[rand] === "jester") {
						theJester = users[i];
					} else if (roles[rand] === "executioner") {
						theExecutioner = users[i];
					}
					// counter for array of users
					i++;
				}
			}
			// assign lawyer client if lawyer is one of the roles
			// client must be evil or neutral
			if (roles.includes("lawyer")) {
				const seen = [];
				while (seen.length < 1) {
					const rand = random(0, users.length - 1);
					if (!seen.includes(rand)) {
						if (
							roles.length === minRoles &&
							roles.includes("lawyer") &&
							roles.includes("executioner") &&
							roles.includes("jester")
						) {
							if (users[rand] === theJester) {
								seen.push(rand);
								theLawyer.getPlayer(roomCode).role.client = users[rand];
								// console.log("client", users[rand].getPlayer(roomCode).role);
							}
						} else {
							if (
								users[rand] !== theLawyer &&
								(users[rand].getPlayer(roomCode).role.team === "evil" ||
									users[rand].getPlayer(roomCode).role.team === "neutral")
							) {
								seen.push(rand);
								console.log("Lawyer target", users[rand]);
								theLawyer.getPlayer(roomCode).role.client = users[rand];
								// console.log("client", users[rand].getPlayer(roomCode).role);
							}
						}
					}
				}
			}

			// assign executioner target if executioner is one of the roles
			// target cannot be jester and cannot be lawyer, if the lawyer client is the executioner
			if (roles.includes("executioner")) {
				const seen = [];
				while (seen.length < 1) {
					const rand = random(0, users.length - 1);
					if (!seen.includes(rand)) {
						if (
							users[rand] !== theExecutioner &&
							users[rand] !== theJester &&
							(users[rand] !== theLawyer ||
								theLawyer.getPlayer(roomCode).role.client !== theExecutioner)
						) {
							seen.push(rand);
							console.log("Exe target", users[rand]);
							theExecutioner.getPlayer(roomCode).role.target = users[rand];
							// console.log("target", users[rand].getPlayer(roomCode).role);
						}
					}
				}
			}
			// console.log("theLawyer", theLawyer);
			// console.log("theExcutioner", theExecutioner);
			// console.log("after game set up", users);
		}
	}

	function updateRoleCard(playerID, sendTo, target) {
		if (checkUserExist(playerID)) {
			if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
				const roomCode = connectedUsers.get(playerID).getCurrentRoom();
				const room = rooms.get(roomCode);
				if (room.getGame().getProgress()) {
					const allReady = false;
					playerIsReady = false;
					if (connectedUsers.get(playerID).getPlayer(roomCode).getReadyGame()) {
						playerIsReady = true;
					}
					if (checkAllReadyGame(roomCode, playerID)) {
						console.log("ALL PLAYERS READY in GAME");
						const allReady = true;
					}
					socket.emit(
						"displayRoleCard",
						playerIsReady,
						allReady,
						connectedUsers.get(playerID).getPlayer(roomCode).getRole().type,
						connectedUsers.get(playerID).getPlayer(roomCode).getRole().name,
						connectedUsers.get(playerID).getPlayer(roomCode).getRole().team,
						connectedUsers.get(playerID).getPlayer(roomCode).getRole()
							.description,
						connectedUsers.get(playerID).getPlayer(roomCode).getRole().mission,
					);
					if (sendTo === "all") {
						io.to(roomCode).emit("showGameUpdate", allReady);
					} else if (sendTo === "socket") {
						io.to(target).emit("showGameUpdate", allReady);
					}
				}
			}
		}
	}

	function checkForRoleCard(playerID, state) {
		if (checkUserExist(playerID)) {
			if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
				const roomCode = connectedUsers.get(playerID).getCurrentRoom();
				const room = rooms.get(roomCode);
				if (room.getGame().getProgress()) {
					const allReady = false;
					playerIsReady = false;
					if (connectedUsers.get(playerID).getPlayer(roomCode).getReadyGame()) {
						playerIsReady = true;
					}
					if (checkAllReadyGame(roomCode, playerID)) {
						console.log("ALL PLAYERS READY in GAME");
						const allReady = true;
					}
					socket.emit(
						"displayRoleCard",
						playerIsReady,
						allReady,
						connectedUsers.get(playerID).getPlayer(roomCode).getRole().type,
						connectedUsers.get(playerID).getPlayer(roomCode).getRole().name,
						connectedUsers.get(playerID).getPlayer(roomCode).getRole().team,
						connectedUsers.get(playerID).getPlayer(roomCode).getRole()
							.description,
						connectedUsers.get(playerID).getPlayer(roomCode).getRole().mission,
					);
					let emitTo = "";
					if (state.includes("refresh")) {
						emitTo = "showGameRefresh";
						socket.emit(emitTo, allReady);
					} else if (state.includes("first")) {
						emitTo = "showGameFirst";
						io.to(roomCode).emit(emitTo, allReady);
					} else if (state.includes("press")) {
						emitTo = "showGamePress";
						io.to(roomCode).emit(emitTo, allReady);
					}
				}
			}
		}
	}

	socket.on("checkForRoleCard", (playerID, state) => {
		checkForRoleCard(playerID, state);
	});

	socket.on("clearSpecificRoom", (playerID, roomToClear) => {
		if (checkUserExist(playerID)) {
			if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
				// var roomCode = connectedUsers.get(playerID).getCurrentRoom();
				// var room = rooms.get(roomCode);
				socket.leave(roomToClear);
			}
		}
	});

	function forceKill(playerID, previousRoom, gameToLeave) {
		if (checkUserExist(playerID)) {
			if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
				const user = connectedUsers.get(playerID);

				// RESET PREVIOUS USER
				user.getPlayer(previousRoom).setIsKilled(true);
				user.getPlayer(previousRoom).setDisconnected(true);
				user.getPlayer(previousRoom).setReadyGame(false);
				user.getPlayer(previousRoom).addKiller("Server");
				sendMessage(
					playerID,
					rooms.get(previousRoom),
					previousRoom,
					gameToLeave,
					null,
					null,
					"all",
					`${user
						.getPlayer(previousRoom)
						.getPlayerName()} left the game (Server)`,
					"alert",
				);
				console.log("Calling death handler from force kill");
				deathHandler(
					playerID,
					rooms.get(previousRoom),
					previousRoom,
					gameToLeave,
				);
				// if (gameToLeave.getUsers().includes(user)) {
				//   gameToLeave.removeUser(user)
				// }
				io.to(previousRoom).emit("updateSetPlayers");
				if (gameToLeave.getProgress() && gameToLeave.getDone() === false) {
					checkForWin(
						playerID,
						rooms.get(previousRoom),
						previousRoom,
						gameToLeave,
					);
				}
			}
		}
	}

	function clearPrevious(playerID) {
		if (checkUserExist(playerID)) {
			if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
				const roomCode = connectedUsers.get(playerID).getCurrentRoom();
				const room = rooms.get(roomCode);
				const game = room.getGame();
				const user = connectedUsers.get(playerID);

				// RESET PREVIOUS USER
				for (let i = 0; i < user.getPrevious().length; i++) {
					const previousRoomCode = user.getPrevious()[i];
					const previousRoom = rooms.get(previousRoomCode);
					const previousGame = previousRoom.getGame();
					forceKill(playerID, previousRoomCode, previousGame);
					io.to(playerID).emit(
						"beginClearEvilRoom",
						previousGame.getEvilRoom(),
					);
					io.to(playerID).emit(
						"beginClearCemeteryRoom",
						previousGame.getCemeteryRoom(),
					);
				}
				// Clear previous array
				user.setPrevious([]);
			}
		}
	}

	socket.on("setDuration", (playerID, inputValue, inputType) => {
		if (checkUserExist(playerID)) {
			if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
				const roomCode = connectedUsers.get(playerID).getCurrentRoom();
				const room = rooms.get(roomCode);
				const game = room.getGame();
				if (room.getHost() === playerID) {
					if (room.getGame().getProgress() === false) {
						if (inputType === "actions") {
							const newInputValue = Math.round(inputValue);
							if (
								newInputValue >= MIN_SECONDS ||
								newInputValue <= MAX_SECONDS
							) {
								game.settings[inputType].isDefault = false;
								game.settings[inputType].value = newInputValue;
							}
						} else if (inputType === "discussion") {
							if (
								newInputValue >= MIN_SECONDS ||
								newInputValue <= MAX_SECONDS
							) {
								game.settings[inputType].isDefault = false;
								game.settings[inputType].value = newInputValue;
							}
						} else if (inputType === "voting") {
							if (
								newInputValue >= MIN_SECONDS ||
								newInputValue <= MAX_SECONDS
							) {
								game.settings[inputType].isDefault = false;
								game.settings[inputType].value = newInputValue;
							}
						}
					}
					console.log("after change", game.settings);
					console.log("#########");
				}
			}
		}
	});

	socket.on("setShowRoles", (playerID, toShow) => {
		if (checkUserExist(playerID)) {
			if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
				const roomCode = connectedUsers.get(playerID).getCurrentRoom();
				const room = rooms.get(roomCode);
				const game = room.getGame();
				if (room.getHost() === playerID) {
					if (room.getGame().getProgress() === false) {
						if (toShow) {
							game.settings.showRoles.isDefault = toShow;
							game.settings.showRoles.value = toShow;
						} else if (!toShow) {
							game.settings.showRoles.isDefault = toShow;
							game.settings.showRoles.value = toShow;
						}
					}
				}
			}
		}
	});
	socket.on("setVoteMessages", (playerID, type) => {
		if (checkUserExist(playerID)) {
			if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
				const roomCode = connectedUsers.get(playerID).getCurrentRoom();
				const room = rooms.get(roomCode);
				const game = room.getGame();
				if (room.getHost() === playerID) {
					if (room.getGame().getProgress() === false) {
						if (type === "hidden") {
							game.settings.voteMessages.isDefault = false;
							game.settings.voteMessages.value = type;
						} else if (type === "anonymous") {
							game.settings.voteMessages.isDefault = false;
							game.settings.voteMessages.value = type;
						} else if (type === "visible") {
							game.settings.voteMessages.isDefault = false;
							game.settings.voteMessages.value = type;
						}
					}
				}
			}
		}
	});

	socket.on("saveGameSettings", (playerID) => {
		if (checkUserExist(playerID)) {
			if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
				const roomCode = connectedUsers.get(playerID).getCurrentRoom();
				const room = rooms.get(roomCode);
				const game = room.getGame();
				if (room.getHost() === playerID) {
					if (room.getGame().getProgress() === false) {
						setSettings(playerID, room, roomCode, game);
					}
				}
			}
		}
	});
	socket.on("loadGameSettings", (playerID, reset) => {
		if (checkUserExist(playerID)) {
			if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
				const roomCode = connectedUsers.get(playerID).getCurrentRoom();
				const room = rooms.get(roomCode);
				const game = room.getGame();
				if (room.getHost() === playerID) {
					if (room.getGame().getProgress() === false) {
						socket.emit("fetchedGameSettings", game.settings);
					}
				}
			}
		}
	});
	socket.on("resetNotSavedGameSettings", (playerID) => {
		if (checkUserExist(playerID)) {
			if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
				const roomCode = connectedUsers.get(playerID).getCurrentRoom();
				const room = rooms.get(roomCode);
				const game = room.getGame();
				if (room.getHost() === playerID) {
					if (room.getGame().getProgress() === false) {
						setSettings(playerID, room, roomCode, game);
					}
				}
			}
		}
	});

	function setSettings(playerID, room, roomCode, game) {
		for (const [setting, values] of Object.entries(game.settings)) {
			if (values.isDefault === true) {
				if (setting === "actions") {
					values.value = ACTIONS;
				} else if (setting === "discussion") {
					values.value = DISCUSSION;
				} else if (setting === "voting") {
					values.value = VOTING;
				} else if (setting === "showRoles") {
					values.value = SHOWROLES;
				} else if (setting === "voteMessages") {
					values.value = VOTEMESSAGES;
				}
			}
		}
	}

	socket.on("resetGameSettings", (playerID) => {
		if (checkUserExist(playerID)) {
			if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
				const roomCode = connectedUsers.get(playerID).getCurrentRoom();
				const room = rooms.get(roomCode);
				const game = room.getGame();
				if (room.getHost() === playerID) {
					if (room.getGame().getProgress() === false) {
						// game.settingsDefault = true;
						game.resetGameSettings();
						socket.emit("fetchedGameSettings", game.settings);
					}
				}
			}
		}
	});

	// set all users to inGame
	// set game to inProgress
	// make sure done is false
	// assign roles at random (each users gets a new Player, which has new Role)
	// if lawyer exists, give them evil or neutral client
	// if exe exists, give the many target but not jester, and if lawyer client == exe, then no laywer as target
	// add all Users to game alive, evil to evil array
	// ?check for user readyGame
	socket.on("startGame", (playerID) => {
		if (checkUserExist(playerID)) {
			if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
				const roomCode = connectedUsers.get(playerID).getCurrentRoom();
				const room = rooms.get(roomCode);
				if (room.getHost() === playerID) {
					if (room.getGame().getProgress() === false) {
						if (checkReq(playerID)) {
							console.log("starting game");
							// Clear each player before joining another game
							for (let i = 0; i < room.getUsers().length; i++) {
								const user = room.getUsers()[i];
								clearPrevious(user.getPlayerID());
							}
							io.to(roomCode).emit("enterGame");
							setUp(roomCode);
							// set game in progress
							room.getGame().setProgress(true);
							// io.to(roomCode).emit("rolesAssigned");
						}
					}
				}
			}
		}
	});

	function checkReq(playerID) {
		if (checkUserExist(playerID)) {
			if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
				const roomCode = connectedUsers.get(playerID).getCurrentRoom();
				const room = rooms.get(roomCode);
				const totalReq = Object.keys(room.requirements).length;
				let count = 0;
				for (const value of Object.values(room.requirements)) {
					if (value === true) {
						count++;
					}
				}
				if (count === totalReq) {
					console.log("everything satisfied");
					return true;
				}
				return false;
			}
		}
	}

	function checkReqSend(playerID) {
		if (checkUserExist(playerID)) {
			if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
				const roomCode = connectedUsers.get(playerID).getCurrentRoom();
				const room = rooms.get(roomCode);
				const totalReq = Object.keys(room.requirements).length;
				let count = 0;
				for (const value of Object.values(room.requirements)) {
					if (value === true) {
						count++;
					}
				}
				if (count === totalReq) {
					console.log("everything satisfied");
					//!! should this emit to everybody?
					io.to(connectedUsers.get(playerID).getCurrentRoom()).emit(
						"reqSatisfied",
						true,
					);
				} else {
					io.to(connectedUsers.get(playerID).getCurrentRoom()).emit(
						"reqSatisfied",
						false,
					);
				}
			}
		}
	}

	socket.on("reqHandler", (playerID, req, isValid = false) => {
		if (checkUserExist(playerID)) {
			if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
				const roomCode = connectedUsers.get(playerID).getCurrentRoom();
				const room = rooms.get(roomCode);
				if (req.includes("rolesEqualUsers")) {
					rooms.get(roomCode).requirements.rolesEqualUsers = isValid;
				}
				checkReqSend(playerID);
			}
		}
	});

	function reqHandler(playerID) {
		if (checkUserExist(playerID)) {
			if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
				const roomCode = connectedUsers.get(playerID).getCurrentRoom();
				const room = rooms.get(roomCode);

				if (rooms.get(roomCode).getUsers().length >= minPlayers) {
					rooms.get(roomCode).requirements.minThree = true;
				} else {
					rooms.get(roomCode).requirements.minThree = false;
				}
				if (checkAllReadyLobby(roomCode, playerID)) {
					rooms.get(roomCode).requirements.allReady = true;
				} else {
					rooms.get(roomCode).requirements.allReady = false;
				}
				if (hostInLobby(roomCode)) {
					rooms.get(roomCode).requirements.hostExist = true;
				} else {
					rooms.get(roomCode).requirements.hostExist = false;
				}
				checkReqSend(playerID);
			}
		}
	}

	socket.on("fetchRoles", (playerID, state) => {
		if (checkUserExist(playerID)) {
			if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
				const roomCode = connectedUsers.get(playerID).getCurrentRoom();

				let emitTo = "";
				if (state.includes("connect")) {
					emitTo = "fetchedRolesConnect";
				} else if (state.includes("after")) {
					emitTo = "fetchedRolesAfter";
				} else if (state.includes("disconnect")) {
					emitTo = "fetchedRolesDisconnect";
				}
				io.to(connectedUsers.get(playerID).getCurrentRoom()).emit(
					emitTo,
					rooms.get(roomCode).getRoles(),
				);
				reqHandler(playerID);
			}
		}
	});

	socket.on("checkUser", (playerID) => {
		if (checkUserExist(playerID)) {
			socket.emit("userExists", true);
		} else {
			socket.emit("userExists", false);
		}
	});

	// generate playerID for sockets that request one
	socket.on("requestID", (socketID, playerID) => {
		console.log("requestID", socketID, playerID);
		if (!checkUserExist(playerID)) {
			console.log(socketID, "requesting player ID");
			console.log("BREAK_LIMIT", BREAK_LIMIT);
			// About 2.17 billion possible users and proxy IDs ((26+10)^6)
			// Keep checking for unique player ID
			let notUniqueID = true;
			let toBreakID = 0;
			let generatedPlayerId = "";
			while (notUniqueID && toBreakID < BREAK_LIMIT) {
				generatedPlayerId = randomstring.generate({
					length: 6,
					charset: "alphanumeric",
				});
				if (!checkUserExist(playerID)) {
					notUniqueID = false;
				}
				toBreakID++;
			}
			// Keep checking for unique proxy ID
			let notUniqueProxy = true;
			let toBreakProxy = 0;
			let proxyID = "";
			while (notUniqueProxy && toBreakProxy < BREAK_LIMIT) {
				proxyID = randomstring.generate({
					length: 6,
					charset: "alphanumeric",
				});
				if (!checkProxyExist(proxyID)) {
					if (!checkProxyEqual(generatedPlayerId, proxyID)) {
						notUniqueProxy = false;
					}
				}
				toBreakProxy++;
			}

			if (!notUniqueID && !notUniqueProxy) {
				console.log("Proxy created");
				proxyIdenfication.set(generatedPlayerId, proxyID);
				socket.emit("playerID", generatedPlayerId);
			} else if (notUniqueID || notUniqueProxy) {
				socket.emit("playerID", null);
			}
		}
	});

	// log if player has created an ID
	socket.on("completedID", (playerID) => {
		console.log("player", playerID, "has created an ID");
	});

	function checkProxyEqual(playerID, proxyID) {
		if (playerID !== proxyID) {
			return false;
		}
		return true;
	}

	function checkProxyExist(proxyID) {
		if (Array.from(proxyIdenfication.values()).includes(proxyID)) {
			return true;
		}
		return false;
	}

	function checkUserExist(playerID) {
		if (!playerID || playerID === "null") {
			return false;
		}
		if (connectedUsers.has(playerID)) {
			return true;
		}
		return false;
	}

	// log if a host has just input their name and is about to generate a room
	socket.on("createUser", (name, playerID) => {
		if (!checkUserExist(playerID)) {
			const newName = name.substring(0, 11);
			console.log("name:", newName, ", playerID:", playerID);
			connectedUsers.set(playerID, new User(playerID, newName));
			console.log("Users:", connectedUsers);
			socket.emit("showChangeUsername", true);
		}
	});

	socket.on("requestUsername", (playerID) => {
		if (checkUserExist(playerID)) {
			const user = connectedUsers.get(playerID);
			socket.emit("fetchedUsername", user.getName());
		}
	});

	socket.on("changeUsername", (playerID, newName) => {
		if (checkUserExist(playerID)) {
			console.log("NewName:", newName, ", playerID:", playerID);
			const user = connectedUsers.get(playerID);
			user.setName(newName);
			console.log("Users:", connectedUsers.get(playerID));
		}
	});

	function hostInLobby(roomCode) {
		const room = rooms.get(roomCode);
		if (room.getUsers().includes(connectedUsers.get(room.getHost()))) {
			return true;
		}
		return false;
	}

	function amountUnready(roomCode) {
		const room = rooms.get(roomCode);
		let ready = 0;
		for (let i = 0; i < room.getUsers().length; i++) {
			if (room.getUsers()[i].getReadyLobby() === true) {
				ready++;
			}
		}
		return room.getUsers().length - ready;
	}

	function checkForAlreadyExistingUser(roomCode, playerID) {
		const room = rooms.get(roomCode);
		const game = room.getGame();
		if (checkUserExist(playerID)) {
			if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
				if (room.getUsers().includes(connectedUsers.get(playerID)) === false) {
					room.addUser(connectedUsers.get(playerID));
				}
			}
		}
	}

	socket.on("refreshReady", (playerID, state) => {
		if (checkUserExist(playerID)) {
			if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
				const roomCode = connectedUsers.get(playerID).getCurrentRoom();

				if (state.includes("socket")) {
					const notReady = false;
					connectedUsers.get(playerID).setReadyLobby(notReady);
				}
				io.to(roomCode).emit(
					"ready-status-lobby-refresh",
					generateProxyReadyLobby(playerID),
				);
			}
		}
	});
	socket.on("requestLobbyDisplayCard", (playerID, targetID) => {
		if (checkUserExist(playerID)) {
			if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
				const roomCode = connectedUsers.get(playerID).getCurrentRoom();
				if (targetID !== null && targetID !== undefined && targetID !== "") {
					const roleObject = jsonData.roles[targetID];
					socket.emit(
						"fetchedLobbyDisplayCard",
						roleObject.name,
						roleObject.team,
						roleObject.description,
						roleObject.mission,
					);
				}
			}
		}
	});

	socket.on("player-unready", (playerID, state) => {
		if (checkUserExist(playerID)) {
			if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
				const roomCode = connectedUsers.get(playerID).getCurrentRoom();
				let emitTo = "";
				const notReady = false;
				if (state.includes("lobby")) {
					emitTo = "ready-status-lobby";
					connectedUsers.get(playerID).setReadyLobby(notReady);
					io.to(connectedUsers.get(playerID).getCurrentRoom()).emit(
						emitTo,
						generateProxyReadyLobby(playerID),
					);
					updatePlayerCount(playerID);
				} else if (state.includes("game")) {
					// emitTo = "ready-status-game";
					connectedUsers
						.get(playerID)
						.getPlayer(roomCode)
						.setReadyGame(notReady);

					// var playerIsReady = connectedUsers.get(playerID).getReadyGame();
					// socket.to(connectedUsers.get(playerID), playerIsReady, checkAllReadyGame(roomCode, playerID)).emit(emitTo);
				}
			}
		}
	});

	function checkAllReadyGame(roomCode, playerID) {
		let count = 0;
		if (checkUserExist(playerID)) {
			if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
				const users = rooms.get(roomCode).getGame().getAlive();
				for (let i = 0; i < users.length; i++) {
					if (users[i].getPlayer(roomCode).getReadyGame()) {
						count++;
					}
				}
				if (count === users.length) {
					return true;
				}
				return false;
			}
		}
	}
	function checkAllReadyLobby(roomCode, playerID) {
		let count = 0;
		if (checkUserExist(playerID)) {
			if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
				for (let i = 0; i < rooms.get(roomCode).getUsers().length; i++) {
					if (rooms.get(roomCode).getUsers()[i].getReadyLobby()) {
						count++;
					}
				}
				// ! this could be an issue
				if (count === rooms.get(roomCode).getUsers().length) {
					return true;
				}
				return false;
			}
		}
	}

	function generateProxyReadyLobby(playerID) {
		if (checkUserExist(playerID)) {
			if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
				const roomCode = connectedUsers.get(playerID).getCurrentRoom();
				const room = rooms.get(roomCode);
				const proxyUsers = [];
				for (let i = 0; i < room.getUsers().length; i++) {
					const thePlayerID = proxyIdenfication.get(
						room.getUsers()[i].playerID,
					);
					const readyLobby = room.getUsers()[i].readyLobby;
					const proxyUser = { thePlayerID, readyLobby };
					proxyUsers.push(proxyUser);
				}
				return proxyUsers;
			}
		}
	}

	socket.on("player-ready", (playerID, state) => {
		if (checkUserExist(playerID)) {
			if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
				const roomCode = connectedUsers.get(playerID).getCurrentRoom();
				let emitTo = "";
				const ready = true;
				if (state.includes("lobby")) {
					emitTo = "ready-status-lobby";
					connectedUsers.get(playerID).setReadyLobby(ready);
					io.to(connectedUsers.get(playerID).getCurrentRoom()).emit(
						emitTo,
						generateProxyReadyLobby(playerID),
					);
					updatePlayerCount(playerID);
				} else if (state.includes("game")) {
					// emitTo = "ready-status-game";
					connectedUsers.get(playerID).getPlayer(roomCode).setReadyGame(ready);

					// var playerIsReady = connectedUsers.get(playerID).getReadyGame();
					// socket.to(connectedUsers.get(playerID), playerIsReady, checkAllReadyGame(roomCode, playerID)).emit(emitTo);
				}
			}
		}
	});

	function updatePlayerCount(playerID) {
		if (checkUserExist(playerID)) {
			if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
				const roomCode = connectedUsers.get(playerID).getCurrentRoom();
				io.to(connectedUsers.get(playerID).getCurrentRoom()).emit(
					"viewPlayerCount",
					amountUnready(roomCode),
					hostInLobby(roomCode),
					connectedUsers.get(rooms.get(roomCode).getHost()).getName(),
					checkAllReadyLobby(roomCode, playerID),
					rooms.get(roomCode).getUsers().length,
					rooms.get(roomCode).getRoles().length,
				);
				reqHandler(playerID);
			}
		}
	}

	// !!This needs to be taken care of
	socket.on("directJoin", (playerID, directRoom, state) => {
		if (checkUserExist(playerID)) {
			connectedUsers.get(playerID).setCurrentRoom(directRoom);
			if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
				const roomCode = connectedUsers.get(playerID).getCurrentRoom();
				console.log(`THIS ${roomCode}`);
				if (state.includes("lobby")) {
					socket.join(connectedUsers.get(playerID).getCurrentRoom());
					checkForAlreadyExistingUser(roomCode, playerID);
					socket.emit("viewRoom", roomCode);
					io.to(connectedUsers.get(playerID).getCurrentRoom()).emit(
						"viewPlayerCount",
						amountUnready(roomCode),
						hostInLobby(roomCode),
						connectedUsers.get(rooms.get(roomCode).getHost()).getName(),
						checkAllReadyLobby(roomCode, playerID),
						rooms.get(roomCode).getUsers().length,
						rooms.get(roomCode).getRoles().length,
					);
					reqHandler(playerID);
					console.log(socket.rooms);
					socket.emit("joinPlayerSlot");
				} else if (state.includes("app")) {
					if (
						rooms.get(roomCode).getGame().getProgress() === true &&
						rooms
							.get(roomCode)
							.getGame()
							.getUsers()
							.includes(connectedUsers.get(playerID))
					) {
						socket.join(connectedUsers.get(playerID).getCurrentRoom());
						// checkForAlreadyExistingUser(roomCode, playerID);
						socket.emit("viewRoom", roomCode);
						io.to(connectedUsers.get(playerID).getCurrentRoom()).emit(
							"viewPlayerCount",
							amountUnready(roomCode),
							hostInLobby(roomCode),
							connectedUsers.get(rooms.get(roomCode).getHost()).getName(),
							checkAllReadyLobby(roomCode, playerID),
							rooms.get(roomCode).getUsers().length,
							rooms.get(roomCode).getRoles().length,
						);
						reqHandler(playerID);
						console.log(socket.rooms);

						socket.emit("joinPlayerSlot");
					}
				}
			}
		}
		socket.data.playerID = playerID;
	});

	socket.on("requestPlayerSlot", (playerID) => {
		if (checkUserExist(playerID)) {
			if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
				const roomCode = connectedUsers.get(playerID).getCurrentRoom();

				const room = rooms.get(roomCode);
				let slotAlreadyExist = false;
				for (const [key, value] of Object.entries(room.slots)) {
					if (value.userID === proxyIdenfication.get(playerID)) {
						slotAlreadyExist = true;
					}
				}
				if (!slotAlreadyExist) {
					for (const [key, value] of Object.entries(room.slots)) {
						if (value.taken === false) {
							room.slots[key].taken = true;
							room.slots[key].userID = proxyIdenfication.get(playerID);
							room.slots[key].userName = connectedUsers.get(playerID).getName();
							io.to(roomCode).emit(
								"playerSlots",
								proxyIdenfication.get(room.getHost()),
								room.slots,
							);

							break;
						}
					}
				}
				io.to(room.getHost()).emit("updateLobbyPlayers", room.slots);
			}
		}
	});

	socket.on("requestLobbyPlayers", (playerID) => {
		if (checkUserExist(playerID)) {
			if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
				const roomCode = connectedUsers.get(playerID).getCurrentRoom();
				const room = rooms.get(roomCode);
				if (room.getHost() === playerID) {
					console.log("showing lobby players");
					socket.emit("fetchLobbyPlayers", room.slots);
				}
			}
		}
	});
	socket.on("kickPlayer", (playerID, proxyID) => {
		if (checkUserExist(playerID)) {
			const roomCode = getHostRoom(rooms, playerID);
			if (roomCode !== null) {
				const room = rooms.get(roomCode);
				if (room.getHost() === playerID) {
					const playerToKick = getKeyFromValue(proxyIdenfication, proxyID);
					io.to(playerToKick).emit("hostKick");
				}
			}
		}
	});

	function updatePlayerSlot(playerID) {
		if (checkUserExist(playerID)) {
			if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
				const roomCode = connectedUsers.get(playerID).getCurrentRoom();
				const room = rooms.get(roomCode);
				io.to(roomCode).emit(
					"playerSlots",
					proxyIdenfication.get(room.getHost()),
					room.slots,
				);
			}
		}
	}
	function clearPlayerSlot(playerID) {
		if (checkUserExist(playerID)) {
			if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
				const roomCode = connectedUsers.get(playerID).getCurrentRoom();

				const room = rooms.get(roomCode);
				for (const [key, value] of Object.entries(room.slots)) {
					if (value.userID === proxyIdenfication.get(playerID)) {
						room.slots[key].taken = false;
						room.slots[key].userId = undefined;
						room.slots[key].userName = "";
						io.to(connectedUsers.get(playerID).getCurrentRoom()).emit(
							"playerSlots",
							proxyIdenfication.get(room.getHost()),
							room.slots,
						);
						break;
					}
				}
				io.to(room.getHost()).emit("updateLobbyPlayers", room.slots);
			}
		}
	}

	socket.on("checkIfHost", (playerID, emission) => {
		if (checkUserExist(playerID)) {
			if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
				const roomCode = connectedUsers.get(playerID).getCurrentRoom();

				if (rooms.get(roomCode).getHost() === playerID) {
					let emitTo = "";
					if (emission.includes("visibility")) {
						emitTo = "isHost";
					} else if (emission.includes("roles")) {
						emitTo = "isHostRoles";
					} else if (emission.includes("start")) {
						emitTo = "isHostStart";
					}
					socket.emit(emitTo, true);
				} else {
					let emitTo = "";
					if (emission.includes("visibility")) {
						emitTo = "isHost";
					} else if (emission.includes("roles")) {
						emitTo = "isHostRoles";
					} else if (emission.includes("start")) {
						emitTo = "isHostStart";
					}
					socket.emit(emitTo, false);
				}
			}
		}
	});

	function checkAlreadyHost(rooms, playerID) {
		for (const [key, value] of rooms) {
			console.log("room:", key, "host", value.getHost());
			if (value.getHost() === playerID) {
				return true;
			}
		}
		console.log(`${playerID} is not a host yet`);
		return false;
	}

	function getHostRoom(rooms, playerID) {
		for (const [key, value] of rooms) {
			console.log("room:", key, "host", value.getHost());
			if (value.getHost() === playerID) {
				return key;
			}
		}
		console.log(`${playerID} did not find the host room`);
		return null;
	}

	function getRoom(rooms, playerID) {
		for (const [key, value] of rooms) {
			console.log("room:", key, "users", value.getUsers());
			if (value.getUsers().includes(playerID)) {
				return key;
			}
		}
		console.log(`${playerID} did not find the room`);
		return null;
	}

	socket.on("fetchHostRoom", (playerID) => {
		if (checkUserExist(playerID)) {
			socket.emit("hostRoom", getHostRoom(rooms, playerID));
		}
	});

	// handle room creation
	socket.on("createRoom", (playerID) => {
		const temp = Array.from(rooms.entries());
		const count = 0;
		if (checkUserExist(playerID)) {
			if (temp.length > 0) {
				if (checkAlreadyHost(rooms, playerID) === false) {
					// About 60.4 million possible rooms((26+10)^5)
					let notUniqueRoom = true;
					let toBreak = 0;
					while (notUniqueRoom && toBreak < BREAK_LIMIT) {
						const roomCode = randomstring.generate({
							length: 5,
							charset: "alphanumeric",
							capitalization: "uppercase",
							readable: true,
						});
						if (!rooms.has(roomCode)) {
							notUniqueRoom = false;
						}
						toBreak++;
					}
					if (!notUniqueRoom) {
						// Setting up room
						connectedUsers.get(playerID).setCurrentRoom(roomCode);
						rooms.set(roomCode, new Room(playerID));
						checkForAlreadyExistingUser(roomCode, playerID);

						console.log("room", roomCode, "created");
						console.log(socket.id, "joined", roomCode);

						// Log rooms that socket is in
						console.log(rooms);
					}
				} else {
					const hostRoom = getHostRoom(rooms, playerID);
					if (hostRoom !== null) {
						connectedUsers.get(playerID).setCurrentRoom(hostRoom);
					}
				}
			} else {
				const roomCode = randomstring.generate({
					length: 5,
					charset: "alphanumeric",
					capitalization: "uppercase",
					readable: true,
				});

				// Setting up room
				connectedUsers.get(playerID).setCurrentRoom(roomCode);
				rooms.set(roomCode, new Room(playerID));
				checkForAlreadyExistingUser(roomCode, playerID);

				console.log("room", roomCode, "created");
				console.log(socket.id, "joined", roomCode);

				// Log rooms that socket is in
				console.log(rooms);
			}
			console.log("room in:", socket.rooms);
		}
	});

	// handling room joining
	socket.on("checkRoomCode", (roomCode, playerID, state) => {
		console.log("this player", playerID);
		if (checkUserExist(playerID)) {
			console.log(playerID, "trying roomcode", roomCode);
			let emitTo = "";
			if (state.includes("first")) {
				emitTo = "roomCodeResponseFirst";
			} else if (state.includes("press")) {
				emitTo = "roomCodeResponsePress";
			}
			if (rooms.has(roomCode)) {
				// ! CHANGE THIS TO 14
				if (rooms.get(roomCode).userCount() >= maxPlayers) {
					socket.emit(emitTo, "full");
				} else {
					console.log("room code", roomCode, "is valid");
					console.log(socket.rooms);
					socket.emit(emitTo, "valid");
					if (connectedUsers.get(playerID).getCurrentRoom() !== roomCode) {
						if (rooms.get(roomCode).getUsers().includes(playerID)) {
							console.log("user already in room");
						} else {
							connectedUsers.get(playerID).setCurrentRoom(roomCode);
						}
					}
				}
			} else {
				socket.emit(emitTo, "invalid");
			}
			console.log(rooms.get(roomCode));
		}
	});

	function checkRolePick(roomCode, playerID, totalRoles, emitTo) {
		// ONLY GOOD IS NOT ALLOWED
		// ONLY EVIL IS NOT ALLOWED
		// ONLY EVIL + LAWYER is NOT ALLOWED
		let goodRoles = 0;
		let evilRoles = 0;
		let neutralRoles = 0;
		let lawyerPicked = false;
		for (let i = 0; i < totalRoles; i++) {
			const current = jsonData.roles[rooms.get(roomCode).getRoles()[i]].team;
			if (rooms.get(roomCode).getRoles().includes("lawyer")) {
				lawyerPicked = true;
			}
			if (current === "good") {
				goodRoles++;
			} else if (current === "evil") {
				evilRoles++;
			} else if (current === "neutral") {
				neutralRoles++;
			}
		}

		if (
			goodRoles === totalRoles ||
			evilRoles === totalRoles ||
			(goodRoles === totalRoles - 1 && lawyerPicked) ||
			(evilRoles === totalRoles - 1 && lawyerPicked) ||
			(goodRoles > 0 && evilRoles > goodRoles)
		) {
			rooms.get(roomCode).requirements.validPick = false;
			reqHandler(playerID);
			io.to(connectedUsers.get(playerID).getCurrentRoom()).emit(emitTo, false);
		} else {
			rooms.get(roomCode).requirements.validPick = true;
			reqHandler(playerID);
			io.to(connectedUsers.get(playerID).getCurrentRoom()).emit(emitTo, true);
		}
	}

	socket.on("checkRolePick", (playerID, state) => {
		if (checkUserExist(playerID)) {
			if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
				const roomCode = connectedUsers.get(playerID).getCurrentRoom();

				let emitTo = "";
				if (state.includes("pick")) {
					emitTo = "rolePickCondition";
				} else if (state.includes("connect")) {
					emitTo = "rolePickConditionConnect";
				} else if (state.includes("disconnect")) {
					emitTo = "rolePickConditionDisconnect";
				}
				const totalRoles = rooms.get(roomCode).getRoles().length;
				const totalUsers = rooms.get(roomCode).getUsers().length;
				if (totalRoles < minPlayers || totalUsers < minPlayers) {
					io.to(connectedUsers.get(playerID).getCurrentRoom()).emit(
						emitTo,
						false,
					);
				} else {
					checkRolePick(roomCode, playerID, totalRoles, emitTo);
				}
				reqHandler(playerID);
			}
		}
	});

	socket.on("checkRoleCount", (playerID) => {
		if (checkUserExist(playerID)) {
			if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
				const roomCode = connectedUsers.get(playerID).getCurrentRoom();

				io.to(connectedUsers.get(playerID).getCurrentRoom()).emit(
					"currentRoleCount",
					rooms.get(roomCode).getRoles().length,
					rooms.get(roomCode).getUsers().length,
				);
			}
		}
	});

	function updateRoles(roomCode, playerID) {
		if (checkUserExist(playerID)) {
			if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
				const roomCode = connectedUsers.get(playerID).getCurrentRoom();
				io.to(connectedUsers.get(playerID).getCurrentRoom()).emit(
					"fetchedRolesDisconnect",
					rooms.get(roomCode).getRoles(),
				);
				console.log(rooms.get(roomCode).getRoles());
			}
		}
	}

	// PLAYERS == ROLES - UPDATE REQUIREMENT WHEN
	// NOT OF SAME TEAM (EVIL AND GOOD) - RED BORDER
	// GREYED OUT BUTTONS WHEN have PICKED max
	socket.on("pickRole", (playerID, role, op) => {
		if (checkUserExist(playerID)) {
			if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
				const roomCode = connectedUsers.get(playerID).getCurrentRoom();
				const room = rooms.get(roomCode);
				if (room.getHost() === playerID) {
					if (room.getGame().getProgress() === false) {
						if (op.includes("add")) {
							if (!room.getRoles().includes(role)) {
								room.addRole(role);
							}
						} else if (op.includes("remove")) {
							if (room.getRoles().includes(role)) {
								room.removeRole(role);
							}
						}
						console.log(room.getRoles());
						reqHandler(playerID);
						io.to(roomCode).emit(
							"currentRoleCount",
							room.getRoles().length,
							room.getUsers().length,
						);
					}
				}
			}
		}
	});

	// GAME related
	// ====================================================

	socket.on("updateUI", (playerID) => {
		if (checkUserExist(playerID)) {
			if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
				const roomCode = connectedUsers.get(playerID).getCurrentRoom();
				const room = rooms.get(roomCode);
				const game = room.getGame();
				if (game.getProgress()) {
					if (checkAllReadyGame(roomCode, playerID)) {
						if (game.getUsers().includes(connectedUsers.get(playerID))) {
							socket.emit("changeUI", game.getCycle());
						}
					}
				}
			}
		}
	});

	socket.on("requestPlayerCard", (playerID, state) => {
		if (checkUserExist(playerID)) {
			if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
				const roomCode = connectedUsers.get(playerID).getCurrentRoom();
				const room = rooms.get(roomCode);
				const game = room.getGame();
				if (game.getProgress()) {
					if (checkAllReadyGame(roomCode, playerID)) {
						if (game.getUsers().includes(connectedUsers.get(playerID))) {
							let emitTo = "";
							const role = connectedUsers
								.get(playerID)
								.getPlayer(roomCode)
								.getRole();
							if (state.includes("first")) {
								emitTo = "fetchedPlayerCardFirst";
							} else if (state.includes("refresh")) {
								emitTo = "fetchedPlayerCardRefresh";
							} else if (state.includes("press")) {
								emitTo = "fetchedPlayerCardPress";
							}
							socket.emit(emitTo, role.name, role.team, role.mission);
						}
					}
				}
			}
		}
	});

	socket.on("setEvilRoom", (playerID) => {
		if (checkUserExist(playerID)) {
			if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
				const roomCode = connectedUsers.get(playerID).getCurrentRoom();
				const room = rooms.get(roomCode);
				const game = room.getGame();
				if (game.getProgress()) {
					if (game.getUsers().includes(connectedUsers.get(playerID))) {
						if (
							connectedUsers
								.get(playerID)
								.getPlayer(roomCode)
								.getRole()
								.team.includes("evil")
						) {
							// console.log(
							//   connectedUsers.get(playerID) +
							//     " is joining evil room: " +
							//     game.getEvilRoom()
							// );
							socket.join(game.getEvilRoom());
							console.log("with evil room", socket.rooms);
						}
					}
				}
			}
		}
	});

	socket.on("setCemeteryRoom", (playerID) => {
		if (checkUserExist(playerID)) {
			if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
				const roomCode = connectedUsers.get(playerID).getCurrentRoom();
				const room = rooms.get(roomCode);
				const game = room.getGame();
				const user = connectedUsers.get(playerID);
				if (game.getProgress()) {
					if (game.getUsers().includes(user)) {
						if (game.getCemetery().includes(user)) {
							// console.log(
							//   user +
							//     " is joining cemetery room: " +
							//     game.getCemeteryRoom()
							// );
							socket.join(game.getCemeteryRoom());
							console.log("with cemetery room", socket.rooms);
						}
					}
				}
			}
		}
	});

	// Socket that handles the voteCount, depending on night and day
	// Voting system day
	// Voting system for evil room, check that evil room works
	// Check that dead works
	// Dead popup, everything remains

	// System for handling the different abilities, in priorirty order

	// REMAKE PLAYERACTION
	socket.on("playerAction", (playerID, elementID, targetID) => {
		if (checkUserExist(playerID)) {
			if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
				const roomCode = connectedUsers.get(playerID).getCurrentRoom();
				const room = rooms.get(roomCode);
				const game = room.getGame();
				if (game.getProgress()) {
					if (game.getUsers().includes(connectedUsers.get(playerID))) {
						const user = connectedUsers.get(playerID);
						const player = user.getPlayer(roomCode);
						let isValidTarget = false;
						let isDead = false;
						const validTargets = generateValidPlayerList(playerID);

						for (let i = 0; i < validTargets.length; i++) {
							if (
								validTargets[i].userID === targetID &&
								(validTargets[i].type !== "unselectable" ||
									validTargets[i].type !== "dead" ||
									validTargets[i].type !== "evil+unselectable")
							) {
								isValidTarget = true;
							}
						}
						if (player.getIsKilled() || player.getIsLynched()) {
							isDead = true;
						}
						if (isValidTarget && !isDead) {
							if (elementID === "game-button-ability") {
								if (game.getPhase() === "actions") {
									if (game.getTimer().getCounter() >= 0) {
										if (player.abilityTarget !== null) {
											const previousAbilityTargetPlayer = connectedUsers
												.get(
													getKeyFromValue(
														proxyIdenfication,
														player.abilityTarget,
													),
												)
												.getPlayer(roomCode);
										}
										const theAbilityTargetPlayer = connectedUsers
											.get(getKeyFromValue(proxyIdenfication, targetID))
											.getPlayer(roomCode);
										// New target
										if (player.getRole().team.includes("evil")) {
											if (player.abilityTarget == null) {
												let abilityMessage = "";
												if (player.getRole().type.includes("surgeon")) {
													if (
														player.getRole().selfUsage > 0 &&
														player === theAbilityTargetPlayer
													) {
														abilityMessage = `${player.getPlayerName()} is going to disguise themselves`;
														player.abilityTarget = targetID;
													} else {
														player.abilityTarget = targetID;
														abilityMessage = `${player.getPlayerName()} is going to disguise ${theAbilityTargetPlayer.getPlayerName()}`;
													}
												} else if (player.getRole().type.includes("witch")) {
													player.abilityTarget = targetID;
													abilityMessage = `${player.getPlayerName()} is going to cast a freeze spell on ${theAbilityTargetPlayer.getPlayerName()}`;
												} else if (player.getRole().type.includes("framer")) {
													player.abilityTarget = targetID;
													abilityMessage = `${player.getPlayerName()} is going to frame ${theAbilityTargetPlayer.getPlayerName()}`;
												}
											} else if (
												player.abilityTarget !== targetID &&
												player.abilityTarget !== null
											) {
												let abilityMessage = "";
												if (player.getRole().type.includes("surgeon")) {
													if (
														player.getRole().selfUsage > 0 &&
														player === theAbilityTargetPlayer
													) {
														abilityMessage = `${player.getPlayerName()} is going to disguise themselves`;
														player.abilityTarget = targetID;
													} else {
														player.abilityTarget = targetID;
														abilityMessage = `${player.getPlayerName()} is going to disguise ${theAbilityTargetPlayer.getPlayerName()}`;
													}
												} else if (player.getRole().type.includes("witch")) {
													player.abilityTarget = targetID;
													abilityMessage = `${player.getPlayerName()} is going to cast a freeze spell on ${theAbilityTargetPlayer.getPlayerName()}`;
												} else if (player.getRole().type.includes("framer")) {
													player.abilityTarget = targetID;
													abilityMessage = `${player.getPlayerName()} is going to frame ${theAbilityTargetPlayer.getPlayerName()}`;
												}
											} else if (
												player.abilityTarget === targetID &&
												player.abilityTarget !== null
											) {
												player.abilityTarget = null;
												let abilityMessage = "";
												if (player.getRole().type.includes("surgeon")) {
													abilityMessage = `${player.getPlayerName()} is not going to disguise anyone`;
												} else if (player.getRole().type.includes("witch")) {
													abilityMessage = `${player.getPlayerName()} is not going to cast magic`;
												} else if (player.getRole().type.includes("framer")) {
													abilityMessage = `${player.getPlayerName()} is not going to frame anyone`;
												}
											}
											sendMessage(
												playerID,
												room,
												roomCode,
												game,
												null,
												null,
												"evil",
												abilityMessage,
												"bold",
											);
										} else {
											let abilityMessage = "";
											if (player.abilityTarget == null) {
												if (player.getRole().type.includes("doctor")) {
													if (
														player.getRole().selfUsage > 0 &&
														player === theAbilityTargetPlayer
													) {
														abilityMessage = "You are targeting yourself";
														player.abilityTarget = targetID;
													} else {
														abilityMessage = `You are targeting ${theAbilityTargetPlayer.getPlayerName()}`;
														player.abilityTarget = targetID;
													}
												} else {
													player.abilityTarget = targetID;
													abilityMessage = `You are targeting ${theAbilityTargetPlayer.getPlayerName()}`;
												}
											} else if (
												player.abilityTarget !== targetID &&
												player.abilityTarget !== null
											) {
												if (player.getRole().type.includes("doctor")) {
													if (
														player.getRole().selfUsage > 0 &&
														player === theAbilityTargetPlayer
													) {
														abilityMessage = "You are targeting yourself";
														player.abilityTarget = targetID;
													} else {
														abilityMessage = `You are targeting ${theAbilityTargetPlayer.getPlayerName()}`;
														player.abilityTarget = targetID;
													}
												} else {
													player.abilityTarget = targetID;
													abilityMessage = `You are targeting ${theAbilityTargetPlayer.getPlayerName()}`;
												}
											} else if (
												player.abilityTarget === targetID &&
												player.abilityTarget !== null
											) {
												player.abilityTarget = null;
												abilityMessage = "You are not targeting anyone";
											}
											sendMessage(
												playerID,
												room,
												roomCode,
												game,
												null,
												null,
												"socket",
												abilityMessage,
												"Night",
											);
										}
									}
								} else if (
									game.getPhase() === "voting" &&
									game.getCycle() === "Day"
								) {
									if (game.getTimer().getCounter() >= 0) {
										if (
											player.getRole().type.includes("mayor") &&
											player
												.getRole()
												// biome-ignore lint/suspicious/noPrototypeBuiltins: <explanation>
												.hasOwnProperty("revealed")
										) {
											if (targetID !== null) {
												console.log("Mayor target not null");
												const theAbilityTargetPlayer = connectedUsers
													.get(getKeyFromValue(proxyIdenfication, targetID))
													.getPlayer(roomCode);
												if (player === theAbilityTargetPlayer) {
													console.log("Mayor selected themselves");
													if (player.getRole().revealed === false) {
														console.log("Mayor not revealed");
														mayorReveal(playerID, room, roomCode, game);
														// Reset
														// player.abilityTarget = targetID;
													}
												}
											}
										}
									}
								}
							} else if (elementID === "game-button-vote") {
								if (player.voteTarget !== null) {
									if (player.voteTarget !== "skip") {
										const previousVoteTargetPlayer = connectedUsers
											.get(
												getKeyFromValue(proxyIdenfication, player.voteTarget),
											)
											.getPlayer(roomCode);
									}
								}
								const theVoteTargetPlayer = connectedUsers
									.get(getKeyFromValue(proxyIdenfication, targetID))
									.getPlayer(roomCode);
								// New target

								if (game.getCycle() === "Night") {
									if (game.getPhase() === "actions") {
										if (game.getTimer().getCounter() >= 0) {
											if (player.getRole().team.includes("evil")) {
												if (player.voteTarget == null) {
													player.voteTarget = targetID;
													theVoteTargetPlayer.nightVotes +=
														player.getRole().killVoteCount;
													sendMessage(
														playerID,
														room,
														roomCode,
														game,
														null,
														null,
														"evil",
														`${player.getPlayerName()} is voting to kill ${theVoteTargetPlayer.getPlayerName()} (${
															theVoteTargetPlayer.nightVotes
														})`,
														"Night",
													);
												} else if (
													player.voteTarget !== targetID &&
													player.voteTarget !== null
												) {
													if (player.voteTarget === "skip") {
														game.setSkipVotes(
															game.getSkipVotes() - player.getRole().voteCount,
														);
													} else {
														previousVoteTargetPlayer.nightVotes -=
															player.getRole().killVoteCount;
													}
													player.voteTarget = targetID;
													theVoteTargetPlayer.nightVotes +=
														player.getRole().killVoteCount;
													sendMessage(
														playerID,
														room,
														roomCode,
														game,
														null,
														null,
														"evil",
														`${player.getPlayerName()} changed their vote to kill ${theVoteTargetPlayer.getPlayerName()} (${
															theVoteTargetPlayer.nightVotes
														})`,
														"Night",
													);
												} else if (
													player.voteTarget === targetID &&
													player.voteTarget !== null
												) {
													player.voteTarget = null;
													theVoteTargetPlayer.nightVotes -=
														player.getRole().killVoteCount;
													sendMessage(
														playerID,
														room,
														roomCode,
														game,
														null,
														null,
														"evil",
														`${player.getPlayerName()} removed their vote from ${theVoteTargetPlayer.getPlayerName()} (${
															theVoteTargetPlayer.nightVotes
														})`,
														"Night",
													);
												}
											}
										}
									}
								} else if (game.getCycle() === "Day") {
									if (game.getPhase() === "voting") {
										if (game.getTimer().getCounter() >= 0) {
											if (player.voteTarget == null) {
												player.voteTarget = targetID;
												theVoteTargetPlayer.dayVotes +=
													player.getRole().voteCount;
												if (game.settings.voteMessages.value === "anonymous") {
													sendMessage(
														playerID,
														room,
														roomCode,
														game,
														null,
														null,
														"all",
														`${player.getPlayerName()} have cast their vote`,
														"Day",
													);
												} else if (
													game.settings.voteMessages.value === "visible"
												) {
													sendMessage(
														playerID,
														room,
														roomCode,
														game,
														null,
														null,
														"all",
														`${player.getPlayerName()} is voting to lynch ${theVoteTargetPlayer.getPlayerName()} (${
															theVoteTargetPlayer.dayVotes
														})`,
														"Day",
													);
												}
											} else if (
												player.voteTarget !== targetID &&
												player.voteTarget !== null
											) {
												if (player.voteTarget === "skip") {
													game.setSkipVotes(
														game.getSkipVotes() - player.getRole().voteCount,
													);
												} else {
													previousVoteTargetPlayer.dayVotes -=
														player.getRole().voteCount;
												}

												player.voteTarget = targetID;
												theVoteTargetPlayer.dayVotes +=
													player.getRole().voteCount;
												if (game.settings.voteMessages.value === "anonymous") {
													sendMessage(
														playerID,
														room,
														roomCode,
														game,
														null,
														null,
														"all",
														`${player.getPlayerName()} has changed their vote`,
														"Day",
													);
												} else if (
													game.settings.voteMessages.value === "visible"
												) {
													sendMessage(
														playerID,
														room,
														roomCode,
														game,
														null,
														null,
														"all",
														`${player.getPlayerName()} has changed their vote to lynch ${theVoteTargetPlayer.getPlayerName()} (${
															theVoteTargetPlayer.dayVotes
														})`,
														"Day",
													);
												}
											} else if (
												player.voteTarget === targetID &&
												player.voteTarget !== null
											) {
												player.voteTarget = null;
												theVoteTargetPlayer.dayVotes -=
													player.getRole().voteCount;
												if (game.settings.voteMessages.value === "anonymous") {
													sendMessage(
														playerID,
														room,
														roomCode,
														game,
														null,
														null,
														"all",
														`${player.getPlayerName()} removed their vote`,
														"Day",
													);
												} else if (
													game.settings.voteMessages.value === "visible"
												) {
													sendMessage(
														playerID,
														room,
														roomCode,
														game,
														null,
														null,
														"all",
														`${player.getPlayerName()} removed their vote from ${theVoteTargetPlayer.getPlayerName()} (${
															theVoteTargetPlayer.dayVotes
														})`,
														"Day",
													);
												}
											}
										}
									}
								}
							}
							console.log(
								"valid target selected",
								"abilityTarget:",
								player.abilityTarget,
								"voteTarget:",
								player.voteTarget,
							);
						} else {
							if (elementID === "skip" && targetID === "skip") {
								// dayVotes for skip
								// send a message when skip
								// handle when first vote, change vote, remove vote skip
								// handle so it actually can be voted on
								if (game.getPhase() === "voting") {
									if (player.voteTarget !== null) {
										if (player.voteTarget !== "skip") {
											const previousVoteTargetPlayer = connectedUsers
												.get(
													getKeyFromValue(proxyIdenfication, player.voteTarget),
												)
												.getPlayer(roomCode);
										}
									}
									if (game.getTimer().getCounter() >= 0) {
										if (player.voteTarget == null) {
											player.voteTarget = "skip";
											game.setSkipVotes(
												game.getSkipVotes() + player.getRole().voteCount,
											);
											if (game.settings.voteMessages.value === "anonymous") {
												sendMessage(
													playerID,
													room,
													roomCode,
													game,
													null,
													null,
													"all",
													`${player.getPlayerName()} have cast their vote`,
													"Day",
												);
											} else if (
												game.settings.voteMessages.value === "visible"
											) {
												sendMessage(
													playerID,
													room,
													roomCode,
													game,
													null,
													null,
													"all",
													`${player.getPlayerName()} is voting to SKIP (${game.getSkipVotes()})`,
													"Day",
												);
											}
										} else if (
											player.voteTarget !== targetID &&
											player.voteTarget !== null
										) {
											if (player.voteTarget !== "skip") {
												previousVoteTargetPlayer.dayVotes -=
													player.getRole().voteCount;
											}

											player.voteTarget = "skip";
											game.setSkipVotes(
												game.getSkipVotes() + player.getRole().voteCount,
											);
											if (game.settings.voteMessages.value === "anonymous") {
												sendMessage(
													playerID,
													room,
													roomCode,
													game,
													null,
													null,
													"all",
													`${player.getPlayerName()} has changed their vote`,
													"Day",
												);
											} else if (
												game.settings.voteMessages.value === "visible"
											) {
												sendMessage(
													playerID,
													room,
													roomCode,
													game,
													null,
													null,
													"all",
													`${player.getPlayerName()} has changed their vote to SKIP (${game.getSkipVotes()})`,
													"Day",
												);
											}
										} else if (
											player.voteTarget === targetID &&
											player.voteTarget !== null
										) {
											player.voteTarget = null;
											game.setSkipVotes(
												game.getSkipVotes() - player.getRole().voteCount,
											);
											if (game.settings.voteMessages.value === "anonymous") {
												sendMessage(
													playerID,
													room,
													roomCode,
													game,
													null,
													null,
													"all",
													`${player.getPlayerName()} removed their vote`,
													"Day",
												);
											} else if (
												game.settings.voteMessages.value === "visible"
											) {
												sendMessage(
													playerID,
													room,
													roomCode,
													game,
													null,
													null,
													"all",
													`${player.getPlayerName()} removed their vote to SKIP (${game.getSkipVotes()})`,
													"Day",
												);
											}
										}
									}
								}
								console.log(
									"--SKIP selected",
									"abilityTarget:",
									player.abilityTarget,
									"voteTarget:",
									player.voteTarget,
									"--",
								);
							} else {
								console.log(
									"--INVALID target selected",
									"abilityTarget:",
									player.abilityTarget,
									"voteTarget:",
									player.voteTarget,
									"--",
								);
							}
						}

						socket.emit(
							"currentPlayerTargets",
							player.abilityTarget,
							player.voteTarget,
							player,
						);
					}
				}
			}
		}
	});

	socket.on("requestActionData", (playerID) => {
		if (checkUserExist(playerID)) {
			if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
				const roomCode = connectedUsers.get(playerID).getCurrentRoom();
				const room = rooms.get(roomCode);
				const game = room.getGame();
				if (game.getProgress()) {
					if (game.getUsers().includes(connectedUsers.get(playerID))) {
						socket.emit(
							"fetchedActionData",
							game.getCycle(),
							connectedUsers.get(playerID).getPlayer(roomCode).getRole(),
						);
					}
				}
			}
		}
	});

	function pushPlayer(toSend, seen, userID, userName, type, theTeam) {
		const user = { userID, userName, type, theTeam };
		if (!seen.includes(userID)) {
			seen.push(userID);
			toSend.push(user);
		}
	}

	// on connect, set all players that are in evil array, to join that room
	// on refresh, do the same.
	// create socket for handling sending players names, setting IDs for their elements
	// lawyer, executioner, yourself, doctor and surgeon, mafia, normal people
	// if evil send evil array, if playerID is lawyer, send client, if playerID is exe, send target
	// if DEAD, then they are DEAD
	// if doctor, make player accessible, and always check for self usage,
	// if surgeon, make player accessible, and always check for self usage,
	// if normal, just names, and disable self
	// players, dead, mafia, personal
	socket.on("setPlayers", (playerID, state) => {
		setPlayers(playerID, state);
	});

	function generateValidPlayerList(playerID) {
		const roomCode = connectedUsers.get(playerID).getCurrentRoom();
		const room = rooms.get(roomCode);
		const game = room.getGame();
		const socketUser = connectedUsers.get(playerID);
		const toSend = [];
		const seenAll = [];

		const socketPlayer = socketUser.getPlayer(roomCode);
		const socketRole = socketPlayer.getRole();

		for (let i = 0; i < game.getUsers().length; i++) {
			let type = "none";
			let theTeam = null;

			const user = game.getUsers()[i];
			// TOOD: Change it so the USER ID, is not the same as the user id for the cookie
			// var userID = game.getUsers()[i].getPlayerID();
			// ? PROXY
			const userID = proxyIdenfication.get(game.getUsers()[i].getPlayerID());
			const userName = game.getUsers()[i].getName();
			const userRole = game.getUsers()[i].getPlayer(roomCode).getRole();

			// Fix this, seenAll, seenAll

			if (socketPlayer.getIsKilled() || socketPlayer.getIsLynched()) {
				if (socketUser !== user) {
					if (
						user.getPlayer(roomCode).getIsKilled() ||
						user.getPlayer(roomCode).getIsLynched()
					) {
						type = "dead";
						if (socketRole.team.includes("evil")) {
							if (userRole.team.includes("evil")) {
								type = "evil+dead";
								theTeam = "evil";
							} else {
								if (userRole.type.includes("mayor")) {
									// biome-ignore lint/suspicious/noPrototypeBuiltins: <explanation>
									if (userRole.hasOwnProperty("revealed")) {
										if (userRole.revealed === true) {
											type = "mayor+dead";
											theTeam = userRole.team;
										} else {
											type = "dead";
											theTeam = userRole.team;
										}
									}
								} else {
									theTeam = userRole.team;
									type = "dead";
								}
							}
						} else {
							if (
								socketRole.type.includes("executioner") ||
								(socketRole.type.includes("jester") &&
									socketPlayer.getOldRole() !== null)
							) {
								if (socketRole.type.includes("executioner")) {
									if (user === socketRole.target) {
										theTeam = userRole.team;
										if (userRole.type.includes("mayor")) {
											// biome-ignore lint/suspicious/noPrototypeBuiltins: <explanation>
											if (userRole.hasOwnProperty("revealed")) {
												if (userRole.revealed === true) {
													type = "mayor+dead+target";
													theTeam = userRole.team;
												} else {
													type = "target+dead";
													theTeam = userRole.team;
												}
											}
										} else {
											theTeam = userRole.team;
											type = "target+dead";
										}
									} else {
										if (userRole.type.includes("mayor")) {
											// biome-ignore lint/suspicious/noPrototypeBuiltins: <explanation>
											if (userRole.hasOwnProperty("revealed")) {
												if (userRole.revealed === true) {
													type = "mayor+dead";
													theTeam = userRole.team;
												} else {
													type = "dead";
													theTeam = userRole.team;
												}
											}
										} else {
											theTeam = userRole.team;
											type = "dead";
										}
									}
								} else if (
									socketRole.type.includes("jester") &&
									socketPlayer.getOldRole().includes("executioner")
								) {
									if (user === socketPlayer.getOldTarget()) {
										theTeam = userRole.team;
										if (userRole.type.includes("mayor")) {
											// biome-ignore lint/suspicious/noPrototypeBuiltins: <explanation>
											if (userRole.hasOwnProperty("revealed")) {
												if (userRole.revealed === true) {
													type = "mayor+dead+target";
													theTeam = userRole.team;
												} else {
													type = "target+dead";
													theTeam = userRole.team;
												}
											}
										} else {
											theTeam = userRole.team;
											type = "target+dead";
										}
									} else {
										if (userRole.type.includes("mayor")) {
											// biome-ignore lint/suspicious/noPrototypeBuiltins: <explanation>
											if (userRole.hasOwnProperty("revealed")) {
												if (userRole.revealed === true) {
													type = "mayor+dead";
													theTeam = userRole.team;
												} else {
													type = "dead";
													theTeam = userRole.team;
												}
											}
										} else {
											theTeam = userRole.team;
											type = "dead";
										}
									}
								}
							} else if (socketRole.type.includes("lawyer")) {
								if (user === socketRole.client) {
									theTeam = userRole.team;
									type = "client+dead";
								} else {
									if (userRole.type.includes("mayor")) {
										// biome-ignore lint/suspicious/noPrototypeBuiltins: <explanation>
										if (userRole.hasOwnProperty("revealed")) {
											if (userRole.revealed === true) {
												type = "mayor+dead";
												theTeam = userRole.team;
											} else {
												type = "dead";
												theTeam = userRole.team;
											}
										}
									} else {
										theTeam = userRole.team;
										type = "dead";
									}
								}
							} else if (userRole.type.includes("mayor")) {
								// biome-ignore lint/suspicious/noPrototypeBuiltins: <explanation>
								if (userRole.hasOwnProperty("revealed")) {
									if (userRole.revealed === true) {
										type = "mayor+dead";
										theTeam = userRole.team;
									} else {
										type = "dead";
										theTeam = userRole.team;
									}
								}
							} else {
								theTeam = userRole.team;
							}
						}
						pushPlayer(toSend, seenAll, userID, userName, type, theTeam);
					} else {
						if (userRole.type.includes("mayor")) {
							// biome-ignore lint/suspicious/noPrototypeBuiltins: <explanation>
							if (userRole.hasOwnProperty("revealed")) {
								if (userRole.revealed === true) {
									if (
										socketRole.type.includes("executioner") ||
										(socketRole.type.includes("jester") &&
											socketPlayer.getOldRole() !== null)
									) {
										if (socketRole.type.includes("executioner")) {
											if (user === socketRole.target) {
												theTeam = "good";
												type = "mayor+target";
												pushPlayer(
													toSend,
													seenAll,
													userID,
													userName,
													type,
													theTeam,
												);
											} else {
												theTeam = "good";
												type = "mayor";
												pushPlayer(
													toSend,
													seenAll,
													userID,
													userName,
													type,
													theTeam,
												);
											}
										} else if (
											socketRole.type.includes("jester") &&
											socketPlayer.getOldRole().includes("executioner")
										) {
											if (user === socketPlayer.getOldTarget()) {
												theTeam = "good";
												type = "mayor+target";
												pushPlayer(
													toSend,
													seenAll,
													userID,
													userName,
													type,
													theTeam,
												);
											} else {
												theTeam = "good";
												type = "mayor";
												pushPlayer(
													toSend,
													seenAll,
													userID,
													userName,
													type,
													theTeam,
												);
											}
										}
									} else {
										type = "mayor";
										theTeam = "good";
										pushPlayer(
											toSend,
											seenAll,
											userID,
											userName,
											type,
											theTeam,
										);
									}
								} else {
									if (
										socketRole.type.includes("executioner") ||
										(socketRole.type.includes("jester") &&
											socketPlayer.getOldRole() !== null)
									) {
										if (socketRole.type.includes("executioner")) {
											if (user === socketRole.target) {
												theTeam = "good";
												type = "target";
												pushPlayer(
													toSend,
													seenAll,
													userID,
													userName,
													type,
													theTeam,
												);
											} else {
												theTeam = "good";
												type = "none";
												pushPlayer(
													toSend,
													seenAll,
													userID,
													userName,
													type,
													theTeam,
												);
											}
										} else if (
											socketRole.type.includes("jester") &&
											socketPlayer.getOldRole().includes("executioner")
										) {
											if (user === socketPlayer.getOldTarget()) {
												theTeam = "good";
												type = "target";
												pushPlayer(
													toSend,
													seenAll,
													userID,
													userName,
													type,
													theTeam,
												);
											} else {
												theTeam = "good";
												type = "none";
												pushPlayer(
													toSend,
													seenAll,
													userID,
													userName,
													type,
													theTeam,
												);
											}
										}
									} else {
										type = "none";
										theTeam = "good";
										pushPlayer(
											toSend,
											seenAll,
											userID,
											userName,
											type,
											theTeam,
										);
									}
								}
							}
						} else {
							if (userRole.team.includes("evil")) {
								type = "evil";
								theTeam = "evil";
								pushPlayer(toSend, seenAll, userID, userName, type, theTeam);
							} else if (userRole.team.includes("good")) {
								type = "good";
								theTeam = "good";
								pushPlayer(toSend, seenAll, userID, userName, type, theTeam);
							} else if (userRole.team.includes("neutral")) {
								type = "neutral";
								theTeam = "neutral";
								pushPlayer(toSend, seenAll, userID, userName, type, theTeam);
							}
						}
					}
				} else {
					type = "dead";
					theTeam = socketRole.team;
					pushPlayer(toSend, seenAll, userID, userName, type, theTeam);
				}
			} else {
				// socketPlayer is not dead
				if (game.getCycle().includes("Night")) {
					// Night
					if (
						user.getPlayer(roomCode).getIsKilled() ||
						user.getPlayer(roomCode).getIsLynched()
					) {
						type = "dead";
						if (socketRole.team.includes("evil")) {
							if (userRole.team.includes("evil")) {
								type = "evil+dead";
								theTeam = "evil";
							} else {
								if (userRole.type.includes("mayor")) {
									// biome-ignore lint/suspicious/noPrototypeBuiltins: <explanation>
									if (userRole.hasOwnProperty("revealed")) {
										if (userRole.revealed === true) {
											type = "mayor+dead";
											theTeam = null;
										} else {
											type = "dead";
											theTeam = null;
										}
									}
								} else {
									theTeam = null;
									type = "dead";
								}
							}
						} else {
							if (
								socketRole.type.includes("executioner") ||
								(socketRole.type.includes("jester") &&
									socketPlayer.getOldRole() !== null)
							) {
								if (socketRole.type.includes("executioner")) {
									if (user === socketRole.target) {
										theTeam = null;
										if (userRole.type.includes("mayor")) {
											// biome-ignore lint/suspicious/noPrototypeBuiltins: <explanation>
											if (userRole.hasOwnProperty("revealed")) {
												if (userRole.revealed === true) {
													type = "mayor+dead+target";
													theTeam = null;
												} else {
													type = "target+dead";
													theTeam = null;
												}
											}
										} else {
											theTeam = null;
											type = "target+dead";
										}
									} else {
										if (userRole.type.includes("mayor")) {
											// biome-ignore lint/suspicious/noPrototypeBuiltins: <explanation>
											if (userRole.hasOwnProperty("revealed")) {
												if (userRole.revealed === true) {
													type = "mayor+dead";
													theTeam = null;
												} else {
													type = "dead";
													theTeam = null;
												}
											}
										} else {
											theTeam = null;
											type = "dead";
										}
									}
								} else if (
									socketRole.type.includes("jester") &&
									socketPlayer.getOldRole().includes("executioner")
								) {
									if (user === socketPlayer.getOldTarget()) {
										theTeam = null;
										if (userRole.type.includes("mayor")) {
											// biome-ignore lint/suspicious/noPrototypeBuiltins: <explanation>
											if (userRole.hasOwnProperty("revealed")) {
												if (userRole.revealed === true) {
													type = "mayor+dead+target";
													theTeam = null;
												} else {
													type = "target+dead";
													theTeam = null;
												}
											}
										} else {
											theTeam = null;
											type = "target+dead";
										}
									} else {
										if (userRole.type.includes("mayor")) {
											// biome-ignore lint/suspicious/noPrototypeBuiltins: <explanation>
											if (userRole.hasOwnProperty("revealed")) {
												if (userRole.revealed === true) {
													type = "mayor+dead";
													theTeam = null;
												} else {
													type = "dead";
													theTeam = null;
												}
											}
										} else {
											theTeam = null;
											type = "dead";
										}
									}
								}
							} else if (socketRole.type.includes("lawyer")) {
								if (user === socketRole.client) {
									theTeam = null;
									type = "client+dead";
								} else {
									if (userRole.type.includes("mayor")) {
										// biome-ignore lint/suspicious/noPrototypeBuiltins: <explanation>
										if (userRole.hasOwnProperty("revealed")) {
											if (userRole.revealed === true) {
												type = "mayor+dead";
												theTeam = null;
											} else {
												type = "dead";
												theTeam = null;
											}
										}
									} else {
										theTeam = null;
										type = "dead";
									}
								}
							} else if (userRole.type.includes("mayor")) {
								// biome-ignore lint/suspicious/noPrototypeBuiltins: <explanation>
								if (userRole.hasOwnProperty("revealed")) {
									if (userRole.revealed === true) {
										type = "mayor+dead";
										theTeam = null;
									} else {
										type = "dead";
										theTeam = null;
									}
								}
							} else {
								theTeam = null;
							}
						}
						pushPlayer(toSend, seenAll, userID, userName, type, theTeam);
					}

					if (userRole.type.includes("mayor")) {
						// biome-ignore lint/suspicious/noPrototypeBuiltins: <explanation>
						if (userRole.hasOwnProperty("revealed")) {
							if (userRole.revealed === true) {
								if (
									socketRole.type.includes("executioner") ||
									(socketRole.type.includes("jester") &&
										socketPlayer.getOldRole() !== null)
								) {
									if (socketRole.type.includes("executioner")) {
										if (user === socketRole.target) {
											theTeam = null;
											type = "mayor+target";
											pushPlayer(
												toSend,
												seenAll,
												userID,
												userName,
												type,
												theTeam,
											);
										} else {
											theTeam = null;
											type = "mayor";
											pushPlayer(
												toSend,
												seenAll,
												userID,
												userName,
												type,
												theTeam,
											);
										}
									} else if (
										socketRole.type.includes("jester") &&
										socketPlayer.getOldRole().includes("executioner")
									) {
										if (user === socketPlayer.getOldTarget()) {
											theTeam = null;
											type = "mayor+target";
											pushPlayer(
												toSend,
												seenAll,
												userID,
												userName,
												type,
												theTeam,
											);
										} else {
											theTeam = null;
											type = "mayor";
											pushPlayer(
												toSend,
												seenAll,
												userID,
												userName,
												type,
												theTeam,
											);
										}
									}
								} else {
									type = "mayor";
									theTeam = null;
									pushPlayer(toSend, seenAll, userID, userName, type, theTeam);
								}
							} else {
								if (
									socketRole.type.includes("executioner") ||
									(socketRole.type.includes("jester") &&
										socketPlayer.getOldRole() !== null)
								) {
									if (socketRole.type.includes("executioner")) {
										if (user === socketRole.target) {
											theTeam = null;
											type = "target";
											pushPlayer(
												toSend,
												seenAll,
												userID,
												userName,
												type,
												theTeam,
											);
										} else {
											theTeam = null;
											type = "none";
											pushPlayer(
												toSend,
												seenAll,
												userID,
												userName,
												type,
												theTeam,
											);
										}
									} else if (
										socketRole.type.includes("jester") &&
										socketPlayer.getOldRole().includes("executioner")
									) {
										if (user === socketPlayer.getOldTarget()) {
											theTeam = null;
											type = "target";
											pushPlayer(
												toSend,
												seenAll,
												userID,
												userName,
												type,
												theTeam,
											);
										} else {
											theTeam = null;
											type = "none";
											pushPlayer(
												toSend,
												seenAll,
												userID,
												userName,
												type,
												theTeam,
											);
										}
									}
								} else {
									type = "none";
									theTeam = null;
									pushPlayer(toSend, seenAll, userID, userName, type, theTeam);
								}
							}
						}
					}

					if (socketRole.hasNightAbility) {
						// has night ability
						if (user === socketUser) {
							// yourself
							if (userRole.team.includes("evil")) {
								if (userRole.type.includes("surgeon")) {
									if (userRole.selfUsage > 0) {
										type = "evil";
										theTeam = "evil";
										pushPlayer(
											toSend,
											seenAll,
											userID,
											userName,
											type,
											theTeam,
										);
									} else if (userRole.selfUsage === 0) {
										type = "evil+unselectable";
										theTeam = "evil";
										pushPlayer(
											toSend,
											seenAll,
											userID,
											userName,
											type,
											theTeam,
										);
									}
								} else {
									type = "evil+unselectable";
									theTeam = "evil";
									pushPlayer(toSend, seenAll, userID, userName, type, theTeam);
								}
							} else {
								if (userRole.type.includes("doctor")) {
									if (userRole.selfUsage > 0) {
										type = "none";
										theTeam = null;
										pushPlayer(
											toSend,
											seenAll,
											userID,
											userName,
											type,
											theTeam,
										);
									} else if (userRole.selfUsage === 0) {
										type = "unselectable";
										theTeam = null;
										pushPlayer(
											toSend,
											seenAll,
											userID,
											userName,
											type,
											theTeam,
										);
									}
								} else {
									theTeam = null;
									type = "unselectable";
									pushPlayer(toSend, seenAll, userID, userName, type, theTeam);
								}
							}
						} else {
							// everyone else
							if (socketRole.type.includes("surgeon")) {
								if (userRole.team.includes("evil")) {
									theTeam = "evil";
									type = "evil";
									pushPlayer(toSend, seenAll, userID, userName, type, theTeam);
								} else {
									theTeam = null;
									type = "none";
									pushPlayer(toSend, seenAll, userID, userName, type, theTeam);
								}
							} else if (socketRole.type.includes("witch")) {
								if (userRole.team.includes("evil")) {
									theTeam = "evil";
									type = "evil+unselectable";
									pushPlayer(toSend, seenAll, userID, userName, type, theTeam);
								} else {
									theTeam = null;
									type = "none";
									pushPlayer(toSend, seenAll, userID, userName, type, theTeam);
								}
							} else if (socketRole.type.includes("framer")) {
								if (userRole.team.includes("evil")) {
									theTeam = "evil";
									type = "evil+unselectable";
									pushPlayer(toSend, seenAll, userID, userName, type, theTeam);
								} else {
									theTeam = null;
									type = "none";
									pushPlayer(toSend, seenAll, userID, userName, type, theTeam);
								}
							} else {
								theTeam = null;
								type = "none";
								pushPlayer(toSend, seenAll, userID, userName, type, theTeam);
							}
						}
					} else {
						// NO night ability
						if (user === socketUser) {
							// yourself
							if (userRole.team.includes("evil")) {
								theTeam = "evil";
								type = "evil+unselectable";
								pushPlayer(toSend, seenAll, userID, userName, type, theTeam);
							} else {
								theTeam = null;
								type = "none";
								pushPlayer(toSend, seenAll, userID, userName, type, theTeam);
							}
						} else {
							if (socketRole.team.includes("evil")) {
								if (userRole.team.includes("evil")) {
									theTeam = "evil";
									type = "evil+unselectable";
									pushPlayer(toSend, seenAll, userID, userName, type, theTeam);
								} else {
									theTeam = null;
									type = "none";
									pushPlayer(toSend, seenAll, userID, userName, type, theTeam);
								}
							}
							// if socket is executioner
							else if (
								socketRole.type.includes("executioner") ||
								(socketRole.type.includes("jester") &&
									socketPlayer.getOldRole() !== null)
							) {
								if (socketRole.type.includes("executioner")) {
									if (user === socketRole.target) {
										theTeam = null;
										type = "target";
										pushPlayer(
											toSend,
											seenAll,
											userID,
											userName,
											type,
											theTeam,
										);
									} else {
										theTeam = null;
										type = "none";
										pushPlayer(
											toSend,
											seenAll,
											userID,
											userName,
											type,
											theTeam,
										);
									}
								} else if (
									socketRole.type.includes("jester") &&
									socketPlayer.getOldRole().includes("executioner")
								) {
									if (user === socketPlayer.getOldTarget()) {
										theTeam = null;
										type = "target";
										pushPlayer(
											toSend,
											seenAll,
											userID,
											userName,
											type,
											theTeam,
										);
									} else {
										theTeam = null;
										type = "none";
										pushPlayer(
											toSend,
											seenAll,
											userID,
											userName,
											type,
											theTeam,
										);
									}
								}
							}
							// if socket is lawyer
							else if (socketRole.type.includes("lawyer")) {
								if (user === socketRole.client) {
									theTeam = null;
									type = "client";
									pushPlayer(toSend, seenAll, userID, userName, type, theTeam);
								} else {
									theTeam = null;
									type = "none";
									pushPlayer(toSend, seenAll, userID, userName, type, theTeam);
								}
							} else {
								theTeam = null;
								type = "none";
								pushPlayer(toSend, seenAll, userID, userName, type, theTeam);
							}
						}
					}
				} else if (game.getCycle().includes("Day")) {
					// Day
					if (
						user.getPlayer(roomCode).getIsKilled() ||
						user.getPlayer(roomCode).getIsLynched()
					) {
						type = "dead";
						if (socketRole.team.includes("evil")) {
							if (userRole.team.includes("evil")) {
								type = "evil+dead";
								theTeam = "evil";
							} else {
								if (userRole.type.includes("mayor")) {
									// biome-ignore lint/suspicious/noPrototypeBuiltins: <explanation>
									if (userRole.hasOwnProperty("revealed")) {
										if (userRole.revealed === true) {
											type = "mayor+dead";
											theTeam = null;
										} else {
											type = "dead";
											theTeam = null;
										}
									}
								} else {
									theTeam = null;
									type = "dead";
								}
							}
						} else {
							if (
								socketRole.type.includes("executioner") ||
								(socketRole.type.includes("jester") &&
									socketPlayer.getOldRole() !== null)
							) {
								if (socketRole.type.includes("executioner")) {
									if (user === socketRole.target) {
										theTeam = null;
										if (userRole.type.includes("mayor")) {
											// biome-ignore lint/suspicious/noPrototypeBuiltins: <explanation>
											if (userRole.hasOwnProperty("revealed")) {
												if (userRole.revealed === true) {
													type = "mayor+dead+target";
													theTeam = null;
												} else {
													type = "target+dead";
													theTeam = null;
												}
											}
										} else {
											theTeam = null;
											type = "target+dead";
										}
									} else {
										if (userRole.type.includes("mayor")) {
											// biome-ignore lint/suspicious/noPrototypeBuiltins: <explanation>
											if (userRole.hasOwnProperty("revealed")) {
												if (userRole.revealed === true) {
													type = "mayor+dead";
													theTeam = null;
												} else {
													type = "dead";
													theTeam = null;
												}
											}
										} else {
											theTeam = null;
											type = "dead";
										}
									}
								} else if (
									socketRole.type.includes("jester") &&
									socketPlayer.getOldRole().includes("executioner")
								) {
									if (user === socketPlayer.getOldTarget()) {
										theTeam = null;
										if (userRole.type.includes("mayor")) {
											// biome-ignore lint/suspicious/noPrototypeBuiltins: <explanation>
											if (userRole.hasOwnProperty("revealed")) {
												if (userRole.revealed === true) {
													type = "mayor+dead+target";
													theTeam = null;
												} else {
													type = "target+dead";
													theTeam = null;
												}
											}
										} else {
											theTeam = null;
											type = "target+dead";
										}
									} else {
										if (userRole.type.includes("mayor")) {
											// biome-ignore lint/suspicious/noPrototypeBuiltins: <explanation>
											if (userRole.hasOwnProperty("revealed")) {
												if (userRole.revealed === true) {
													type = "mayor+dead";
													theTeam = null;
												} else {
													type = "dead";
													theTeam = null;
												}
											}
										} else {
											theTeam = null;
											type = "dead";
										}
									}
								}
							} else if (socketRole.type.includes("lawyer")) {
								if (user === socketRole.client) {
									theTeam = null;
									type = "client+dead";
								} else {
									if (userRole.type.includes("mayor")) {
										// biome-ignore lint/suspicious/noPrototypeBuiltins: <explanation>
										if (userRole.hasOwnProperty("revealed")) {
											if (userRole.revealed === true) {
												type = "mayor+dead";
												theTeam = null;
											} else {
												type = "dead";
												theTeam = null;
											}
										}
									} else {
										theTeam = null;
										type = "dead";
									}
								}
							} else if (userRole.type.includes("mayor")) {
								// biome-ignore lint/suspicious/noPrototypeBuiltins: <explanation>
								if (userRole.hasOwnProperty("revealed")) {
									if (userRole.revealed === true) {
										type = "mayor+dead";
										theTeam = null;
									} else {
										type = "dead";
										theTeam = null;
									}
								}
							} else {
								theTeam = null;
							}
						}
						pushPlayer(toSend, seenAll, userID, userName, type, theTeam);
					}

					if (userRole.type.includes("mayor")) {
						// biome-ignore lint/suspicious/noPrototypeBuiltins: <explanation>
						if (userRole.hasOwnProperty("revealed")) {
							if (userRole.revealed === true) {
								if (
									socketRole.type.includes("executioner") ||
									(socketRole.type.includes("jester") &&
										socketPlayer.getOldRole() !== null)
								) {
									if (socketRole.type.includes("executioner")) {
										if (user === socketRole.target) {
											theTeam = null;
											type = "mayor+target";
											pushPlayer(
												toSend,
												seenAll,
												userID,
												userName,
												type,
												theTeam,
											);
										} else {
											theTeam = null;
											type = "mayor";
											pushPlayer(
												toSend,
												seenAll,
												userID,
												userName,
												type,
												theTeam,
											);
										}
									} else if (
										socketRole.type.includes("jester") &&
										socketPlayer.getOldRole().includes("executioner")
									) {
										if (user === socketPlayer.getOldTarget()) {
											theTeam = null;
											type = "mayor+target";
											pushPlayer(
												toSend,
												seenAll,
												userID,
												userName,
												type,
												theTeam,
											);
										} else {
											theTeam = null;
											type = "mayor";
											pushPlayer(
												toSend,
												seenAll,
												userID,
												userName,
												type,
												theTeam,
											);
										}
									}
								} else {
									type = "mayor";
									theTeam = null;
									pushPlayer(toSend, seenAll, userID, userName, type, theTeam);
								}
							} else {
								if (
									socketRole.type.includes("executioner") ||
									(socketRole.type.includes("jester") &&
										socketPlayer.getOldRole() !== null)
								) {
									if (socketRole.type.includes("executioner")) {
										if (user === socketRole.target) {
											theTeam = null;
											type = "target";
											pushPlayer(
												toSend,
												seenAll,
												userID,
												userName,
												type,
												theTeam,
											);
										} else {
											theTeam = null;
											type = "none";
											pushPlayer(
												toSend,
												seenAll,
												userID,
												userName,
												type,
												theTeam,
											);
										}
									} else if (
										socketRole.type.includes("jester") &&
										socketPlayer.getOldRole().includes("executioner")
									) {
										if (user === socketPlayer.getOldTarget()) {
											theTeam = null;
											type = "target";
											pushPlayer(
												toSend,
												seenAll,
												userID,
												userName,
												type,
												theTeam,
											);
										} else {
											theTeam = null;
											type = "none";
											pushPlayer(
												toSend,
												seenAll,
												userID,
												userName,
												type,
												theTeam,
											);
										}
									}
								} else {
									type = "none";
									theTeam = null;
									pushPlayer(toSend, seenAll, userID, userName, type, theTeam);
								}
							}
						}
					}

					if (user === socketUser) {
						// yourself
						if (userRole.team.includes("evil")) {
							theTeam = "evil";
							type = "evil";
							pushPlayer(toSend, seenAll, userID, userName, type, theTeam);
						} else {
							theTeam = null;
							type = "none";
							pushPlayer(toSend, seenAll, userID, userName, type, theTeam);
						}
					} else {
						// everyone else
						if (socketRole.team.includes("evil")) {
							if (userRole.team.includes("evil")) {
								theTeam = "evil";
								type = "evil";
								pushPlayer(toSend, seenAll, userID, userName, type, theTeam);
							} else {
								theTeam = null;
								type = "none";
								pushPlayer(toSend, seenAll, userID, userName, type, theTeam);
							}
						}
						// if socket is executioner
						else if (
							socketRole.type.includes("executioner") ||
							(socketRole.type.includes("jester") &&
								socketPlayer.getOldRole() !== null)
						) {
							if (socketRole.type.includes("executioner")) {
								if (user === socketRole.target) {
									theTeam = null;
									type = "target";
									pushPlayer(toSend, seenAll, userID, userName, type, theTeam);
								} else {
									theTeam = null;
									type = "none";
									pushPlayer(toSend, seenAll, userID, userName, type, theTeam);
								}
							} else if (
								socketRole.type.includes("jester") &&
								socketPlayer.getOldRole().includes("executioner")
							) {
								if (user === socketPlayer.getOldTarget()) {
									theTeam = null;
									type = "target";
									pushPlayer(toSend, seenAll, userID, userName, type, theTeam);
								} else {
									theTeam = null;
									type = "none";
									pushPlayer(toSend, seenAll, userID, userName, type, theTeam);
								}
							}
						}
						// if socket is lawyer
						else if (socketRole.type.includes("lawyer")) {
							if (user === socketRole.client) {
								theTeam = null;
								type = "client";
								pushPlayer(toSend, seenAll, userID, userName, type, theTeam);
							} else {
								theTeam = null;
								type = "none";
								pushPlayer(toSend, seenAll, userID, userName, type, theTeam);
							}
						} else {
							theTeam = null;
							type = "none";
							pushPlayer(toSend, seenAll, userID, userName, type, theTeam);
						}
					}
				}
			}
		}
		return toSend;
	}

	function setPlayers(playerID, state) {
		console.log("SETTING PLAYERS");
		if (checkUserExist(playerID)) {
			if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
				const roomCode = connectedUsers.get(playerID).getCurrentRoom();
				const room = rooms.get(roomCode);
				const game = room.getGame();
				if (game.getProgress()) {
					if (game.getUsers().includes(connectedUsers.get(playerID))) {
						const socketPlayer = connectedUsers
							.get(playerID)
							.getPlayer(roomCode);
						const socketRole = connectedUsers
							.get(playerID)
							.getPlayer(roomCode)
							.getRole();
						let isDead = false;

						if (socketPlayer.getIsKilled() || socketPlayer.getIsLynched()) {
							isDead = true;
						}
						let emitTo = "";
						if (state.includes("first")) {
							emitTo = "setPlayersFirst";
						} else if (state.includes("clock")) {
							emitTo = "setPlayersClock";
						} else if (state.includes("refresh")) {
							emitTo = "setPlayersRefresh";
						}
						// console.log(socketRole.type, socketPlayer.getPlayerName(), "sees:")
						// console.log(generateValidPlayerList(playerID))
						socket.emit(
							emitTo,
							generateValidPlayerList(playerID),
							game.getCycle(),
							game.getPhase(),
							isDead,
							socketPlayer,
							socketRole,
							proxyIdenfication.get(playerID),
						);
					}
				}
			}
		}
	}

	socket.on("checkIfDead", (playerID, state, type) => {
		if (checkUserExist(playerID)) {
			if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
				const roomCode = connectedUsers.get(playerID).getCurrentRoom();
				const room = rooms.get(roomCode);
				const game = room.getGame();
				if (game.getProgress()) {
					if (game.getUsers().includes(connectedUsers.get(playerID))) {
						const user = connectedUsers.get(playerID);
						const player = user.getPlayer(roomCode);
						let isDead = false;
						if (type === "cemetery") {
							if (game.getCemetery().includes(user)) {
								isDead = true;
							} else if (!game.getCemetery().includes(user)) {
								isDead = false;
							}
						} else if (type === "dead") {
							if (player.getIsKilled() || player.getIsLynched()) {
								isDead = true;
							} else if (!player.getIsKilled() && !player.getIsLynched()) {
								isDead = false;
							}
						}

						let emitTo = "";
						if (state.includes("refresh")) {
							emitTo = "isPlayerDeadRefresh";
						} else if (state.includes("clock")) {
							emitTo = "isPlayerDeadClock";
						} else if (state.includes("after")) {
							emitTo = "isPlayerDeadAfter";
						}
						socket.emit(emitTo, game.getPhase(), isDead);
					}
				}
			}
		}
	});

	socket.on("fetchMessages", (playerID) => {
		if (checkUserExist(playerID)) {
			if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
				const roomCode = connectedUsers.get(playerID).getCurrentRoom();
				const room = rooms.get(roomCode);
				const game = room.getGame();
				if (game.getProgress()) {
					if (game.getUsers().includes(connectedUsers.get(playerID))) {
						socket.emit(
							"savedMessages",
							connectedUsers.get(playerID).getPlayer(roomCode).getMessages(),
							game.getCycle(),
						);
					}
				}
			}
		}
	});

	function messageHandlerForPhases(playerID, room, roomCode, game) {
		const lineSeperator = "--------------------------------";
		if (game.getEmitPhaseOnce()) {
			if (game.getPhase().includes("actions")) {
				sendMessage(
					playerID,
					room,
					roomCode,
					game,
					null,
					null,
					"all",
					"It's time to act. The action phase has begun",
					"extra",
				);
			}
			if (game.getPhase().includes("message")) {
				sendMessage(
					playerID,
					room,
					roomCode,
					game,
					null,
					null,
					"all",
					lineSeperator,
					"lineSeperator",
				);
				sendMessage(
					playerID,
					room,
					roomCode,
					game,
					null,
					null,
					"all",
					"The sun begins to rise",
					"bold",
				);
			}
			if (game.getPhase().includes("recap")) {
				sendMessage(
					playerID,
					room,
					roomCode,
					game,
					null,
					null,
					"all",
					"This happened last night",
					"extra",
				);
			}
			if (game.getPhase().includes("discussion")) {
				sendMessage(
					playerID,
					room,
					roomCode,
					game,
					null,
					null,
					"all",
					lineSeperator,
					"lineSeperator",
				);
				sendMessage(
					playerID,
					room,
					roomCode,
					game,
					null,
					null,
					"all",
					"Time for discussion!",
					"extra",
				);
			}
			if (game.getPhase().includes("voting")) {
				sendMessage(
					playerID,
					room,
					roomCode,
					game,
					null,
					null,
					"all",
					lineSeperator,
					"lineSeperator",
				);
				sendMessage(
					playerID,
					room,
					roomCode,
					game,
					null,
					null,
					"all",
					"It's time to cast your votes",
					"extra",
				);
			}
			game.setEmitPhaseOnce(false);
		}
	}

	function messageHandlerForCycles(playerID, room, roomCode, game) {
		if (game.getEmitCycleOnce()) {
			if (game.getCycle().includes("Night")) {
				sendMessage(
					playerID,
					room,
					roomCode,
					game,
					null,
					null,
					"all",
					`${game.getCycle()} ${game.getCycleCount()}`,
					"timestamp",
				);
				sendMessage(
					playerID,
					room,
					roomCode,
					game,
					null,
					null,
					"all",
					"The moon glows. The night has begun",
					"bold",
				);
			} else if (game.getCycle().includes("Day")) {
				sendMessage(
					playerID,
					room,
					roomCode,
					game,
					null,
					null,
					"all",
					`${game.getCycle()} ${game.getCycleCount()}`,
					"timestamp",
				);
				sendMessage(
					playerID,
					room,
					roomCode,
					game,
					null,
					null,
					"all",
					"The day has begun",
					"bold",
				);
			}
		}
		game.setEmitCycleOnce(false);
	}

	socket.on("sendChatMessageDead", (playerID, message) => {
		if (checkUserExist(playerID)) {
			if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
				const roomCode = connectedUsers.get(playerID).getCurrentRoom();
				const room = rooms.get(roomCode);
				const game = room.getGame();
				const user = connectedUsers.get(playerID);
				const player = user.getPlayer(roomCode);
				const role = player.getRole();
				if (game.getProgress()) {
					if (game.getUsers().includes(user)) {
						if (game.getCemetery().includes(user)) {
							// console.log(message);
							sendMessage(
								playerID,
								room,
								roomCode,
								game,
								player.getPlayerName(),
								role.team,
								"dead",
								message,
								"dead",
							);
						}
					}
				}
			}
		}
	});

	function sendMessage(
		playerID,
		room,
		roomCode,
		game,
		sender,
		team,
		sendTo = "",
		message = "",
		type = "",
	) {
		if (sendTo === "all") {
			for (let i = 0; i < game.getUsers().length; i++) {
				if (game.getUsers()[i].getInGame()) {
					game
						.getUsers()
						[i].getPlayer(roomCode)
						.addMessage({ sender, team, message, type });
				}
			}
			io.to(roomCode).emit(
				"receiveMessage",
				sender,
				team,
				message,
				type,
				game.getCycle(),
			);
		} else if (sendTo === "evil") {
			for (let i = 0; i < game.getEvil().length; i++) {
				if (game.getEvil()[i].getInGame()) {
					game
						.getEvil()
						[i].getPlayer(roomCode)
						.addMessage({ sender, team, message, type });
				}
			}
			io.to(game.getEvilRoom()).emit(
				"receiveMessage",
				sender,
				team,
				message,
				type,
				game.getCycle(),
			);
		} else if (sendTo === "dead") {
			for (let i = 0; i < game.getCemetery().length; i++) {
				if (game.getCemetery()[i].getInGame()) {
					game
						.getCemetery()
						[i].getPlayer(roomCode)
						.addMessage({ sender, team, message, type });
				}
			}
			io.to(game.getCemeteryRoom()).emit(
				"receiveMessage",
				sender,
				team,
				message,
				type,
				game.getCycle(),
			);
		} else if (sendTo === "socket") {
			if (connectedUsers.get(playerID).getInGame()) {
				connectedUsers
					.get(playerID)
					.getPlayer(roomCode)
					.addMessage({ sender, team, message, type });
			}
			io.to(playerID).emit(
				"receiveMessage",
				sender,
				team,
				message,
				type,
				game.getCycle(),
			);
		} else if (sendTo === "target") {
			if (connectedUsers.get(playerID).getInGame()) {
				connectedUsers
					.get(playerID)
					.getPlayer(roomCode)
					.addMessage({ sender, team, message, type });
			}
			io.to(playerID).emit(
				"receiveMessage",
				sender,
				team,
				message,
				type,
				game.getCycle(),
			);
		}
	}

	function resetPhaseConditions(game) {
		game.setNightMessagesOnce(0);
		game.setRecapOnce(0);
		game.setDayMessagesOnce(0);
	}

	socket.on("setActionsOnPhase", (playerID, state) => {
		console.log("Setting actions on phase");
		setActionsOnPhase(playerID, state);
	});

	function setActionsOnPhase(playerID, state) {
		if (checkUserExist(playerID)) {
			if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
				const roomCode = connectedUsers.get(playerID).getCurrentRoom();
				const room = rooms.get(roomCode);
				const game = room.getGame();
				if (game.getProgress()) {
					if (game.getUsers().includes(connectedUsers.get(playerID))) {
						let emitTo = "";
						if (state.includes("first")) {
							emitTo = "removeActionsOnPhaseFirst";
							socket.emit(emitTo, game.getPhase());
						} else if (state.includes("clock")) {
							emitTo = "removeActionsOnPhaseClock";
							io.to(roomCode).emit(emitTo, game.getPhase());
						} else if (state.includes("refresh")) {
							emitTo = "removeActionsOnPhaseRefresh";
							socket.emit(emitTo, game.getPhase());
						}
					}
				}
			}
		}
	}

	// TODO: need to do this
	// ! FIX THIS
	function gameHandler(playerID) {
		// ? PROXY HANDLING
		const roomCode = connectedUsers.get(playerID).getCurrentRoom();
		const room = rooms.get(roomCode);
		const game = room.getGame();
		if (game.getProgress() && game.getDone() === false) {
			if (game.getCycle() === "Night") {
				if (game.getPhase() === "nightMessages") {
					if (game.getNightMessagesOnce() === 0) {
						console.log("EXECUTING NIGHT ACTIONS");
						executeNightActions(playerID, room, roomCode, game);
						voteHandlerEvil(playerID, room, roomCode, game);
						io.to(roomCode).emit("updateSetPlayers");
						game.setNightMessagesOnce(1);
						resetAllActions(playerID, room, roomCode, game);
					}
				}
			} else if (game.getCycle() === "Day") {
				if (game.getPhase() === "voting") {
					checkAllHaveVoted(playerID, room, roomCode, game);
				} else if (game.getPhase() === "dayMessages") {
					if (game.getDayMessagesOnce() === 0) {
						console.log("VOTE GLOBAL");
						voteHandlerGlobal(playerID, room, roomCode, game);
						console.log("DEATH HANDLER VOTE");
						deathHandler(playerID, room, roomCode, game);
						io.to(roomCode).emit("updateSetPlayers");
						checkForWin(playerID, room, roomCode, game);
						game.setDayMessagesOnce(1);
						resetAllActions(playerID, room, roomCode, game);
					}
				} else if (game.getPhase() === "discussion") {
					resetAllActions(playerID, room, roomCode, game);
				} else if (game.getPhase() === "recap") {
					if (game.getRecapOnce() === 0) {
						console.log("DEATH HANDLER RECAP");
						deathHandler(playerID, room, roomCode, game);
						io.to(roomCode).emit("updateSetPlayers");
						checkForWin(playerID, room, roomCode, game);
						game.setRecapOnce(1);
						resetAllActions(playerID, room, roomCode, game);
					}
				}
			}
		}
	}

	function checkForWin(playerID, room, roomCode, game) {
		// This is after voteHandlerGlobal and deathHandler (dayMessages)
		// This is also after deatHandler (recap)

		// Iterate over alive players, check which ones are left
		let goodCount = 0;
		let evilCount = 0;
		let neutralCount = 0;
		const aliveCount = game.getAlive().length;
		let theLawyer = null;
		let theSerialKiller = null;
		let theExecutioner = null;
		let theJester = null;
		let secondJester = null;

		console.log("Checking for win");
		if (game.getNoDeaths() < maxNoDeaths) {
			for (let i = 0; i < game.getUsers().length; i++) {
				const theUser = game.getUsers()[i];
				const thePlayer = theUser.getPlayer(roomCode);
				const theRole = thePlayer.getRole();

				// Assign users to their respective roles
				// They could be dead or alive
				if (theRole.type.includes("jester")) {
					if (thePlayer.getOldRole() == null) {
						theJester = theUser;
					} else if (thePlayer.getOldRole() === "executioner") {
						secondJester = theUser;
					}
				} else if (theRole.type.includes("executioner")) {
					if (thePlayer.getOldRole() == null) {
						theExecutioner = theUser;
					}
				} else if (theRole.type.includes("serial killer")) {
					theSerialKiller = theUser;
				} else if (theRole.type.includes("lawyer")) {
					theLawyer = theUser;
				}

				// Only counts if the person is alive
				if (
					thePlayer.getIsKilled() === false &&
					thePlayer.getIsLynched() === false
				) {
					if (theRole.team.includes("good")) {
						goodCount++;
					} else if (theRole.team.includes("evil")) {
						evilCount++;
					} else if (theRole.team.includes("neutral")) {
						neutralCount++;
					}
				}
			}

			console.log("good", goodCount);
			console.log("evil", evilCount);
			console.log("neutral", neutralCount);

			// Handle only 2 players alive?

			if (!game.getExecutionerWin() && !game.getJesterWin()) {
				if (evilCount === 0 && neutralCount === 0 && goodCount === 0) {
					game.setDraw(true);
				} else if (game.getUsers().length === 0) {
					// Return immediately (this means everybody has LEFT, one by one)
					// game.setDone(true)
					endGameClear(game, roomCode);
				} else if (
					evilCount === 0 &&
					neutralCount >= 0 &&
					neutralCount < goodCount &&
					goodCount > 0
				) {
					// GOOD TEAM WINS
					if (theSerialKiller !== null) {
						if (
							theSerialKiller.getPlayer(roomCode).getIsKilled() ||
							theSerialKiller.getPlayer(roomCode).getIsLynched()
						) {
							game.setGoodWin(true);
							for (let i = 0; i < game.getUsers().length; i++) {
								const user = game.getUsers()[i];
								if (user.getPlayer(roomCode).getRole().team.includes("good")) {
									const winnerID = user.getPlayerID();
									const winnerName = user.getPlayer(roomCode).getPlayerName();
									const winner = { winnerID, winnerName };
									game.addWinner(winner);
								}
							}
						}
					} else {
						game.setGoodWin(true);
						for (let i = 0; i < game.getUsers().length; i++) {
							const user = game.getUsers()[i];
							if (user.getPlayer(roomCode).getRole().team.includes("good")) {
								const winnerID = user.getPlayerID();
								const winnerName = user.getPlayer(roomCode).getPlayerName();
								const winner = { winnerID, winnerName };
								game.addWinner(winner);
							}
						}
					}
				} else if (aliveCount === 1) {
					let theNeutralUser = null;
					if (
						game
							.getAlive()[0]
							.getPlayer(roomCode)
							.getRole()
							.type.includes("serial killer")
					) {
						theNeutralUser = game.getAlive()[0];
					}
					if (
						game
							.getAlive()[0]
							.getPlayer(roomCode)
							.getRole()
							.team.includes("good")
					) {
						game.setGoodWin(true);
						for (let i = 0; i < game.getUsers().length; i++) {
							const user = game.getUsers()[i];
							if (user.getPlayer(roomCode).getRole().team.includes("good")) {
								const winnerID = user.getPlayerID();
								const winnerName = user.getPlayer(roomCode).getPlayerName();
								const winner = { winnerID, winnerName };
								game.addWinner(winner);
							}
						}
					}
					if (
						game
							.getAlive()[0]
							.getPlayer(roomCode)
							.getRole()
							.team.includes("evil")
					) {
						game.setEvilWin(true);
						for (let i = 0; i < game.getUsers().length; i++) {
							const user = game.getUsers()[i];
							const player = user.getPlayer(roomCode);
							const role = player.getRole();

							if (role.team.includes("evil")) {
								const winnerID = user.getPlayerID();
								const winnerName = player.getPlayerName();
								const winner = { winnerID, winnerName };
								game.addWinner(winner);
							}
							if (theLawyer !== null) {
								if (
									theLawyer
										.getPlayer(roomCode)
										.getRole()
										.client.getPlayer(roomCode)
										.getRole()
										.team.includes("evil")
								) {
									game.setLawyerWin(true);
									const winnerID = theLawyer.getPlayerID();
									const winnerName = theLawyer
										.getPlayer(roomCode)
										.getPlayerName();
									const winner = { winnerID, winnerName };
									game.addWinner(winner);
								}
							}
						}
					} else if (
						game
							.getAlive()[0]
							.getPlayer(roomCode)
							.getRole()
							.team.includes("neutral")
					) {
						if (theNeutralUser != null) {
							const serialKillerMessages = [
								"DIE, DIE, DIE!",
								"*diabolical screech* WHO'S NEXT?!",
								"Show me...your FLESH!",
							];
							const rand = random(0, serialKillerMessages.length - 1);
							console.log(serialKillerMessages[rand]);
							sendMessage(
								playerID,
								room,
								roomCode,
								game,
								null,
								null,
								"all",
								serialKillerMessages[rand],
								"info",
							);
							game.setSerialKillerWin(true);
							const winnerID = theNeutralUser.getPlayerID();
							const winnerName = theNeutralUser
								.getPlayer(roomCode)
								.getPlayerName();
							const winner = { winnerID, winnerName };
							game.addWinner(winner);

							if (theLawyer !== null) {
								if (
									theLawyer.getPlayer(roomCode).getRole().client ===
									theNeutralUser
								) {
									game.setLawyerWin(true);
									const winnerID = theLawyer.getPlayerID();
									const winnerName = theLawyer
										.getPlayer(roomCode)
										.getPlayerName();
									const winner = { winnerID, winnerName };
									game.addWinner(winner);
									// LAYWER ALSO WINS
								}
							}
						} else {
							game.setNeutralWin(true);
							const user = game.getAlive()[0];
							const player = user.getPlayer(roomCode);
							const winnerID = user.getPlayerID();
							const winnerName = player.getPlayerName();
							const winner = { winnerID, winnerName };
							game.addWinner(winner);
						}
					}
				} else if (aliveCount === 2) {
					let theGoodUser = null;
					let theNeutralUser = null;

					if (
						game
							.getAlive()[0]
							.getPlayer(roomCode)
							.getRole()
							.team.includes("good")
					) {
						theGoodUser = game.getAlive()[0];
					} else if (
						game
							.getAlive()[1]
							.getPlayer(roomCode)
							.getRole()
							.team.includes("good")
					) {
						theGoodUser = game.getAlive()[1];
					}
					if (
						game
							.getAlive()[0]
							.getPlayer(roomCode)
							.getRole()
							.type.includes("serial killer")
					) {
						theNeutralUser = game.getAlive()[0];
					} else if (
						game
							.getAlive()[1]
							.getPlayer(roomCode)
							.getRole()
							.type.includes("serial killer")
					) {
						theNeutralUser = game.getAlive()[1];
					}
					if (evilCount === 1 && goodCount === 1) {
						if (theGoodUser != null) {
							const theGoodRole = theGoodUser.getPlayer(roomCode).getRole();
							if (theGoodRole.type.includes("mayor") === false) {
								game.setEvilWin(true);
								for (let i = 0; i < game.getUsers().length; i++) {
									const user = game.getUsers()[i];
									const player = user.getPlayer(roomCode);
									const role = player.getRole();

									if (role.team.includes("evil")) {
										const winnerID = user.getPlayerID();
										const winnerName = player.getPlayerName();
										const winner = { winnerID, winnerName };
										game.addWinner(winner);
									}
								}
								if (theLawyer !== null) {
									if (
										theLawyer
											.getPlayer(roomCode)
											.getRole()
											.client.getPlayer(roomCode)
											.getRole()
											.team.includes("evil")
									) {
										game.setLawyerWin(true);
									}
								}
							}
						}
					} else if (evilCount === 1 && neutralCount === 1) {
						if (theLawyer !== null) {
							if (
								theLawyer
									.getPlayer(roomCode)
									.getRole()
									.client.getPlayer(roomCode)
									.getRole()
									.team.includes("evil")
							) {
								game.setLawyerWin(true);
								const winnerID = theLawyer.getPlayerID();
								const winnerName = theLawyer
									.getPlayer(roomCode)
									.getPlayerName();
								const winner = { winnerID, winnerName };
								game.addWinner(winner);
								game.setEvilWin(true);
								for (let i = 0; i < game.getUsers().length; i++) {
									const user = game.getUsers()[i];
									const player = user.getPlayer(roomCode);
									const role = player.getRole();

									if (role.team.includes("evil")) {
										const winnerID = user.getPlayerID();
										const winnerName = player.getPlayerName();
										const winner = { winnerID, winnerName };
										game.addWinner(winner);
									}
								}
							} else {
								game.setEvilWin(true);
								for (let i = 0; i < game.getUsers().length; i++) {
									const user = game.getUsers()[i];
									const player = user.getPlayer(roomCode);
									const role = player.getRole();

									if (role.team.includes("evil")) {
										const winnerID = user.getPlayerID();
										const winnerName = player.getPlayerName();
										const winner = { winnerID, winnerName };
										game.addWinner(winner);
									}
								}
							}
						} else {
							if (theSerialKiller !== null) {
								if (
									!theSerialKiller.getPlayer(roomCode).getIsKilled() &&
									!theSerialKiller.getPlayer(roomCode).getIsLynched()
								) {
									game.setDraw(true);
								} else {
									game.setEvilWin(true);
									for (let i = 0; i < game.getUsers().length; i++) {
										const user = game.getUsers()[i];
										const player = user.getPlayer(roomCode);
										const role = player.getRole();

										if (role.team.includes("evil")) {
											const winnerID = user.getPlayerID();
											const winnerName = player.getPlayerName();
											const winner = { winnerID, winnerName };
											game.addWinner(winner);
										}
									}
								}
							} else {
								game.setEvilWin(true);
								for (let i = 0; i < game.getUsers().length; i++) {
									const user = game.getUsers()[i];
									const player = user.getPlayer(roomCode);
									const role = player.getRole();

									if (role.team.includes("evil")) {
										const winnerID = user.getPlayerID();
										const winnerName = player.getPlayerName();
										const winner = { winnerID, winnerName };
										game.addWinner(winner);
									}
								}
							}
						}
					} else if (neutralCount === 1 && goodCount === 1) {
						if (theGoodUser != null && theNeutralUser != null) {
							const theGoodRole = theGoodUser.getPlayer(roomCode).getRole();
							if (theGoodRole.type.includes("mayor") === false) {
								const serialKillerMessages = [
									"DIE, DIE, DIE!",
									"*diabolical screech* WHO'S NEXT?!",
									"Show me...your FLESH!",
								];
								const rand = random(0, serialKillerMessages.length - 1);
								console.log(serialKillerMessages[rand]);
								sendMessage(
									playerID,
									room,
									roomCode,
									game,
									null,
									null,
									"all",
									serialKillerMessages[rand],
									"info",
								);
								game.setSerialKillerWin(true);
								const winnerID = theNeutralUser.getPlayerID();
								const winnerName = theNeutralUser
									.getPlayer(roomCode)
									.getPlayerName();
								const winner = { winnerID, winnerName };
								game.addWinner(winner);
							}
						} else if (theNeutralUser == null) {
							game.setDraw(true);
						}
					} else if (neutralCount === 2) {
						if (theNeutralUser != null) {
							const serialKillerMessages = [
								"DIE, DIE, DIE!",
								"*diabolical screech* WHO'S NEXT?!",
								"Show me...your FLESH!",
							];
							const rand = random(0, serialKillerMessages.length - 1);
							console.log(serialKillerMessages[rand]);
							sendMessage(
								playerID,
								room,
								roomCode,
								game,
								null,
								null,
								"all",
								serialKillerMessages[rand],
								"info",
							);
							game.setSerialKillerWin(true);
							const winnerID = theNeutralUser.getPlayerID();
							const winnerName = theNeutralUser
								.getPlayer(roomCode)
								.getPlayerName();
							const winner = { winnerID, winnerName };
							game.addWinner(winner);

							if (theLawyer !== null) {
								if (
									theLawyer
										.getPlayer(roomCode)
										.getRole()
										.client.getPlayer(roomCode)
										.getRole()
										.type.includes("serial killer")
								) {
									game.setLawyerWin(true);
									const winnerID = theLawyer.getPlayerID();
									const winnerName = theLawyer
										.getPlayer(roomCode)
										.getPlayerName();
									const winner = { winnerID, winnerName };
									game.addWinner(winner);
								}
							}
						} else if (theNeutralUser == null) {
							game.setDraw(true);
						}
					}
				} else if (
					goodCount >= 0 &&
					goodCount < evilCount &&
					(neutralCount === 0 || neutralCount === 1) &&
					evilCount > 0
				) {
					// EVIL TEAM WINS
					if (neutralCount === 0) {
						game.setEvilWin(true);
						for (let i = 0; i < game.getUsers().length; i++) {
							const user = game.getUsers()[i];
							const player = user.getPlayer(roomCode);
							const role = player.getRole();

							if (role.team.includes("evil")) {
								const winnerID = user.getPlayerID();
								const winnerName = player.getPlayerName();
								const winner = { winnerID, winnerName };
								game.addWinner(winner);
							}
							if (theLawyer !== null) {
								if (
									theLawyer
										.getPlayer(roomCode)
										.getRole()
										.client.getPlayer(roomCode)
										.getRole()
										.team.includes("evil")
								) {
									game.setLawyerWin(true);
								}
							}
						}
					} else if (neutralCount === 1) {
						if (theLawyer !== null) {
							if (
								theLawyer
									.getPlayer(roomCode)
									.getRole()
									.client.getPlayer(roomCode)
									.getRole()
									.team.includes("evil")
							) {
								game.setEvilWin(true);
								game.setLawyerWin(true);
								const winnerID = theLawyer.getPlayerID();
								const winnerName = theLawyer
									.getPlayer(roomCode)
									.getPlayerName();
								const winner = { winnerID, winnerName };
								game.addWinner(winner);
							} else {
								game.setEvilWin(true);
							}
						} else {
							if (theSerialKiller !== null) {
								if (
									!theSerialKiller.getPlayer(roomCode).getIsKilled() &&
									!theSerialKiller.getPlayer(roomCode).getIsLynched()
								) {
									game.setDraw(true);
								} else {
									game.setEvilWin(true);
								}
							} else {
								game.setEvilWin(true);
							}
						}
						if (game.getEvilWin()) {
							for (let i = 0; i < game.getUsers().length; i++) {
								const user = game.getUsers()[i];
								const player = user.getPlayer(roomCode);
								const role = player.getRole();

								if (role.team.includes("evil")) {
									const winnerID = user.getPlayerID();
									const winnerName = player.getPlayerName();
									const winner = { winnerID, winnerName };
									game.addWinner(winner);
								}
							}
						}
					}
				} else if (
					evilCount === 0 &&
					goodCount === 0 &&
					(neutralCount === 1 || neutralCount === 2)
				) {
					// SERIAL KILLER WINS
					if (neutralCount === 1) {
						if (
							!theSerialKiller?.getPlayer(roomCode).getIsKilled() &&
							!theSerialKiller?.getPlayer(roomCode).getIsLynched()
						) {
							if (theSerialKiller !== null) {
								const serialKillerMessages = [
									"DIE, DIE, DIE!",
									"*diabolical screech* WHO'S NEXT?!",
									"Show me...your FLESH!",
								];
								const rand = random(0, serialKillerMessages.length - 1);
								console.log(serialKillerMessages[rand]);
								sendMessage(
									playerID,
									room,
									roomCode,
									game,
									null,
									null,
									"all",
									serialKillerMessages[rand],
									"info",
								);
								game.setSerialKillerWin(true);
								const winnerID = theSerialKiller.getPlayerID();
								const winnerName = theSerialKiller
									.getPlayer(roomCode)
									.getPlayerName();
								const winner = { winnerID, winnerName };
								game.addWinner(winner);

								if (theLawyer !== null) {
									if (
										theLawyer.getPlayer(roomCode).getRole().client ===
										theSerialKiller
									) {
										game.setLawyerWin(true);
										const winnerID = theLawyer.getPlayerID();
										const winnerName = theLawyer
											.getPlayer(roomCode)
											.getPlayerName();
										const winner = { winnerID, winnerName };
										game.addWinner(winner);
										// LAYWER ALSO WINS
									}
								}
							}
						} else if (
							!theLawyer?.getPlayer(roomCode).getIsKilled() &&
							!theLawyer?.getPlayer(roomCode).getIsLynched()
						) {
							if (theLawyer !== null) {
								// Lawyer does not win, since their target is dead, so just a neutral win.
								game.setNeutralWin(true);
								const winnerID = theLawyer.getPlayerID();
								const winnerName = theLawyer
									.getPlayer(roomCode)
									.getPlayerName();
								const winner = { winnerID, winnerName };
								game.addWinner(winner);
							}
						} else if (
							!theExecutioner?.getPlayer(roomCode).getIsKilled() &&
							!theExecutioner?.getPlayer(roomCode).getIsLynched()
						) {
							if (theExecutioner !== null) {
								game.setNeutralWin(true);
								const winnerID = theExecutioner.getPlayerID();
								const winnerName = theExecutioner
									.getPlayer(roomCode)
									.getPlayerName();
								const winner = { winnerID, winnerName };
								game.addWinner(winner);

								if (theLawyer !== null) {
									if (
										theLawyer.getPlayer(roomCode).getRole().client ===
										theExecutioner
									) {
										game.setLawyerWin(true);
										const winnerID = theLawyer.getPlayerID();
										const winnerName = theLawyer
											.getPlayer(roomCode)
											.getPlayerName();
										const winner = { winnerID, winnerName };
										game.addWinner(winner);
										// LAYWER ALSO WINS
									}
								}
							}
						} else if (
							(!theJester?.getPlayer(roomCode).getIsKilled() &&
								!theJester?.getPlayer(roomCode).getIsLynched()) ||
							(!secondJester?.getPlayer(roomCode).getIsKilled() &&
								!secondJester?.getPlayer(roomCode).getIsLynched())
						) {
							if (theJester !== null || secondJester !== null) {
								game.setNeutralWin(true);

								if (theJester !== null && secondJester == null) {
									const winnerID = theJester.getPlayerID();
									const winnerName = theJester
										.getPlayer(roomCode)
										.getPlayerName();
									const winner = { winnerID, winnerName };
									game.addWinner(winner);
									if (theLawyer !== null) {
										if (
											theLawyer.getPlayer(roomCode).getRole().client ===
											theJester
										) {
											game.setLawyerWin(true);
											const winnerID = theLawyer.getPlayerID();
											const winnerName = theLawyer
												.getPlayer(roomCode)
												.getPlayerName();
											const winner = { winnerID, winnerName };
											game.addWinner(winner);
											// LAYWER ALSO WINS
										}
									}
								} else if (theJester == null && secondJester !== null) {
									const winnerID = secondJester.getPlayerID();
									const winnerName = secondJester
										.getPlayer(roomCode)
										.getPlayerName();
									const winner = { winnerID, winnerName };
									game.addWinner(winner);
									if (theLawyer !== null) {
										if (
											theLawyer.getPlayer(roomCode).getRole().client ===
											secondJester
										) {
											game.setLawyerWin(true);
											const winnerID = theLawyer.getPlayerID();
											const winnerName = theLawyer
												.getPlayer(roomCode)
												.getPlayerName();
											const winner = { winnerID, winnerName };
											game.addWinner(winner);
											// LAYWER ALSO WINS
										}
									}
								}
							}
						}
					} else if (neutralCount === 2) {
						if (
							!theSerialKiller?.getPlayer(roomCode).getIsKilled() &&
							!theSerialKiller?.getPlayer(roomCode).getIsLynched()
						) {
							if (theSerialKiller !== null) {
								if (theLawyer !== null) {
									if (
										theLawyer.getPlayer(roomCode).getRole().client ===
										theSerialKiller
									) {
										game.setLawyerWin(true);
										game.setSerialKillerWin(true);
										const serialKillerMessages = [
											"DIE, DIE, DIE!",
											"*diabolical screech* WHO'S NEXT?!",
											"Show me...your FLESH!",
										];
										const rand = random(0, serialKillerMessages.length - 1);
										sendMessage(
											playerID,
											room,
											roomCode,
											game,
											null,
											null,
											"all",
											serialKillerMessages[rand],
											"info",
										);
										let winnerID = theSerialKiller.getPlayerID();
										let winnerName = theSerialKiller
											.getPlayer(roomCode)
											.getPlayerName();
										let winner = { winnerID, winnerName };
										game.addWinner(winner);
										winnerID = theLawyer.getPlayerID();
										winnerName = theLawyer.getPlayer(roomCode).getPlayerName();
										winner = { winnerID, winnerName };
										game.addWinner(winner);
										// LAYWER ALSO WINS
									}
								}
							}
						} else if (
							!theExecutioner?.getPlayer(roomCode).getIsKilled() &&
							!theExecutioner?.getPlayer(roomCode).getIsLynched()
						) {
							if (theExecutioner !== null) {
								if (theLawyer !== null) {
									if (
										theLawyer.getPlayer(roomCode).getRole().client ===
										theExecutioner
									) {
										game.setLawyerWin(true);
										game.setNeutralWin(true);
										let winnerID = theExecutioner.getPlayerID();
										let winnerName = theExecutioner
											.getPlayer(roomCode)
											.getPlayerName();
										let winner = { winnerID, winnerName };
										game.addWinner(winner);
										winnerID = theLawyer.getPlayerID();
										winnerName = theLawyer.getPlayer(roomCode).getPlayerName();
										winner = { winnerID, winnerName };
										game.addWinner(winner);
										// LAYWER ALSO WINS
									}
								}
							}
						} else if (
							(!theJester?.getPlayer(roomCode).getIsKilled() &&
								!theJester?.getPlayer(roomCode).getIsLynched()) ||
							(!secondJester?.getPlayer(roomCode).getIsKilled() &&
								!secondJester?.getPlayer(roomCode).getIsLynched())
						) {
							if (theJester !== null && secondJester == null) {
								if (theLawyer !== null) {
									if (theJester !== null && secondJester == null) {
										if (
											theLawyer.getPlayer(roomCode).getRole().client ===
											theJester
										) {
											game.setLawyerWin(true);
											game.setNeutralWin(true);
											let winnerID = theJester.getPlayerID();
											let winnerName = theJester
												.getPlayer(roomCode)
												.getPlayerName();
											let winner = { winnerID, winnerName };
											game.addWinner(winner);
											winnerID = theLawyer.getPlayerID();
											winnerName = theLawyer
												.getPlayer(roomCode)
												.getPlayerName();
											winner = { winnerID, winnerName };
											game.addWinner(winner);
											// LAYWER ALSO WINS
										}
									} else if (theJester == null && secondJester !== null) {
										if (
											theLawyer.getPlayer(roomCode).getRole().client ===
											secondJester
										) {
											game.setLawyerWin(true);
											game.setNeutralWin(true);
											let winnerID = secondJester.getPlayerID();
											let winnerName = secondJester
												.getPlayer(roomCode)
												.getPlayerName();
											let winner = { winnerID, winnerName };
											game.addWinner(winner);
											winnerID = theLawyer.getPlayerID();
											winnerName = theLawyer
												.getPlayer(roomCode)
												.getPlayerName();
											winner = { winnerID, winnerName };
											game.addWinner(winner);
											// LAYWER ALSO WINS
										}
									}
								}
							}
						}
					}
				}
			} else if (game.getJesterWin() && !game.getExecutionerWin()) {
				const jesterMessages = [
					"*maniacal laughter* YOU FOOLS!",
					"HAhAHA! Who's the fool NOW?!",
					"the joke's on YOU! ;)",
				];
				const rand = random(0, jesterMessages.length - 1);
				console.log(jesterMessages[rand]);
				sendMessage(
					playerID,
					room,
					roomCode,
					game,
					null,
					null,
					"all",
					jesterMessages[rand],
					"info",
				);
			} else if (!game.getJesterWin() && game.getExecutionerWin()) {
				const executionerMessages = [
					"Just doing what has to been done...",
					"The blood they spill is no comparison to the deeds they have done...",
					"*wipes hands* Tango down!",
				];
				const rand = random(0, executionerMessages.length - 1);
				console.log(executionerMessages[rand]);
				sendMessage(
					playerID,
					room,
					roomCode,
					game,
					null,
					null,
					"all",
					executionerMessages[rand],
					"info",
				);
			}
		}

		const winState = Object.values(checkWinState(game, roomCode));

		if (winState[0] === true)
			setTimeout(
				endGame,
				7500,
				game,
				roomCode,
				winState[0],
				winState[1],
				winState[2],
				winState[3],
			);
	}

	function checkWinState(game, roomCode) {
		let win = false;
		let winType = "";
		let lawyerWin = false;
		// Which message to show
		if (game.getGoodWin()) {
			winType = "good";
			win = true;
			lawyerWin = false;
		} else if (game.getEvilWin()) {
			winType = "evil";
			win = true;
			if (game.getLawyerWin()) {
				lawyerWin = true;
			}
		} else if (game.getNeutralWin()) {
			winType = "neutral";
			win = true;
			if (game.getLawyerWin()) {
				lawyerWin = true;
			}
		} else if (game.getJesterWin()) {
			winType = "jester";
			win = true;
			if (game.getLawyerWin()) {
				lawyerWin = true;
			}
		} else if (game.getExecutionerWin()) {
			winType = "executioner";
			win = true;
			if (game.getLawyerWin()) {
				lawyerWin = true;
			}
		} else if (game.getSerialKillerWin()) {
			winType = "serial killer";
			win = true;
			if (game.getLawyerWin()) {
				lawyerWin = true;
			}
		} else if (game.getDraw()) {
			winType = "draw";
			win = true;
			lawyerWin = false;
		} else if (game.getNoDeaths() >= maxNoDeaths) {
			winType = "timeout";
			win = true;
			lawyerWin = false;
		} else {
			winType = "";
			win = false;
			lawyerWin = false;
		}

		console.log("good", game.getGoodWin());
		console.log("evil", game.getEvilWin());
		console.log("neutral", game.getNeutralWin());
		console.log("jester", game.getJesterWin());
		console.log("executioner", game.getExecutionerWin());
		console.log("serial killer", game.getSerialKillerWin());
		console.log("lawyer", game.getLawyerWin());
		console.log("draw", game.getDraw());
		console.log("winners", game.getWinners());
		console.log(`WIN ${win}`);
		console.log("winType", winType);

		// IMPORTANT TO JUST SEND WIN TO JUST THAT USER, SINCE THERE CAN BE 2 JESTERS
		// ALSO HANDLE CHECK PREVIOUS

		const toSend = [];
		if (win) {
			for (let i = 0; i < game.getWinners().length; i++) {
				const theID = proxyIdenfication.get(game.getWinners()[i].winnerID);
				const theName = game.getWinners()[i].winnerName;
				const winner = { theID, theName };
				toSend.push(winner);
			}
		}

		const winState = { win, winType, lawyerWin, toSend };
		return winState;
	}

	socket.on("leaveGame", (playerID) => {
		if (checkUserExist(playerID)) {
			if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
				const roomCode = connectedUsers.get(playerID).getCurrentRoom();
				const room = rooms.get(roomCode);
				const game = room.getGame();
				const user = connectedUsers.get(playerID);
				if (game.getProgress()) {
					if (game.getUsers().includes(connectedUsers.get(playerID))) {
						if (room.getHost() === playerID) {
							// game.setDone(true);
							endGameClear(game, roomCode);
						} else {
							forceKill(playerID, roomCode, game);
							// reset messages, readyGame, readyLobby, and inGame;
							user.reset();
							if (user.getPrevious().includes(room)) {
								user.removePrevious(room);
							}
							io.to(playerID).emit("beginClearEvilRoom", game.getEvilRoom());
							io.to(playerID).emit(
								"beginClearCemeteryRoom",
								game.getCemeteryRoom(),
							);
							io.to(roomCode).emit("updateSetPlayers");
							io.to(playerID).emit("returnToLobby");
						}
					}
				}
			}
		}
	});

	socket.on("endGameRefresh", (playerID) => {
		if (checkUserExist(playerID)) {
			if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
				const roomCode = connectedUsers.get(playerID).getCurrentRoom();
				const room = rooms.get(roomCode);
				const game = room.getGame();
				if (game.getProgress()) {
					if (game.getUsers().includes(connectedUsers.get(playerID))) {
						const winState = Object.values(checkWinState(game, roomCode));

						if (winState[0] === true) {
							socket.emit(
								"endGameRefreshed",
								winState[0],
								winState[1],
								winState[2],
								winState[3],
							);
						}
					}
				}
			}
		}
	});

	function endGame(game, roomCode, win, winType, lawyerWin, toSend) {
		io.to(roomCode).emit("endGame", win, winType, lawyerWin, toSend);
		// CLEAR INTERVAL (game.setDone(true))
		game.setDone(true);
		console.log("game is done:", game.getDone());
		// Send players back to lobby after 10 seconds
		setTimeout(endGameClear, 10000, game, roomCode);
	}

	function endGameClear(game, roomCode) {
		console.log("Clearing game for", roomCode);
		// Reset players, reset game
		for (let i = 0; i < game.getUsers().length; i++) {
			const user = game.getUsers()[i];
			if (user.getInGame()) {
				if (user.getCurrentRoom() === roomCode) {
					user.reset();
					user.getPlayer(roomCode).setReadyGame(false);
					user.getPlayer(roomCode).setDisconnected(true);
				}
				if (user.getPrevious().includes(roomCode)) {
					user.removePrevious(roomCode);
				}
			}
		}
		io.to(roomCode).emit("returnToLobby");
		game.reset();
		game.setDone(true);
		clearClock(game);
	}

	socket.on("requestProxy", (playerID, state) => {
		if (checkUserExist(playerID)) {
			if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
				const roomCode = connectedUsers.get(playerID).getCurrentRoom();
				const room = rooms.get(roomCode);
				const game = room.getGame();

				if (state.includes("app")) {
					if (game.getProgress()) {
						if (game.getUsers().includes(connectedUsers.get(playerID))) {
							socket.emit("fetchedProxyApp", proxyIdenfication.get(playerID));
						}
					}
				} else if (state.includes("lobby")) {
					socket.emit("fetchedProxyLobby", proxyIdenfication.get(playerID));
				}
			}
		}
	});

	function getKeyFromValue(map, searchValue) {
		for (const [key, value] of map.entries()) {
			if (value === searchValue) {
				return key;
			}
		}
	}

	function evilVote(playerID, room, roomCode, game, target) {
		const targetPlayer = connectedUsers.get(target).getPlayer(roomCode);
		if (!targetPlayer.isProtected) {
			targetPlayer.setIsKilled(true);
			targetPlayer.addKiller("Evil");
			// send message to evil people that it worked
			sendMessage(
				playerID,
				room,
				roomCode,
				game,
				null,
				null,
				"evil",
				`You have decided to murder ${targetPlayer.getPlayerName()} (${
					targetPlayer.nightVotes
				})`,
				"confirm",
			);
			sendMessage(
				playerID,
				room,
				roomCode,
				game,
				null,
				null,
				"evil",
				`${targetPlayer.getPlayerName()} has been murdered - excellent >:)`,
				"confirm",
			);
			sendMessage(
				target,
				room,
				roomCode,
				game,
				null,
				null,
				"target",
				"You died! You were killed by members of the Evil team",
				"alert",
			);
		} else {
			sendMessage(
				playerID,
				room,
				roomCode,
				game,
				null,
				null,
				"evil",
				`No one was killed tonight, someone protected ${targetPlayer.getPlayerName()}`,
				"info",
			);
			sendMessage(
				target,
				room,
				roomCode,
				game,
				null,
				null,
				"target",
				"Someone tried to kill you, but you slipped away!",
				"info",
			);
			// send message to evil people that it  DID not work
		}
	}

	function voteHandlerEvil(playerID, room, roomCode, game) {
		if (game.getCycle() === "Night") {
			const evilUsers = game.getEvil();

			const targets = new Map();
			for (let i = 0; i < evilUsers.length; i++) {
				if (game.getAlive().includes(evilUsers[i])) {
					if (evilUsers[i].getPlayer(roomCode).voteTarget !== null) {
						const theVoteTarget = getKeyFromValue(
							proxyIdenfication,
							evilUsers[i].getPlayer(roomCode).voteTarget,
						);
						const voteTargetPlayer = connectedUsers
							.get(theVoteTarget)
							.getPlayer(roomCode);
						if (
							!game.getCemetery().includes(connectedUsers.get(theVoteTarget))
						) {
							if (targets.has(theVoteTarget)) {
								targets.set(
									theVoteTarget,
									targets.get(theVoteTarget) +
										evilUsers[i].getPlayer(roomCode).getRole().killVoteCount,
								);
							} else if (!targets.has(theVoteTarget)) {
								targets.set(
									theVoteTarget,
									evilUsers[i].getPlayer(roomCode).getRole().killVoteCount,
								);
							}
						}
					}
				}
			}
			const targetCount = Array.from(targets.values());

			let highestVoteCount = 0;
			let theHighestVote = undefined;
			const seenHighVote = [];

			for (let i = 0; i < targetCount.length; i++) {
				if (targetCount[i] > highestVoteCount) {
					if (!seenHighVote.includes(targetCount[i])) {
						highestVoteCount = targetCount[i];
						theHighestVote = i;
						seenHighVote.push(targetCount[i]);
					}
				} else if (targetCount[i] === highestVoteCount) {
					highestVoteCount = 0;
					theHighestVote = undefined;
				}
			}

			if (Math.max(...targetCount) > 0) {
				if (highestVoteCount !== 0 && theHighestVote !== undefined) {
					const mostVoted = Array.from(targets.keys())[theHighestVote];
					evilVote(playerID, room, roomCode, game, mostVoted);
				} else {
					sendMessage(
						playerID,
						room,
						roomCode,
						game,
						null,
						null,
						"evil",
						"The vote was tied, no blood gets spilled tonight",
						"info",
					);
				}
			} else {
				sendMessage(
					playerID,
					room,
					roomCode,
					game,
					null,
					null,
					"evil",
					"No one was voted to get killed",
					"info",
				);
			}
		}
	}

	function checkIfExecutionerAlive(playerID, room, roomCode, game) {
		for (let i = 0; i < game.getAlive().length; i++) {
			if (
				game
					.getAlive()
					[i].getPlayer(roomCode)
					.getRole()
					.type.includes("executioner")
			) {
				if (
					game.getAlive()[i].getPlayer(roomCode).getIsKilled() === false &&
					game.getAlive()[i].getPlayer(roomCode).getIsLynched() === false
				) {
					const executioner = game.getAlive()[i];
					const isTrue = true;
					return { isTrue, executioner };
				}
			}
		}
		const executioner = null;
		const isTrue = false;
		return { isTrue, executioner };
	}

	function checkIfLawyerAlive(playerID, room, roomCode, game) {
		for (let i = 0; i < game.getAlive().length; i++) {
			const player = game.getAlive()[i].getPlayer(roomCode);
			if (player.getRole().type.includes("lawyer")) {
				if (player.getIsKilled() === false && player.getIsLynched() === false) {
					const lawyer = game.getAlive()[i];
					const isTrue = true;
					return { isTrue, lawyer };
				}
			}
		}
		const lawyer = null;
		const isTrue = false;
		return { isTrue, lawyer };
	}

	function globalVote(playerID, room, roomCode, game, target) {
		const targetUser = connectedUsers.get(target);
		const targetPlayer = targetUser.getPlayer(roomCode);
		targetPlayer.setIsLynched(true);

		// SEND LYNCHED MESSAGE
		sendMessage(
			playerID,
			room,
			roomCode,
			game,
			null,
			null,
			"all",
			`The town has voted to lynch ${targetPlayer.getPlayerName()}`,
			"info",
		);
		sendMessage(
			target,
			room,
			roomCode,
			game,
			null,
			null,
			"target",
			"You died! You were lynched by members of the town",
			"alert",
		);
		sendMessage(
			playerID,
			room,
			roomCode,
			game,
			null,
			null,
			"all",
			`${targetPlayer.getPlayerName()} has been lynched. Justice!`,
			"info",
		);

		const executionerObject = Object.values(
			checkIfExecutionerAlive(playerID, room, roomCode, game),
		);
		const lawyerObject = Object.values(
			checkIfLawyerAlive(playerID, room, roomCode, game),
		);
		if (targetPlayer.getRole().type.includes("jester")) {
			console.log("JESTER LYNCHED");

			// JESTER WINS
			game.setJesterWin(true);
			const winnerID = targetUser.getPlayerID();
			const winnerName = targetPlayer.getPlayerName();
			const winner = { winnerID, winnerName };
			game.addWinner(winner);
			if (lawyerObject[0] === true) {
				const lawyer = lawyerObject[1];

				// if the target (jester) gets lynched
				// if the lawyer's client is the jester
				if (lawyer.getPlayer(roomCode).getRole().client === targetUser) {
					// LAYWER WINS ALSO
					game.setLawyerWin(true);
					const winnerID = lawyer.getPlayerID();
					const winnerName = lawyer.getPlayer(roomCode).getPlayerName();
					const winner = { winnerID, winnerName };
					game.addWinner(winner);
				}
			}
		} else if (executionerObject[0] === true) {
			const executioner = executionerObject[1];
			console.log("EXECUTIONER EXISTS IN GAME");

			// if the executioner's target is lynched
			if (executioner.getPlayer(roomCode).getRole().target === targetUser) {
				console.log("EXECUTIONER TARGET LYNCHED");
				// executioner COMPLETES MISSION
				// EXECUTIONER WINS
				game.setExecutionerWin(true);
				const winnerID = executioner.getPlayerID();
				const winnerName = executioner.getPlayer(roomCode).getPlayerName();
				const winner = { winnerID, winnerName };
				game.addWinner(winner);
				if (lawyerObject[0] === true) {
					const lawyer = lawyerObject[1];

					// if the lawyer's client is the excecutioner
					if (lawyer.getPlayer(roomCode).getRole().client === executioner) {
						// LAYWER WINS ALSO
						game.setLawyerWin(true);
						const winnerID = lawyer.getPlayerID();
						const winnerName = lawyer.getPlayer(roomCode).getPlayerName();
						const winner = { winnerID, winnerName };
						game.addWinner(winner);
					}
				}
			}
		}
	}

	function checkAllHaveVoted(playerID, room, roomCode, game) {
		if (game.getCycle() === "Day") {
			if (game.getPhase() === "voting") {
				let hasVoted = 0;
				const users = game.getAlive();
				for (let i = 0; i < users.length; i++) {
					if (users[i].getPlayer(roomCode).voteTarget !== null) {
						if (users[i].getPlayer(roomCode).voteTarget !== "skip") {
							const theVoteTarget = getKeyFromValue(
								proxyIdenfication,
								users[i].getPlayer(roomCode).voteTarget,
							);
							const voteTargetPlayer = connectedUsers
								.get(theVoteTarget)
								.getPlayer(roomCode);
						}
						if (
							(voteTargetPlayer?.getIsKilled() === false &&
								voteTargetPlayer?.getIsLynched() === false) ||
							users[i].getPlayer(roomCode).voteTarget === "skip"
						) {
							hasVoted++;
						}
					}
				}

				if (hasVoted === users.length) {
					concludeVote(playerID, room, roomCode, game);
				}
			}
		}
	}

	function concludeVote(playerID, room, roomCode, game) {
		if (game.getCycle() === "Day") {
			if (game.getPhase() === "voting") {
				game.getTimer().setCounter(0);
			}
		}
	}

	function voteHandlerGlobal(playerID, room, roomCode, game) {
		if (game.getCycle() === "Day") {
			const users = game.getAlive();
			console.log("COUNTING VOTES GLOBAL");

			const targets = new Map();
			for (let i = 0; i < users.length; i++) {
				if (users[i].getPlayer(roomCode).voteTarget !== null) {
					if (users[i].getPlayer(roomCode).voteTarget !== "skip") {
						const theVoteTarget = getKeyFromValue(
							proxyIdenfication,
							users[i].getPlayer(roomCode).voteTarget,
						);
						const voteTargetPlayer = connectedUsers
							.get(theVoteTarget)
							.getPlayer(roomCode);
					}
					if (
						(voteTargetPlayer?.getIsKilled() === false &&
							voteTargetPlayer?.getIsLynched() === false) ||
						users[i].getPlayer(roomCode).voteTarget === "skip"
					) {
						// console.log(users[i].getPlayer(roomCode).voteTarget);
						if (users[i].getPlayer(roomCode).voteTarget === "skip") {
							if (targets.has("skip")) {
								targets.set(
									"skip",
									targets.get("skip") +
										users[i].getPlayer(roomCode).getRole().voteCount,
								);
							} else if (!targets.has("skip")) {
								targets.set(
									"skip",
									users[i].getPlayer(roomCode).getRole().voteCount,
								);
							}
						} else {
							if (targets.has(theVoteTarget)) {
								targets.set(
									theVoteTarget,
									targets.get(theVoteTarget) +
										users[i].getPlayer(roomCode).getRole().voteCount,
								);
							} else if (!targets.has(theVoteTarget)) {
								targets.set(
									theVoteTarget,
									users[i].getPlayer(roomCode).getRole().voteCount,
								);
							}
						}
					}
				}
			}

			const aliveUsersCount = game.getAlive().length;
			const targetCount = Array.from(targets.values());
			const topVotes = [];
			let gotLynched = false;
			let voteTie = false;
			let voteSkipped = false;
			for (let i = 0; i < targetCount.length; i++) {
				const majority = aliveUsersCount / 2;

				if (targetCount[i] > majority) {
					const voteValue = targetCount[i];
					const mostVotedIndex = targetCount.indexOf(targetCount[i]);
					const mostVoted = Array.from(targets.keys())[mostVotedIndex];
					const majorityVote = { mostVoted, mostVotedIndex, voteValue };
					topVotes.push(majorityVote);
				}
			}

			if (topVotes.length === 1) {
				// NOT A TIE
				const voteOne = topVotes[0];
				console.log(`majority: ${voteOne.voteValue}`);
				gotLynched = true;
				voteTie = false;
				if (voteOne.mostVoted === "skip") {
					voteSkipped = true;
				} else {
					globalVote(playerID, room, roomCode, game, voteOne.mostVoted);
				}
			} else if (topVotes.length > 1) {
				// Handle if votes are ABOVE majority but SAME VALUE --> tie
				// Handle if votes are ABOVE majority but one has HIGHER value --> vote
				let highestVoteCount = 0;
				let theHighestVote = undefined;
				const seenHighVote = [];

				for (let i = 0; i < topVotes.length; i++) {
					if (topVotes[i].voteValue > highestVoteCount) {
						if (!seenHighVote.includes(topVotes[i].voteValue)) {
							highestVoteCount = topVotes[i].voteValue;
							theHighestVote = topVotes[i];
							seenHighVote.push(topVotes[i].voteValue);
						}
					} else if (topVotes[i].voteValue === highestVoteCount) {
						highestVoteCount = 0;
						theHighestVote = undefined;
					}
				}

				if (highestVoteCount === 0 && theHighestVote === undefined) {
					gotLynched = false;
					voteTie = true;
					// TIE
					console.log("TIE between", topVotes);
				} else if (highestVoteCount !== 0 && theHighestVote !== undefined) {
					gotLynched = true;
					voteTie = false;
					// VOTE
					if (theHighestVote.mostVoted === "skip") {
						voteSkipped = true;
					} else {
						console.log("VOTE between majority votes", topVotes);
						globalVote(
							playerID,
							room,
							roomCode,
							game,
							theHighestVote.mostVoted,
						);
					}
				}
			}
			if (voteSkipped) {
				sendMessage(
					playerID,
					room,
					roomCode,
					game,
					null,
					null,
					"all",
					"The vote has been skipped",
					"info",
				);
				sendMessage(
					playerID,
					room,
					roomCode,
					game,
					null,
					null,
					"all",
					"No one was lynched - hope it was the right decision",
					"info",
				);
			}
			if (!gotLynched && !voteTie) {
				sendMessage(
					playerID,
					room,
					roomCode,
					game,
					null,
					null,
					"all",
					"There was no majority to lynch anyone",
					"info",
				);
				sendMessage(
					playerID,
					room,
					roomCode,
					game,
					null,
					null,
					"all",
					"No one was lynched - hope it was the right decision",
					"info",
				);
			} else if (!gotLynched && voteTie) {
				sendMessage(
					playerID,
					room,
					roomCode,
					game,
					null,
					null,
					"all",
					"The votes have been tied!",
					"info",
				);
				sendMessage(
					playerID,
					room,
					roomCode,
					game,
					null,
					null,
					"all",
					"No one was lynched - hope it was the right decision",
					"info",
				);
			}
		}
	}

	function mayorReveal(playerID, room, roomCode, game) {
		if (checkUserExist(playerID)) {
			if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
				const roomCode = connectedUsers.get(playerID).getCurrentRoom();
				const room = rooms.get(roomCode);
				const game = room.getGame();
				const user = connectedUsers.get(playerID);
				const player = user.getPlayer(roomCode);
				const role = player.getRole();
				if (game.getProgress()) {
					if (game.getUsers().includes(user)) {
						if (role.type.includes("mayor")) {
							if (player.voteTarget !== null) {
								if (player.voteTarget === "skip") {
									game.setSkipVotes(game.getSkipVotes() - role.voteCount);
									if (game.settings.voteMessages.value === "anonymous") {
										sendMessage(
											playerID,
											room,
											roomCode,
											game,
											null,
											null,
											"all",
											`${player.getPlayerName()} removed their vote`,
											"Day",
										);
									} else if (game.settings.voteMessages.value === "visible") {
										sendMessage(
											playerID,
											room,
											roomCode,
											game,
											null,
											null,
											"all",
											`${player.getPlayerName()} removed their vote to SKIP (${game.getSkipVotes()})`,
											"Day",
										);
									}
									player.voteTarget = null;
									sendMessage(
										playerID,
										room,
										roomCode,
										game,
										null,
										null,
										"socket",
										"Your vote has been reset, because of your new found voting rights",
										"info",
									);
								} else {
									const theVoteTargetPlayer = connectedUsers
										.get(getKeyFromValue(proxyIdenfication, player.voteTarget))
										.getPlayer(roomCode);
									theVoteTargetPlayer.dayVotes -= role.voteCount;

									if (game.settings.voteMessages.value === "anonymous") {
										sendMessage(
											playerID,
											room,
											roomCode,
											game,
											null,
											null,
											"all",
											`${player.getPlayerName()} removed their vote`,
											"Day",
										);
									} else if (game.settings.voteMessages.value === "visible") {
										sendMessage(
											playerID,
											room,
											roomCode,
											game,
											null,
											null,
											"all",
											`${player.getPlayerName()} removed their vote from ${theVoteTargetPlayer.getPlayerName()} (${
												theVoteTargetPlayer.dayVotes
											})`,
											"Day",
										);
									}
									player.voteTarget = null;
									sendMessage(
										playerID,
										room,
										roomCode,
										game,
										null,
										null,
										"socket",
										"Your vote has been reset, because of your new found voting rights",
										"info",
									);
								}
							}
							role.voteCount = 3;
							role.revealed = true;
							sendMessage(
								playerID,
								room,
								roomCode,
								game,
								null,
								null,
								"all",
								`${player.getPlayerName()} has revealed themselves as the Mayor. Their vote now counts as 3`,
								"bold",
							);
							io.to(roomCode).emit("updateSetPlayers");
						}
					}
				}
			}
		}
	}

	socket.on("fetchCurrentPlayerTargets", (playerID) => {
		if (checkUserExist(playerID)) {
			if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
				const roomCode = connectedUsers.get(playerID).getCurrentRoom();
				const room = rooms.get(roomCode);
				const game = room.getGame();
				if (game.getProgress()) {
					if (game.getUsers().includes(connectedUsers.get(playerID))) {
						const user = connectedUsers.get(playerID);
						const player = user.getPlayer(roomCode);
						console.log("current player targets");
						socket.emit(
							"fetchedCurrentPlayerTargets",
							player.abilityTarget,
							player.voteTarget,
							player,
						);
					}
				}
			}
		}
	});

	function executeNightActions(playerID, room, roomCode, game) {
		// Ability order:
		// Blocks
		// Disguising
		// Framing
		// Investigation
		// Protection
		// Killing (SK)

		const abilityOrder = [
			"trapper",
			"witch",
			"surgeon",
			"framer",
			"investigator",
			"doctor",
			"serial killer",
		];
		for (let i = 0; i < abilityOrder.length; i++) {
			const index = game
				.getAlive()
				.map((user) => user.getPlayer(roomCode).role.type)
				.indexOf(abilityOrder[i]);

			if (index >= 0) {
				const user = game.getAlive()[index];
				const player = user.getPlayer(roomCode);
				const role = player.getRole();
				if (player.abilityTarget !== null) {
					const abilityTarget = connectedUsers.get(
						getKeyFromValue(proxyIdenfication, player.abilityTarget),
					);
					const abilityTargetPlayer = abilityTarget.getPlayer(roomCode);

					if (role.hasNightAbility) {
						if (role.type.includes("trapper") || role.type.includes("witch")) {
							// ? CANNOT BE BLOCKED BY EACH OTHER
							if (role.type.includes("trapper")) {
								// CAN BLOCK ANYONE
								abilityTargetPlayer.isBlocked = true;
								sendMessage(
									user.playerID,
									room,
									roomCode,
									game,
									null,
									null,
									"socket",
									`You trapped ${abilityTargetPlayer.getPlayerName()}`,
									"confirm",
								);
								if (abilityTargetPlayer.getRole().type.includes("witch")) {
									sendMessage(
										abilityTarget.playerID,
										room,
										roomCode,
										game,
										null,
										null,
										"target",
										`The Trapper tried to trap you - but you know a thing or two about trapping, so it doesn't affect you. Hehehe`,
										"info",
									);
								} else {
									if (abilityTargetPlayer.getRole().hasNightAbility) {
										sendMessage(
											abilityTarget.playerID,
											room,
											roomCode,
											game,
											null,
											null,
											"target",
											"You have been trapped! Your night ability was blocked by the Trapper",
											"info",
										);
									} else {
										sendMessage(
											abilityTarget.playerID,
											room,
											roomCode,
											game,
											null,
											null,
											"target",
											`You have been trapped by the Trapper, but it doesn't affect you`,
											"info",
										);
									}
								}
							} else if (role.type.includes("witch")) {
								if (!abilityTargetPlayer.getRole().team.includes("evil")) {
									// CAN BLOCK EVERYONE EXCEPT EVIL
									abilityTargetPlayer.isBlocked = true;
									sendMessage(
										user.playerID,
										room,
										roomCode,
										game,
										null,
										null,
										"socket",
										`You cast a freeze spell on ${abilityTargetPlayer.getPlayerName()}`,
										"confirm",
									);
									if (abilityTargetPlayer.getRole().type.includes("trapper")) {
										sendMessage(
											abilityTarget.playerID,
											room,
											roomCode,
											game,
											null,
											null,
											"target",
											`The Witch tried to cast a freeze spell on you - but you're far too experienced with traps, so it doesn't affect you`,
											"info",
										);
									} else {
										if (abilityTargetPlayer.getRole().hasNightAbility) {
											sendMessage(
												abilityTarget.playerID,
												room,
												roomCode,
												game,
												null,
												null,
												"target",
												"You have been frozen! Your night ability was blocked by the Witch",
												"info",
											);
										} else {
											sendMessage(
												abilityTarget.playerID,
												room,
												roomCode,
												game,
												null,
												null,
												"target",
												`You have been frozen by the Witch, but it doesn't affect you`,
												"info",
											);
										}
									}
								}
							}
						} else if (
							role.type.includes("surgeon") ||
							role.type.includes("framer")
						) {
							if (!player.isBlocked) {
								if (role.type.includes("surgeon")) {
									if (abilityTargetPlayer.getRole().team.includes("evil")) {
										if (abilityTarget === user) {
											if (user.getPlayer(roomCode).getRole().selfUsage > 0) {
												user.getPlayer(roomCode).getRole().selfUsage -= 1;
												// CAN DISGUISE EVIL TO LOOK GOOD
												abilityTargetPlayer.fakeTeam = "good";
												abilityTargetPlayer.isDisguised = true;
												sendMessage(
													user.playerID,
													room,
													roomCode,
													game,
													null,
													null,
													"socket",
													`You disguised yourself. Self uses left: ${
														user.getPlayer(roomCode).getRole().selfUsage
													}`,
													"confirm",
												);
											} else if (
												user.getPlayer(roomCode).getRole().selfUsage === 0
											) {
												// CAN DISGUISE EVIL TO LOOK GOOD
												abilityTargetPlayer.fakeTeam = "good";
												abilityTargetPlayer.isDisguised = true;
												sendMessage(
													user.playerID,
													room,
													roomCode,
													game,
													null,
													null,
													"socket",
													`You don't have any self uses left. Self uses left: ${
														user.getPlayer(roomCode).getRole().selfUsage
													}`,
													"confirm",
												);
											}
										} else {
											// CAN DISGUISE EVIL TO LOOK GOOD
											abilityTargetPlayer.fakeTeam = "good";
											abilityTargetPlayer.isDisguised = true;
											sendMessage(
												user.playerID,
												room,
												roomCode,
												game,
												null,
												null,
												"socket",
												`You disguise ${abilityTargetPlayer.getPlayerName()}. They will appear good to the Investigator this night`,
												"confirm",
											);
										}
									}
								} else if (role.type.includes("framer")) {
									if (!abilityTargetPlayer.getRole().team.includes("evil")) {
										// CAN DISGUISE ANYBODY ELSE (NOT EVIL) TO LOOK EVIL
										abilityTargetPlayer.fakeTeam = "evil";
										abilityTargetPlayer.isDisguised = true;
										sendMessage(
											user.playerID,
											room,
											roomCode,
											game,
											null,
											null,
											"socket",
											`You frame ${abilityTargetPlayer.getPlayerName()}. They will appear evil to the Investigator this night`,
											"confirm",
										);
									}
								}
							}
						} else if (role.type.includes("investigator")) {
							if (!player.isBlocked) {
								// ACTION WORKED
								if (abilityTargetPlayer.isDisguised) {
									// READ FROM FAKE TEAM
									sendMessage(
										user.playerID,
										room,
										roomCode,
										game,
										null,
										null,
										"socket",
										`You investigate ${abilityTargetPlayer.getPlayerName()}. They are: ${
											abilityTargetPlayer.fakeTeam
										}`,
										"confirm",
									);
								} else {
									// READ FROM role.team
									// abilityTargetPlayer.getRole().team
									sendMessage(
										user.playerID,
										room,
										roomCode,
										game,
										null,
										null,
										"socket",
										`You investigate ${abilityTargetPlayer.getPlayerName()}. They are: ${
											abilityTargetPlayer.getRole().team
										}`,
										"confirm",
									);
								}
							} else {
								// DIDNT WORK
								sendMessage(
									user.playerID,
									room,
									roomCode,
									game,
									null,
									null,
									"socket",
									`Your investigation didn't yield any results. Someone blocked you`,
									"info",
								);
							}
						} else if (role.type.includes("doctor")) {
							if (!player.isBlocked) {
								if (abilityTarget === user) {
									if (user.getPlayer(roomCode).getRole().selfUsage > 0) {
										user.getPlayer(roomCode).getRole().selfUsage -= 1;
										abilityTargetPlayer.isProtected = true;
										sendMessage(
											user.playerID,
											room,
											roomCode,
											game,
											null,
											null,
											"socket",
											`You protected yourself. Self uses left: ${
												user.getPlayer(roomCode).getRole().selfUsage
											}`,
											"confirm",
										);
									} else if (
										user.getPlayer(roomCode).getRole().selfUsage === 0
									) {
										sendMessage(
											user.playerID,
											room,
											roomCode,
											game,
											null,
											null,
											"socket",
											`You don't have any self uses left. Self uses left: ${
												user.getPlayer(roomCode).getRole().selfUsage
											}`,
											"confirm",
										);
									}
								} else {
									abilityTargetPlayer.isProtected = true;
									sendMessage(
										user.playerID,
										room,
										roomCode,
										game,
										null,
										null,
										"socket",
										`You protected ${abilityTargetPlayer.getPlayerName()}. Your patient lives to see the day`,
										"confirm",
									);
									sendMessage(
										abilityTarget.playerID,
										room,
										roomCode,
										game,
										null,
										null,
										"target",
										"You feel slightly stronger. You were protected by the Doctor",
										"info",
									);
								}
							} else {
								// DIDNT WORK
								sendMessage(
									user.playerID,
									room,
									roomCode,
									game,
									null,
									null,
									"socket",
									`Your medical aid didn't work. Someone blocked you`,
									"info",
								);
							}
						} else if (role.type.includes("serial killer")) {
							if (!(abilityTargetPlayer.isProtected || player.isBlocked)) {
								// SERIAL KILLER KILL WORK
								abilityTargetPlayer.setIsKilled(true);
								abilityTargetPlayer.addKiller("Serial Killer");
								sendMessage(
									user.playerID,
									room,
									roomCode,
									game,
									null,
									null,
									"socket",
									`You sink your knife into ${abilityTargetPlayer.getPlayerName()}. Your victim falls to the ground`,
									"confirm",
								);
								sendMessage(
									abilityTarget.playerID,
									room,
									roomCode,
									game,
									null,
									null,
									"target",
									"You feel a sharp pain in your back. You have been murdered by the Serial Killer",
									"alert",
								);
							} else {
								// DIDNT WORK
								if (abilityTargetPlayer.isProtected) {
									sendMessage(
										user.playerID,
										room,
										roomCode,
										game,
										null,
										null,
										"socket",
										`Your lust for blood has been contained. Someone protected ${abilityTargetPlayer.getPlayerName()}`,
										"info",
									);
									if (abilityTargetPlayer.getRole().type.includes("doctor")) {
										sendMessage(
											abilityTarget.playerID,
											room,
											roomCode,
											game,
											null,
											null,
											"target",
											"Someone tried to kill you, but you were protected",
											"info",
										);
									} else {
										if (!player.isBlocked) {
											sendMessage(
												abilityTarget.playerID,
												room,
												roomCode,
												game,
												null,
												null,
												"target",
												"Someone tried to kill you, but you were protected by the Doctor",
												"info",
											);
										} else {
										}
									}
								}

								if (player.isBlocked) {
									sendMessage(
										user.playerID,
										room,
										roomCode,
										game,
										null,
										null,
										"socket",
										"Your killing spree has been halted to a stop. Someone blocked you",
										"info",
									);
								}
							}
						}
					}
				}
			}
		}
	}

	socket.on("resetSocketActions", (playerID) => {
		resetSocketActions(playerID);
	});

	function resetSocketActions(playerID) {
		const roomCode = connectedUsers.get(playerID).getCurrentRoom();
		const room = rooms.get(roomCode);
		const game = room.getGame();
		const player = connectedUsers.get(playerID).getPlayer(roomCode);
		if (player.voteTarget !== null) {
			if (player.voteTarget !== "skip") {
				theVoteTarget = getKeyFromValue(proxyIdenfication, player.voteTarget);
				theVoteTargetPlayer = connectedUsers
					.get(theVoteTarget)
					.getPlayer(roomCode);
			}
			if (game.getCycle() === "Day") {
				if (player.voteTarget === "skip") {
					game.setSkipVotes(game.getSkipVotes() - player.getRole().voteCount);
				} else {
					theVoteTargetPlayer.dayVotes -= player.getRole().voteCount;
				}
			} else if (game.getCycle() === "Night") {
				// No vote skip during night
				theVoteTargetPlayer.nightVotes -= player.getRole().killVoteCount;
			}
		}

		player.reset();
		socket.emit(
			"playerTargetButtonsReset",
			player.abilityTarget,
			player.voteTarget,
			player,
		);
	}

	function resetAllActions(playerID, room, roomCode, game) {
		console.log("RESET ALL ACTIONS");

		for (let i = 0; i < game.getUsers().length; i++) {
			const user = game.getUsers()[i];
			const player = user.getPlayer(roomCode);
			player.reset();
			io.to(user.getPlayerID()).emit(
				"playerTargetButtonsReset",
				player.abilityTarget,
				player.voteTarget,
				player,
			);
		}
	}

	socket.on("fetchCemetery", (playerID) => {
		if (checkUserExist(playerID)) {
			if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
				const roomCode = connectedUsers.get(playerID).getCurrentRoom();
				const room = rooms.get(roomCode);
				const game = room.getGame();
				if (game.getProgress()) {
					if (game.getUsers().includes(connectedUsers.get(playerID))) {
						io.to(roomCode).emit(
							"savedCemetery",
							generateCemeteryList(playerID),
						);
					}
				}
			}
		}
	});

	function generateCemeteryList(playerID) {
		const roomCode = connectedUsers.get(playerID).getCurrentRoom();
		const room = rooms.get(roomCode);
		const game = room.getGame();
		const burried = [];
		for (let i = 0; i < game.getCemetery().length; i++) {
			const thePlayer = game.getCemetery()[i].getPlayer(roomCode);
			const burriedPlayerName = thePlayer.getPlayerName();
			let burriedPlayerRole = "";
			if (game.settings.showRoles.value === true) {
				burriedPlayerRole = thePlayer.getRole().name;
			}
			const burriedPlayer = { burriedPlayerName, burriedPlayerRole };
			burried.push(burriedPlayer);
		}
		return burried;
	}

	function deathHandler(playerID, room, roomCode, game) {
		// SEND MESSAGE WHO DIED FROM WHOM (killedBY)
		let noneDead = true;
		let noneLynched = true;
		const toSendToCemetery = [];
		for (let i = 0; i < game.getAlive().length; i++) {
			const player = game.getAlive()[i].getPlayer(roomCode);
			if (player.getIsKilled()) {
				noneDead = false;
				if (!player.killedBy.includes("Server")) {
					sendMessage(
						playerID,
						room,
						roomCode,
						game,
						null,
						null,
						"all",
						`${player.getPlayerName()} died during the night`,
						"alert",
					);
				} else if (player.killedBy.includes("Server")) {
					sendMessage(
						playerID,
						room,
						roomCode,
						game,
						null,
						null,
						"all",
						`${player.getPlayerName()} mysteriously died`,
						"alert",
					);
				}
				if (player.killedBy.length > 0) {
					// killed
					for (
						let killCount = 0;
						killCount < player.killedBy.length;
						killCount++
					) {
						const killer = player.killedBy[killCount];
						if (killer.includes("Evil")) {
							sendMessage(
								playerID,
								room,
								roomCode,
								game,
								null,
								null,
								"all",
								`${player.getPlayerName()} was killed by member of the ${killer} team`,
								"alert",
							);
						} else if (killer.includes("Serial Killer")) {
							sendMessage(
								playerID,
								room,
								roomCode,
								game,
								null,
								null,
								"all",
								`${player.getPlayerName()} was murdered by the ${killer}`,
								"alert",
							);
						} else if (killer.includes("Server")) {
							// Nothing here
						}
					}
				}
				// WHAT WAS THEIR ROLE
				if (game.settings.showRoles.value === true) {
					let thePlayerName = "";
					if (player?.getPlayerName().endsWith("s")) {
						thePlayerName = `${player.getPlayerName()}'`;
					} else if (!player?.getPlayerName().endsWith("s")) {
						thePlayerName = `${player.getPlayerName()}'s`;
					}
					sendMessage(
						playerID,
						room,
						roomCode,
						game,
						null,
						null,
						"all",
						`${thePlayerName} role was: ${player.getRole().name}`,
						"important",
					);
				}

				const executionerObject = Object.values(
					checkIfExecutionerAlive(playerID, room, roomCode, game),
				);

				if (executionerObject[0] === true) {
					const executioner = executionerObject[1];

					// if the executioner's target gets KILLED during night
					if (
						executioner.getPlayer(roomCode).getRole().target ===
						game.getAlive()[i]
					) {
						// executioner targets gets killed
						// executioner becomes JESTER
						executioner.getPlayer(roomCode).setOldRole("executioner");
						executioner
							.getPlayer(roomCode)
							.setOldTarget(executioner.getPlayer(roomCode).getRole().target);
						executioner.getPlayer(roomCode).setRole(new Role("jester"));
						//  update set players only for executioner
						io.to(executioner.getPlayerID()).emit("updateSetPlayers");
						updateRoleCard(playerID, "socket", executioner.getPlayerID());
						sendMessage(
							executioner.getPlayerID(),
							room,
							roomCode,
							game,
							null,
							null,
							"target",
							`Your target ${player.getPlayerName()} has died. You have become a Jester!`,
							"important",
						);
					}
				}

				const lawyerObject = Object.values(
					checkIfLawyerAlive(playerID, room, roomCode, game),
				);
				if (lawyerObject[0] === true) {
					const lawyer = lawyerObject[1];
					if (
						lawyer.getPlayer(roomCode).getRole().client === game.getAlive()[i]
					) {
						sendMessage(
							lawyer.getPlayerID(),
							room,
							roomCode,
							game,
							null,
							null,
							"target",
							`Your client ${player.getPlayerName()} has died. You're now on your own`,
							"info",
						);
					}
				}

				// To send to cemetery
				toSendToCemetery.push(game.getAlive()[i]);
			} else if (player.getIsLynched()) {
				noneLynched = false;
				// lynched
				// WHAT WAS THEIR ROLE
				if (game.settings.showRoles.value === true) {
					let thePlayerName = "";
					if (player?.getPlayerName().endsWith("s")) {
						thePlayerName = `${player.getPlayerName()}'`;
					} else if (!player?.getPlayerName().endsWith("s")) {
						thePlayerName = `${player.getPlayerName()}'s`;
					}
					sendMessage(
						playerID,
						room,
						roomCode,
						game,
						null,
						null,
						"all",
						`${thePlayerName} role was: ${player.getRole().name}`,
						"important",
					);
				}

				const lawyerObject = Object.values(
					checkIfLawyerAlive(playerID, room, roomCode, game),
				);

				if (lawyerObject[0] === true) {
					const lawyer = lawyerObject[1];
					if (
						game.getAlive()[i] === lawyer.getPlayer(roomCode).getRole().client
					) {
						if (
							game
								.getAlive()
								[i].getPlayer(roomCode)
								.getRole()
								.type.includes("jester")
						) {
							// If client is lynched, and they are the jester
							sendMessage(
								lawyer.getPlayerID(),
								room,
								roomCode,
								game,
								null,
								null,
								"target",
								`Your client ${player.getPlayerName()} has been lynched. Your client seems...happy for some reason`,
								"info",
							);
						} else {
							sendMessage(
								lawyer.getPlayerID(),
								room,
								roomCode,
								game,
								null,
								null,
								"target",
								`Your client ${player.getPlayerName()} has been lynched. You're now on your own`,
								"info",
							);
						}
					}
				}

				// To send to cemetery
				toSendToCemetery.push(game.getAlive()[i]);
			}
		}

		for (let i = 0; i < toSendToCemetery.length; i++) {
			// AFTER THAT, ADD THEM TO CEMETERY
			if (!game.getCemetery().includes(toSendToCemetery[i])) {
				game.addCemetery(toSendToCemetery[i]);
				io.to(toSendToCemetery[i].getPlayerID()).emit("settingCemeteryRoom");
				// REMOVE FROM ALIVE ARRAY
				game.removeAlive(toSendToCemetery[i]);
				io.to(roomCode).emit("cemetery", generateCemeteryList(playerID));
			}
		}

		if (noneDead && noneLynched) {
			// Increment how many times there have not been any deaths
			game.setNoDeaths(game.getNoDeaths() + 1);
		} else {
			// Reset
			game.setNoDeaths(0);
		}

		if (game.getNoDeaths() === maxNoDeaths - 1) {
			sendMessage(
				playerID,
				room,
				roomCode,
				game,
				null,
				null,
				"all",
				"Please note - if no one dies again, the game will end with a timeout",
				"important",
			);
		}

		if (noneDead && game.getPhase() === "recap") {
			sendMessage(
				playerID,
				room,
				roomCode,
				game,
				null,
				null,
				"all",
				"Nothing seems to have happened. That probably means something good...right?",
				"info",
			);
		}
	}

	function clearClock(game) {
		if (game.getDone()) {
			clearInterval(game.getGameInterval());
			game.setGameInterval(null);
		}
	}

	function clockHandler(playerID, roomCode, room, game) {
		game.setCurrentCycle(0);
		game.setCurrentPhase(0);
		game.getTheDurations().night.actions = game.settings.actions.value;
		game.getTheDurations().day.discussion = game.settings.discussion.value;
		game.getTheDurations().day.voting = game.settings.voting.value;
		game.setTheDurations(Object.values(game.getTheDurations()));

		game.setNightLength(Object.values(game.getTheDurations()[0]).length);
		game.setDayLength(Object.values(game.getTheDurations()[1]).length);

		game.setCycleCount(1);
		// Two objects, Night object, Day object
		// Set duration to night object -> first phase
		initClock(
			game.getTimer(),
			Object.values(game.getTheDurations()[game.getCurrentCycle()])[
				game.getCurrentPhase()
			],
		);
		game.setCycle("Night");
		game.setPhase(
			Object.keys(game.getTheDurations()[game.getCurrentCycle()])[
				game.getCurrentPhase()
			],
		);
		// Check once from beginning
		checkForWin(playerID, room, roomCode, game);
		// time is equal to intervalID
		game.setGameInterval(
			setInterval(() => {
				// console.log("THE CLOCK ID", GAME_CLOCK_ID)

				console.log(
					game.getTimer().getCounter(),
					game.getPhase(),
					`phase:${game.getCurrentPhase()}`,
					`cycle:${game.getCurrentCycle()}`,
					game.getCycle(),
					game.getCycleCount(),
				);
				if (game.getDone() === false) {
					// send clock to clients
					io.to(roomCode).emit(
						"clock",
						game.getTimer().getCounter(),
						game.getPhase(),
						game.getCycle(),
						game.getCycleCount(),
						game.getTheDurations(),
					);

					messageHandlerForCycles(
						playerID,
						room,
						roomCode,
						game,
						game.getEmitCycleOnce(),
					);
					messageHandlerForPhases(
						playerID,
						room,
						roomCode,
						game,
						game.getEmitPhaseOnce(),
					);
					gameHandler(playerID);
					io.to(roomCode).emit("changeUI", game.getCycle());

					if (game.getTimer().getCounter() <= 0) {
						// NIGHT
						if (game.getCurrentCycle() === 0) {
							if (game.getCurrentPhase() < game.getNightLength()) {
								game.setCurrentPhase(game.getCurrentPhase() + 1);
								game.setPhase(
									Object.keys(game.getTheDurations()[game.getCurrentCycle()])[
										game.getCurrentPhase()
									],
								);
								game.setEmitPhaseOnce(true);
								console.log("night less");
								io.to(roomCode).emit("updateSetPlayers");
								setActionsOnPhase(playerID, "clock");
							}
							if (game.getCurrentPhase() >= game.getNightLength()) {
								game.setCurrentPhase(0);
								game.setCurrentCycle(1);
								game.setPhase(
									Object.keys(game.getTheDurations()[game.getCurrentCycle()])[
										game.getCurrentPhase()
									],
								);
								game.setEmitPhaseOnce(true);
								game.setCycle("Day");
								// Prevent from spamming message
								game.setEmitCycleOnce(true);
								// io.to(roomCode).emit("changeUI", game.getCycle());
								// io.to(roomCode).emit("updateSetPlayers");
							}
							initClock(
								game.getTimer(),
								Object.values(game.getTheDurations()[game.getCurrentCycle()])[
									game.getCurrentPhase()
								],
							);
						}
						// DAY
						else if (game.getCurrentCycle() === 1) {
							if (game.getCurrentPhase() < game.getDayLength()) {
								game.setCurrentPhase(game.getCurrentPhase() + 1);
								game.setPhase(
									Object.keys(game.getTheDurations()[game.getCurrentCycle()])[
										game.getCurrentPhase()
									],
								);
								game.setEmitPhaseOnce(true);
								console.log("day less");
								io.to(roomCode).emit("updateSetPlayers");
								setActionsOnPhase(playerID, "clock");
							}
							if (game.getCurrentPhase() >= game.getDayLength()) {
								resetAllActions(playerID, room, roomCode, game);
								resetPhaseConditions(game);
								game.setCurrentPhase(0);
								game.setCurrentCycle(0);
								game.setPhase(
									Object.keys(game.getTheDurations()[game.getCurrentCycle()])[
										game.getCurrentPhase()
									],
								);
								game.setEmitPhaseOnce(true);
								game.setCycle("Night");
								// Prevent from spamming message
								game.setEmitCycleOnce(true);
								// Increment cycle count
								game.setCycleCount(game.getCycleCount() + 1);
								game.resetSkipVotes();
								// io.to(roomCode).emit("changeUI", game.getCycle());
							}

							initClock(
								game.getTimer(),
								Object.values(game.getTheDurations()[game.getCurrentCycle()])[
									game.getCurrentPhase()
								],
							);
						}
					} else {
						game.getTimer().tick();
					}
				}
			}, 1000),
		);
	}

	function initClock(timer, duration) {
		timer.init(duration);
	}

	socket.on("initGame", (playerID) => {
		if (checkUserExist(playerID)) {
			if (connectedUsers.get(playerID).getCurrentRoom() !== null) {
				const roomCode = connectedUsers.get(playerID).getCurrentRoom();
				const room = rooms.get(roomCode);
				const game = room.getGame();
				if (game.getProgress()) {
					if (game.getDone() === false) {
						if (checkAllReadyGame(roomCode, playerID)) {
							if (game.getUsers().includes(connectedUsers.get(playerID))) {
								if (room.getHost() === playerID) {
									if (game.getTimer().getRunning() === false) {
										io.to(roomCode).emit("updateSetPlayers");
										clockHandler(playerID, roomCode, room, game);
									}
								}
							}
						}
					}
				}
			}
		}
	});
});
