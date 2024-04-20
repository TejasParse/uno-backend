const express = require("express");
const app = express();
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const { join_room, host_message_send, player_message_send } = require("./controllers/socketControllers");


app.use(cors());
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

io.on("connection", (socket) => {

  console.log("User Conencted", socket.id);
  
  socket.on("join_room", (data)=> {

    join_room(data, socket);

  })

  socket.on("host_message_send", (data)=> {
    host_message_send(data, socket);
  })

  socket.on("player_message_send", (data)=> {
    player_message_send(data, socket);
  })

  socket.on("disconnect", (data) => {
    console.log(data, "disconnect");
  });

});

server.listen(4000, () => {
  console.log("Connected Yo");
});
