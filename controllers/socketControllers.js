module.exports.join_room = (data,socketClient)=>{

    socketClient.join(data.roomNo);

    console.log("Joined Room", data);

    socketClient.to(data.roomNo).emit("opponent_joined", {
      message: "Joined",
      dispatch_type: "opponent_joined",
      username: data.username,
      id: socketClient.id
    });

}

module.exports.host_message_send = (data1, socketClient) => {
    
    // console.log("Sending message to everyone1", data1);
  
    socketClient.to(data1.room).emit("host_message_receive", {
      data: data1.data,
      dispatch_type: "host_update"
    });

};

module.exports.player_message_send = (data1, socketClient) => {
    
  // console.log("Sending message to everyone1", data1);

  socketClient.to(data1.room).emit("player_message_receive", {
    data: data1.data,
    dispatch_type: "player_update"
  });

};