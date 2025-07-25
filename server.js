const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();

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

// --- Store usernames and canvas history by room ---
const userNames = {};
const canvasHistory = {}; // { roomName: [ {from, to, color, size, isEraser}, ... ] }

io.on('connection', (socket) => {
  socket.currentRoom = null;

  // --- Join Room with Name ---
  socket.on('joinRoom', ({ room, name }) => {
    if (socket.currentRoom) socket.leave(socket.currentRoom);
    socket.currentRoom = room;
    userNames[socket.id] = name || 'Anonymous';
    socket.join(room);
    io.to(room).emit('system', `<b>${userNames[socket.id]}</b> joined`);
    // Send the canvas history to the new user
    if (canvasHistory[room]) {
      socket.emit('canvasHistory', canvasHistory[room]);
    }
  });

  // --- Leave Room ---
  socket.on('leaveRoom', (room) => {
    socket.leave(room);
    io.to(room).emit('system', `<b>${userNames[socket.id] || 'Someone'}</b> left`);
    delete userNames[socket.id];
    socket.currentRoom = null;
  });

  // --- Chat Message ---
  socket.on('chat', ({ room, message, name }) => {
    const displayName = name || userNames[socket.id] || 'Anonymous';
    io.to(room).emit('chat', { id: socket.id.slice(0, 5), message, name: displayName });
  });

  // --- Drawing ---
  socket.on('draw', ({ room, data }) => {
    if (!canvasHistory[room]) canvasHistory[room] = [];
    canvasHistory[room].push(data);
    socket.to(room).emit('draw', data);
  });

  // --- Clear Canvas ---
  socket.on('clear', ({ room }) => {
    canvasHistory[room] = [];
    socket.to(room).emit('clear');
  });

  // --- Disconnect ---
  socket.on('disconnect', () => {
    if (socket.currentRoom) {
      io.to(socket.currentRoom).emit('system', `<b>${userNames[socket.id] || 'Someone'}</b> disconnected`);
      delete userNames[socket.id];
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Server running on port', PORT));
