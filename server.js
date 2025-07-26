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
  console.log('Upload request received:', { name, time, imageLength: image.length });
  console.log('GITHUB_TOKEN:', !!GITHUB_TOKEN, 'REPO:', REPO, 'BRANCH:', BRANCH);

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
    console.log('GitHub API response:', response.status, text);

    if (response.ok) {
      res.sendStatus(200);
    } else {
      res.status(500).send(text);
    }
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: err.message });
  }
});


app.get('/', (req, res) => res.send('mdzyart GitHub upload backend running!'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server running on port', PORT));
