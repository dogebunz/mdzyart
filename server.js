const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();

// CORS: allow your GitHub Pages domain
app.use(cors({
  origin: [
    'https://dogebunz.github.io',
    'http://localhost:3000'
  ],
  methods: ['GET', 'POST'],
  credentials: true
}));

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [
      'https://dogebunz.github.io',
      'http://localhost:3000'
    ],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

io.on('connection', (socket) => {
  let currentRoom = null;

  socket.on('clear', ({ room }) => {
  socket.to(room).emit('clear');
  });
  
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

  socket.on('draw', data => {
  drawLine(data.from, data.to, data.color, false);
});


  socket.on('disconnect', () => {
    if (currentRoom) {
      io.to(currentRoom).emit('system', `User ${socket.id.slice(0, 5)} disconnected`);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Server running on port', PORT));
