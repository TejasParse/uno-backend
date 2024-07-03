const cards = require("../assets/cards.json")

exports.filterGameData = (gameData) => {

    let output = {};
    let keys = ["roomNo", "host", "presentCard", "started", "current_turn", "direction", "winners", "messages"]

    keys.forEach(key => {

        if (gameData.hasOwnProperty(key)) {

            output[key] = gameData[key];
        }
    });

    let newPlayers = gameData.players.map(elm => {
        return {
            username: elm.username,
            cardsCount: elm.cards.length
        }
    })

    output["players"] = newPlayers

    return output;


}

exports.updateAllPlayers = (socketClient, gameData) => {

    for (let i = 0; i < gameData.players.length; i++) {
        let playerInfo = gameData.players[i];

        let payload = {
            game: this.filterGameData(gameData),
            userDetails: {
                username: playerInfo.username,
                cards: playerInfo.cards
            }
        };

        if (playerInfo.socketId === socketClient.id) {
            // Emit to the sending client
            socketClient.emit("UPDATE", payload);
        } else {
            // Emit to other clients
            socketClient.to(playerInfo.socketId).emit("UPDATE", payload);
        }

    }



}

exports.getNewDecks = (players, selectedIndexes) => {
    const numberOfSets = players.length;

    const selectedSets = [];

    for (let i = 0; i < numberOfSets; i++) {
        const selectedCards = [];
        while (selectedCards.length < 10) {
            const randomIndex = Math.floor(Math.random() * cards.length);
            if (!selectedIndexes.has(randomIndex)) {
                selectedIndexes.add(randomIndex);
                selectedCards.push(randomIndex);
            }
        }
        players[i].cards = selectedCards
        selectedSets.push(selectedCards);
    }
    return { players, selectedIndexes }
}