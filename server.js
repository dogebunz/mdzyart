let onlineCount = 0;

io.on('connection', (socket) => {
  onlineCount++;
  io.emit('viewerCount', onlineCount);

  socket.on('disconnect', () => {
    onlineCount = Math.max(0, onlineCount - 1);
    io.emit('viewerCount', onlineCount);
  });

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const fetch = require('node-fetch'); // npm install node-fetch@2

const app = express();

app.use(cors({
  origin: [
    'https://dogebunz.github.io',
    'http://localhost:3000'
  ],
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));

// --- GitHub Upload Config ---
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO = process.env.REPO || 'dogebunz/mdzyart'; // or set in Render env
const BRANCH = process.env.BRANCH || 'main';

// --- In-memory uploads for /gallery endpoint (optional) ---
let uploads = [];

// --- /upload endpoint: Upload drawing to GitHub gallery folder ---
app.post('/upload', async (req, res) => {
  const { image, name, time } = req.body;
  if (!image || !name) return res.status(400).send('Missing data');

  const base64 = image.split(',')[1];
  const safeName = name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const filename = `gallery/${Date.now()}_${safeName}.jpg`;

  try {
    const response = await fetch(`https://api.github.com/repos/${REPO}/contents/${filename}`, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
      },
      body: JSON.stringify({
        message: `Add drawing by ${name}`,
        content: base64,
        branch: BRANCH
      })
    });

    const text = await response.text();
    if (response.ok) {
      // Optionally, keep a local record for /gallery endpoint
      uploads.push({ image, name, time });
      res.sendStatus(200);
    } else {
      console.error('GitHub API error:', text);
      res.status(500).send(text);
    }
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: err.message });
  }
});

// --- /gallery endpoint: Return in-memory uploads (optional/testing) ---
app.get('/gallery', (req, res) => {
  res.json(uploads);
});

// --- Express root route (optional) ---
app.get('/', (req, res) => res.send('mdzyart backend running!'));

// --- Collaborative Drawing & Chat (Socket.IO) ---
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

socket.on('chat', ({ room, message, name, profilePic }) => {
  io.to(room).emit('chat', {
    id: socket.id.slice(0, 5),
    message,
    name,
    profilePic
  });
});

const fs = require('fs');
const path = require('path');
const starsFile = path.join(__dirname, 'stars.json');
let stars = {};
if (fs.existsSync(starsFile)) {
  stars = JSON.parse(fs.readFileSync(starsFile, 'utf8'));
}

// Endpoint to get all stars
app.get('/stars', (req, res) => {
  res.json(stars);
});

// Endpoint to star an artwork
app.post('/star', (req, res) => {
  const { filename } = req.body;
  if (!filename) return res.status(400).send('Missing filename');
  if (!stars[filename]) stars[filename] = 0;
  stars[filename]++;
  fs.writeFileSync(starsFile, JSON.stringify(stars, null, 2));
  res.json({ stars: stars[filename] });
});

// --- Start the server (MUST use server.listen, not app.listen) ---
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Server running on port', PORT));

});
