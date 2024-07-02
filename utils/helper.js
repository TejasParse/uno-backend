exports.filterGameData = (gameData) => {

    let output = {};
    let keys=["roomNo", "host", "presentCard", "started", "current_turn", "direction", "winners", "messages"]

    keys.forEach(key => {

        if (gameData.hasOwnProperty(key)) {

            output[key] = gameData[key];
        }
    });

    let newPlayers = gameData.players.map(elm=> {
        return {
            username: elm.username,
            cardsCount: elm.cards.length
        }
    })

    output["players"] = newPlayers

    return output;


}

exports.updateAllPlayers = (socketClient, gameData) => {

    let socketIds = gameData.players.map(elm=> elm.socketId);
    console.log(socketIds, "Socket Ids in Array");
    for(let i=0; i<socketIds.length; i++) {
        socketClient.to(socketIds[i]).emit("UPDATE", {
            game: this.filterGameData(gameData)
        })
    }

}