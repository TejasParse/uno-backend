const express = require("express");
const app = express();
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { filterGameData, updateAllPlayers, getNewDecks } = require("./utils/helper")

const { join_room, host_message_send, player_message_send } = require("./controllers/socketControllers");
const cards = require("./assets/cards.json")

app.use(cors());
const server = http.createServer(app);

const io = new Server(server, {
	cors: {
		origin: "*",
	},
});

let onlineUsers = [];

// {
//   roomNo: -1,
//   isHost: 0,

//   players: [{ username: data.username, cards: [], socketId: socket.id }],

//   userDetails: {},
//   presentCard: 0,
//   selectedIndexes: new Set(),
//   started: 0,

//   current_turn: 0,
//   direction: 0,
//   winners: [],

//   messages: []
// }
let gameRooms = [];

io.on("connection", (socket) => {

	console.log("User Conencted", socket.id);

	// Creating a New Room
	socket.on("create_room", (data) => {

		let index = gameRooms.findIndex((elm) => elm.roomNo === data.roomNo);
		console.log(data, "Room Data Creating", index);

		if (index === -1) {
			let gameData = {
				roomNo: data.roomNo,
				host: data.username,

				players: [{ username: data.username, cards: [], socketId: socket.id }],

				presentCard: 0,
				selectedIndexes: new Set(),
				started: 0,

				current_turn: 0,
				direction: 0,
				winners: [],

				messages: []
			}
			gameRooms.push(gameData)

			socket.emit("create_room_success", {
				game: filterGameData(gameData),
				userDetails: {
					username: data.username,
					cards: []
				}
			})

			// join_room(data, socket);

		} else {
			socket.emit("custom_error", {
				message: "Room with this ID already exists!",
				type: "create_room_error"
			})
		}


	})

	// Joining Existing Room
	socket.on("join_room", (data) => {

		let index = gameRooms.findIndex((elm) => elm.roomNo === data.roomNo);
		// console.log(data, "Room Data Creating", index);

		if (index === -1) {

			socket.emit("custom_error", {
				message: "Room Not Found!",
				type: "join_room_error"
			})


		} else {

			let game = gameRooms[index];
			const usernameExists = game.players.some(player => player.username === data.username);

			if (usernameExists) {
				socket.emit("custom_error", {
					message: "Username already exists in the room! Please choose another username",
					type: "join_room_error"
				})
			} else {
				gameRooms[index].players = [
					...gameRooms[index].players,
					{
						username: data.username,
						cards: [],
						socketId: socket.id
					}
				]

				socket.emit("join_room_success", {
					game: filterGameData(gameRooms[index]),
					userDetails: {
						username: data.username,
						cards: []
					}
				})

				updateAllPlayers(socket, gameRooms[index]);


			}

		}

	})

	// Sending Message
	socket.on("message_send", (data) => {
		let index = gameRooms.findIndex((elm) => elm.roomNo === data.roomNo);

		if (index === -1) {

			socket.emit("custom_error", {
				message: "Room Not Found!",
				type: "join_room_error"
			})


		} else {

			gameRooms[index].messages.push({
				type: data.type,
				message: data.message,
				sender: data.sender
			})

			updateAllPlayers(socket, gameRooms[index]);

		}
	})

	socket.on("start_game", (data) => {
		let index = gameRooms.findIndex((elm) => elm.roomNo === data.roomNo);

		if (index === -1) {

			socket.emit("custom_error", {
				message: "Room Not Found!",
				type: "join_room_error"
			})


		} else {

			const { players, selectedIndexes } = getNewDecks(gameRooms[index].players, gameRooms[index].selectedIndexes);
			console.log(players, selectedIndexes, "New Data");

			let randomIndex;
			do {
				randomIndex = Math.floor(Math.random() * cards.length);
			} while (gameRooms[index].selectedIndexes.has(randomIndex));


			gameRooms[index].selectedIndexes.add(randomIndex);

			gameRooms[index].players = players;
			gameRooms[index].selectedIndexes = selectedIndexes;
			gameRooms[index].started = 1;
			gameRooms[index].presentCard = randomIndex;
			gameRooms[index].messages.push({
				sender: "HOST",
				message: "The Game has started!",
				type: "command"
			})


			updateAllPlayers(socket, gameRooms[index])
		}
	})

	socket.on("host_message_send", (data) => {
		host_message_send(data, socket);
	})

	socket.on("player_message_send", (data) => {
		player_message_send(data, socket);
	})

	socket.on("disconnect", (data) => {
		console.log(data, "disconnect");
	});

});

app.get("/", (req, res) => {

	return res.status(200).json({
		message: "Working"
	})

})

server.listen(4000, () => {
	console.log("Connected Yo");
});
