const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

let rooms = {};      // stores {roomName: [users]}
let messages = {};   // stores {roomName: [messages]}

io.on('connection', socket => {

  socket.on('join-room', ({ room, username }) => {
    socket.join(room);

    // Init room arrays if needed
    if(!rooms[room]) rooms[room] = [];
    if(!messages[room]) messages[room] = [];

    rooms[room].push({ id: socket.id, username });
    socket.room = room;
    socket.username = username;

    // Send user list
    io.to(room).emit('users', rooms[room].map(u => u.username));

    // Send message history to new user
    socket.emit('chat-history', messages[room]);
  });

  socket.on('chat', msg => {
    const messageData = { user: socket.username, text: msg };

    // Save message
    if(socket.room) messages[socket.room].push(messageData);

    // Broadcast
    io.to(socket.room).emit('chat', messageData);
  });

  socket.on('disconnect', () => {
    if(!socket.room) return;

    rooms[socket.room] = rooms[socket.room].filter(u => u.id !== socket.id);

    io.to(socket.room).emit('users', rooms[socket.room].map(u => u.username));
  });

  // Voice stuff
  socket.on('join-voice', () => {
    if(socket.room) socket.to(socket.room).emit('user-joined', socket.id);
  });
  socket.on('offer', data => { io.to(data.to).emit('offer', {...data, from: socket.id}); });
  socket.on('answer', data => { io.to(data.to).emit('answer', {...data, from: socket.id}); });
  socket.on('ice', data => { io.to(data.to).emit('ice', {...data, from: socket.id}); });
  socket.on('speaking', speaking => {
    if(socket.room) socket.to(socket.room).emit('speaking', { user: socket.username, speaking });
  });

});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Server running on port ' + PORT));