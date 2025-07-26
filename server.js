const express = require('express');
const fetch = require('node-fetch'); // npm install node-fetch@2
const cors = require('cors');

const app = express();

app.use(cors({
  origin: [
    'https://dogebunz.github.io', // your frontend
    'http://localhost:3000'
  ],
  methods: ['GET', 'POST'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));

const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // Set this in your Render/Railway env vars
const REPO = 'dogebunz/mdzyart'; // CHANGE THIS
const BRANCH = 'main'; // or 'master' or your branch

app.post('/upload', async (req, res) => {
  const { image, name, time } = req.body;
  if (!image || !name) return res.status(400).send('Missing data');

  // Extract base64 from data URL
  const base64 = image.split(',')[1];
  const safeName = name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const filename = `gallery/${Date.now()}_${safeName}.png`;

  // Prepare GitHub API request
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

  if (response.ok) {
    res.sendStatus(200);
  } else {
    const error = await response.json();
    res.status(500).json(error);
  }
});

app.get('/', (req, res) => res.send('mdzyart GitHub upload backend running!'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server running on port', PORT));
