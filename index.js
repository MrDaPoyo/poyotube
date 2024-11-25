const express = require('express');
const multer = require('multer');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
var db = require('./db');
require('dotenv').config();

const app = express();
const port = 3000;
const url = process.env.URL_ENTIRE;

const generalMiddleware = async (req, res, next) => {
    res.locals.url = url;
    next();
}

const loggedInMiddleware = async (req, res, next) => {
    if (req.cookies['loggedIn']) {
        jwt.verify(req.cookies['loggedIn'], process.env.AUTH_SECRET, (err, decoded) => {
            if (err) {
                res.redirect('/login');
            } else {
                res.locals.user = decoded;
                next();
            }
        });
    } else {
        res.redirect('/login');
    }
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('./public'));
app.set('view engine', 'ejs');
app.set('views', './views');
app.use(cookieParser());
app.use(generalMiddleware);

var multerStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './public/content');
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
        // Ensure the file is an mp4
        if (file.mimetype !== 'video/mp4') {
            return cb(new Error('Only mp4 files are allowed'));
        }
        cb(null, true);
    }
});

// Routes
app.get('/', async (req, res) => {
    res.render('index', {title: "The Video Platform Made For You!", videos: await db.getAllVideos()});
});

app.get('/getVideo/:id', async (req, res) => {
    var videoId = req.params.id;
    var video = await db.getVideoById(videoId);
    res.sendFile(`${await video.fileLocation}`, { root: '.' });
});

app.get('/player/:id', async (req, res) => {
    var videoId = req.params.id;
    var video = await db.getVideoById(videoId);
    // Logic to fetch and return a specific video by ID
    res.render('player', {title: "Watch!", video: await video, user: await db.getUserById(await video.userID)});
});

app.post('/upload', loggedInMiddleware, upload.single('video'), async (req, res) => {
    // Logic to handle video upload
    const fileName = req.file.originalname.split('.')[0] + '-' + Date.now() + '.mp4';
    const fileLocation = req.file.path;
    const fileFullPath = req.file.destination + '/' + req.file.filename;
    const thumbnailLocation = ''; // You can add logic to generate and save a thumbnail
    const userID = req.body.userID || 1; // Assuming userID is sent in the request body
    const fileSize = req.file.size;
    const fileLength = ''; // You can add logic to calculate the video length
    const videoTitle = req.body.videoTitle || fileName.split('.')[0];
    const videoDescription = req.body.videoDescription || 'No description provided';
    try {
        db.addVideo(fileName, fileLocation, fileFullPath, thumbnailLocation, userID, fileSize, fileLength, videoTitle, videoDescription);
        return res.render("index", {title: "The Video Platform Made For You!", videos: await db.getAllVideos()});
    } catch (error) {
        return res.status(500).send('Error adding video to the database ' + err);
    }
});

app.listen(port, () => {
    console.log(`PoyoTube listening at http://localhost:${port}`);
});