const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

let rooms = {};

io.on('connection', socket => {

  socket.on('join-room', ({ room, username }) => {
    socket.join(room);

    if (!rooms[room]) rooms[room] = [];
    rooms[room].push({ id: socket.id, username });

    io.to(room).emit('users', rooms[room].map(u => u.username));

    socket.room = room;
    socket.username = username;
  });

  socket.on('chat', msg => {
    io.to(socket.room).emit('chat', {
      user: socket.username,
      text: msg
    });
  });

  socket.on('disconnect', () => {
    if (!socket.room) return;

    rooms[socket.room] = rooms[socket.room].filter(u => u.id !== socket.id);

    io.to(socket.room).emit('users', rooms[socket.room].map(u => u.username));
  });

  // VOICE
  socket.on('join-voice', () => {
    if (!socket.room) return;
    socket.to(socket.room).emit('user-joined', socket.id);
  });

  socket.on('offer', data => {
    io.to(data.to).emit('offer', { ...data, from: socket.id });
  });

  socket.on('answer', data => {
    io.to(data.to).emit('answer', { ...data, from: socket.id });
  });

  socket.on('ice', data => {
    io.to(data.to).emit('ice', { ...data, from: socket.id });
  });

});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Server running on port ' + PORT));