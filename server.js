const express = require("express");
const app = express();
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { filterGameData, updateAllPlayers, getNewDecks, getNextTurn, getRandomCards } = require("./utils/helper")

const { join_room, host_message_send, player_message_send } = require("./controllers/socketControllers");
const cards = require("./assets/cards.json");
const e = require("express");

app.use(cors());
const server = http.createServer(app);

const io = new Server(server, {
	cors: {
		origin: "*",
	},
});

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

//   messages: [{  }]
// }
let gameRooms = [];

// {
// 	socketId,
// 	username,
// 	roomNo,
// 	isHost
// }
let onlineUsers = [];
const removeUsers = (userdata, index, socketClient) => {



	let gameIndex = gameRooms.findIndex((elm) => elm.roomNo === userdata.roomNo);
	if (gameIndex !== -1) {

		gameRooms[gameIndex].messages.push({
			sender: "HOST",
			message: `${userdata.username} disconnected!`,
			type: "command"
		})

		let unHostMembers = gameRooms[gameIndex].players.filter((elm) => !elm.isHost)

		if (unHostMembers.length === 0) {
			gameRooms.splice(gameIndex, 1);
			console.log(userdata.roomNo, "Removing this room from array");
		} else {
			// TODO: Set a new host
			console.log("Will Set a new host");
			gameRooms[gameIndex].players = gameRooms[gameIndex].players.filter((elm) => elm.username !== userdata.username)

			if (userdata.isHost) {
				let hostUser = unHostMembers[0];
				let hostIndex = gameRooms[gameIndex].players.findIndex((elm) => elm.socketId === hostUser.socketId)
				socketClient.to(hostUser.socketId).emit("set_host", {

				})
				gameRooms[gameIndex].players[hostIndex].isHost = 1;
				gameRooms[gameIndex].messages.push({
					sender: "HOST",
					message: `${hostUser.username} is the new host!`,
					type: "command"
				})
			}





			updateAllPlayers(socketClient, gameRooms[gameIndex])
		}

	}

	onlineUsers.splice(index, 1);

};




io.on("connection", (socket) => {

	console.log("User Conencted", socket.id);

	// Creating a New Room
	socket.on("create_room", (data) => {

		let index = gameRooms.findIndex((elm) => elm.roomNo === data.roomNo);
		// console.log(data, "Room Data Creating", index);


		if (index === -1) {
			let gameData = {
				roomNo: data.roomNo,
				host: data.username,

				players: [{ username: data.username, cards: [], socketId: socket.id, isHost: 1 }],

				presentCard: 0,
				selectedIndexes: new Set(),
				started: 0,

				current_turn: 0,
				direction: 0,
				winners: [],

				messages: []
			}
			gameRooms.push(gameData)

			onlineUsers.push({
				socketId: socket.id,
				username: data.username,
				roomNo: data.roomNo,
				isHost: 1
			})
			console.log(onlineUsers, "Added Online Users");

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

				onlineUsers.push({
					socketId: socket.id,
					username: data.username,
					roomNo: data.roomNo,
					isHost: 0
				})
				// console.log(onlineUsers, "Added Online Users");

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

	// Game Start and create decks
	socket.on("start_game", (data) => {
		let index = gameRooms.findIndex((elm) => elm.roomNo === data.roomNo);

		if (index === -1) {

			socket.emit("custom_error", {
				message: "Room Not Found!",
				type: "join_room_error"
			})


		} else {

			const { players, selectedIndexes } = getNewDecks(gameRooms[index].players, gameRooms[index].selectedIndexes);
			// console.log(players, selectedIndexes, "New Data");

			let randomIndex;
			do {
				randomIndex = Math.floor(Math.random() * cards.length);
			} while (gameRooms[index].selectedIndexes.has(randomIndex));



			gameRooms[index].players = players;
			gameRooms[index].selectedIndexes = selectedIndexes;
			gameRooms[index].selectedIndexes.add(randomIndex);
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

	socket.on("random_card", (data) => {
		let index = gameRooms.findIndex((elm) => elm.roomNo === data.roomNo);

		if (index === -1) {

			socket.emit("custom_error", {
				message: "Room Not Found!",
				type: "join_room_error"
			})


		} else {
			// console.log(players, selectedIndexes, "New Data");

			// Pick a random card
			let randomIndex;
			do {
				randomIndex = Math.floor(Math.random() * cards.length);
			} while (gameRooms[index].selectedIndexes.has(randomIndex));


			gameRooms[index].selectedIndexes.add(randomIndex);
			let playIndex = gameRooms[index].players.findIndex(elm => elm.username === data.username)
			gameRooms[index].players[playIndex].cards.push(randomIndex)

			// Move to new player
			let dir1 = gameRooms[index].direction

			let newCurrentTurn1
			if (!dir1) {
				newCurrentTurn1 = gameRooms[index].current_turn + 1;
				if (newCurrentTurn1 >= gameRooms[index].players.length) {
					newCurrentTurn1 = 0;
				}

			} else {

				newCurrentTurn1 = gameRooms[index].current_turn - 1;
				if (newCurrentTurn1 < 0) {
					newCurrentTurn1 = gameRooms[index].players.length - 1;
				}

			}

			gameRooms[index].current_turn = newCurrentTurn1


			updateAllPlayers(socket, gameRooms[index])
		}
	})

	socket.on("play_card", (data) => {
		const userDetails = onlineUsers.find((elm) => elm.socketId === socket.id)

		console.log(userDetails, "This user played", data.cardNo);

		if (userDetails) {
			let gameIndex = gameRooms.findIndex((elm) => elm.roomNo === userDetails.roomNo);
			if (gameIndex !== -1) {

				const newPlayedCard = cards[data.cardNo]

				let playerIndex = gameRooms[gameIndex].players.findIndex((elm) => elm.username === userDetails.username)
				let player = gameRooms[gameIndex].players[playerIndex]

				const newSelectedIndexes = gameRooms[gameIndex].selectedIndexes;
				newSelectedIndexes.delete(data.cardNo);

				const newPlayerCards = player.cards.filter(card => card !== data.cardNo);

				let dir = gameRooms[gameIndex].direction
				let oldDir = dir;
				if (newPlayedCard.display_text === "Reverse") {
					dir ^= 1
					console.log("Reversing the order", dir);
				}

				let newCurrentTurn = getNextTurn(gameRooms[gameIndex].players, dir, gameRooms[gameIndex].current_turn)
				let nextTurn = newCurrentTurn


				let newState = {
					...gameRooms[gameIndex],
					presentCard: data.cardNo,
					selectedIndexes: newSelectedIndexes,
					players: [
						...gameRooms[gameIndex].players.slice(0, playerIndex),
						{
							...player,
							cards: newPlayerCards
						},
						...gameRooms[gameIndex].players.slice(playerIndex + 1)
					],
					current_turn: newCurrentTurn,
					direction: dir,
					messages: [
						...gameRooms[gameIndex].messages,
						{
							sender: player.username,
							message: `${player.username} played ${newPlayedCard.card_name}`,
							type: "command"
						}
					]
				};




				if (newPlayedCard.display_text === "+2") {
					let { selectedCards, selectedIndexes: newIndexs } = getRandomCards(gameRooms[gameIndex].selectedIndexes, 2)
					console.log(selectedCards, "Draw Two Cards", nextTurn);

					newState = {
						...newState,
						selectedIndexes: newIndexs,
						players: [
							...newState.players.slice(0, nextTurn),
							{
								...newState.players[nextTurn],
								cards: [
									...newState.players[nextTurn].cards,
									...selectedCards
								]
							},
							...newState.players.slice(nextTurn + 1)
						]
					};
					console.log(newState, "New State?", newState?.players[nextTurn], "New PLayer", nextTurn);
				}

				if (newPlayerCards.length === 0) {
					console.log("Game Over");
					newState = {
						...gameRooms[gameIndex],
						presentCard: data.cardNo,
						selectedIndexes: newSelectedIndexes,
						players: [
							...gameRooms[gameIndex].players.slice(0, playerIndex),
							...gameRooms[gameIndex].players.slice(playerIndex + 1)
						],
						current_turn: newState.current_turn,
						direction: dir,
						winners: [
							...gameRooms[gameIndex].winners,
							{
								...player,
								cards: newPlayerCards
							},
						]
					};
					console.log(newState, "Player Won. Changing State");
					if (oldDir === 0) {

						if (newCurrentTurn !== 0) {
							newState.current_turn = newCurrentTurn - 1;
						}

					} else if (oldDir === 1) {

						if (newCurrentTurn !== (newState.players.length - 1)) {
							newState.current_turn = newCurrentTurn + 1;
						}

					}
				}

				if (newPlayedCard.display_text === "Skip") {
					newState.current_turn = getNextTurn(newState.players, newState.direction, newState.current_turn);
				}
				gameRooms[gameIndex] = newState;

				updateAllPlayers(socket, gameRooms[gameIndex])
			}
		}
	})

	socket.on("reset_game", (data) => {

		const hostDetails = onlineUsers.find((elm)=>elm.socketId === socket.id)

		let gameIndex = gameRooms.findIndex((elm) => elm.roomNo === data.roomNo);
		if(gameIndex !== -1) {

			let newPlayers = [
				...gameRooms[gameIndex].players,
				...gameRooms[gameIndex].winners
			]
			const freshIndexes = new Set()
			const { players: players1, selectedIndexes: newIndexes } = getNewDecks(newPlayers, freshIndexes)
	
			// console.log(selectedIndexes, "What is happenig");
	
			let randomIndex12;
			do {
				randomIndex12 = Math.floor(Math.random() * cards.length);
			} while (newIndexes.has(randomIndex12));
	
	
			newIndexes.add(randomIndex12);
	
			let new_state123 = {
				...gameRooms[gameIndex],
				players: players1,
				presentCard: randomIndex12,
				selectedIndexes: newIndexes,
				started: 1,
				current_turn: 0,
				direction: 0,
				winners: [],
				messages: [
					...gameRooms[gameIndex].messages,
					{
						sender: hostDetails?.username || "HOST",
						message: `${hostDetails?.username || "HOST"} initiated a game reset`,
						type: "command"
					}
				]
			};
	
			updateAllPlayers(socket, new_state123)
		}

	})

	socket.on("host_message_send", (data) => {
		host_message_send(data, socket);
	})

	socket.on("player_message_send", (data) => {
		player_message_send(data, socket);
	})

	socket.on("disconnect", () => {
		const userIndex = onlineUsers.findIndex((elm) => elm.socketId === socket.id)
		console.log(socket.id, "Someone disconnected?", userIndex, onlineUsers);
		if (userIndex !== -1) {

			// console.log(onlineUsers[userIndex], "Removed From Online Users");
			removeUsers(onlineUsers[userIndex], userIndex, socket)
		}
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
