const express = require('express');

const app = express();
const port = 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.set('views', './views');

// Routes
app.get('/', (req, res) => {
    res.render('index', {title: "The Video Platform Made For You!", videos: []});
});

app.get('/videos', (req, res) => {
    // Logic to fetch and return a list of videos
    res.send('List of videos');
});

app.post('/upload', (req, res) => {
    // Logic to handle video upload
    res.send('Video uploaded');
});

app.get('/videos/:id', (req, res) => {
    const videoId = req.params.id;
    // Logic to fetch and return a specific video by ID
    res.send(`Video with ID: ${videoId}`);
});

app.listen(port, () => {
    console.log(`PoyoTube app listening at http://localhost:${port}`);
});