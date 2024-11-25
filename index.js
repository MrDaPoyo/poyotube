const express = require('express');
const multer = require('multer');
var db = require('./db');

const app = express();
const port = 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.set('views', './views');

var multerStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './content/videos');
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
});

const upload = multer({
    storage: multerStorage,
    fileFilter: function (req, file, cb) {
        // Reject files with non-POSIX names
        if (/[^a-zA-Z0-9._-]/.test(file.originalname)) {
            return cb(new Error('Invalid file name'));
        }
        cb(null, true);
    }
});

// Routes
app.get('/', async (req, res) => {
    res.render('index', {title: "The Video Platform Made For You!", videos: await db.getAllVideos()});
});

app.get('/player', (req, res) => {
    // Logic to fetch and return a list of videos
    res.send('List of videos');
});

app.get('/player/:id', (req, res) => {
    const videoId = req.params.id;
    // Logic to fetch and return a specific video by ID
    res.send(`Video with ID: ${videoId}`);
});

app.post('/upload', upload.single('video'), (req, res) => {
    // Logic to handle video upload
    res.send('Video uploaded');
});

app.listen(port, () => {
    console.log(`PoyoTube listening at http://localhost:${port}`);
});