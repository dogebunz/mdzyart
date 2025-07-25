const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

io.on('connection', (socket) => {
  let currentRoom = null;

  socket.on('joinRoom', (room) => {
    if (currentRoom) socket.leave(currentRoom);
    currentRoom = room;
    socket.join(room);
    io.to(room).emit('system', `User ${socket.id.slice(0, 5)} joined`);
  });

  socket.on('leaveRoom', (room) => {
    socket.leave(room);
    io.to(room).emit('system', `User ${socket.id.slice(0, 5)} left`);
    currentRoom = null;
  });

  socket.on('chat', ({ room, message }) => {
    io.to(room).emit('chat', { id: socket.id.slice(0, 5), message });
  });

  socket.on('draw', ({ room, data }) => {
    socket.to(room).emit('draw', data);
  });

  socket.on('disconnect', () => {
    if (currentRoom) {
      io.to(currentRoom).emit('system', `User ${socket.id.slice(0, 5)} disconnected`);
    }
  });
});

server.listen(3000, () => console.log('Server running on port 3000'));
