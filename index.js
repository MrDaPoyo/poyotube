const express = require('express');
const multer = require('multer');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
var db = require('./db');
const bcrypt = require('bcrypt');
require('dotenv').config();
const detectNSFW = require('./nsfw'); // Import the NSFW detection module
const generateThumbnail = require('./thumbnails'); // Thumbnail generator function
const path = require('path');
const fs = require('fs-extra');

const app = express();
const port = 3000;

const generalMiddleware = (req, res, next) => {
    const token = req.cookies.auth;
    res.locals.url = process.env.URL_ENTIRE;
    res.locals.message = req.query.message || res.locals.message || undefined;

    if (!token) {
        res.locals.loggedIn = false;
        return next();
    }

    jwt.verify(token, process.env.AUTH_SECRET, async (err, decoded) => {
        if (err) {
            res.locals.loggedIn = false;
        } else {
            var user = await db.getUserById(decoded.id);
            if (!user) {
                res.clearCookie("auth");
                return res.redirect("/?message=Invalid auth cookie");
            } else {
                res.locals.jwt = token;
                res.locals.loggedIn = true;
                res.locals.user = user;
                req.user = user;
            }
        }
        return next();
    });
};

const notLoggedInMiddleware = (req, res, next) => {
    if (res.locals.loggedIn) {
        res.redirect("/");
    } else {
        next();
    }
};

const loggedInMiddleware = (req, res, next) => {
    if (!res.locals.loggedIn) {
        res.redirect("/auth/login");
    } else {
        next();
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

app.get('/auth/login', notLoggedInMiddleware, async (req, res) => {
    res.render('login', { title: "Login" });
});

app.post('/auth/login', notLoggedInMiddleware, async (req, res) => {
    const { email, password } = req.body;
    const user = await db.getUserByEmail(email);
    if (user) {
        const match = await bcrypt.compare(password, user.password);
        if (match) {
            const token = jwt.sign({ id: user.id }, process.env.AUTH_SECRET, { expiresIn: '1h' });
            res.cookie('auth', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });
            res.redirect('/');
        } else {
            res.status(401).send('Invalid email or password');
        }
    } else {
        res.status(401).send('Invalid email or password');
    }
});

app.post('/auth/register', notLoggedInMiddleware, async (req, res) => {
    const { email, password, username } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    try {
        await db.createUser(username, email, hashedPassword);
        res.redirect('/auth/login?message=Registration successful, please login to continue');
    } catch (error) {
        res.status(500).send('Error registering user ' + error);
    }
});

app.get('/auth/logout', loggedInMiddleware, async (req, res) => {
    res.clearCookie('auth');
    res.redirect('/auth/login?message=You have been logged out');
});

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
    const videos = await db.getAllVideos();
    res.render('index', { title: "The Video Platform Made For You!", videos: await videos.reverse() });
});

app.get('/getVideo/:id', async (req, res) => {
    var videoId = req.params.id;
    var video = await db.getVideoById(videoId);
    res.sendFile(`${video.fileLocation}`, { root: '.' });
});

app.get('/player/:id', async (req, res) => {
    var videoId = req.params.id;
    var video = await db.getVideoById(videoId);
    res.render('player', { title: "Watch!", video: video, user: await db.getUserById(video.userID) });
});

app.get('/upload', loggedInMiddleware, async (req, res) => {
    res.render('upload', { title: "Upload Video" });
});
app.post('/upload', loggedInMiddleware, upload.single('video'), async (req, res) => {
    const originalName = req.file.originalname.split('.')[0];
    const timestamp = Date.now();
    const fileName = `${originalName}-${timestamp}.mp4`;
    const fileLocation = req.file.path; // Temporary location provided by Multer
    const fileFullPath = path.join(req.file.destination, fileName); // Final location
    const thumbnailDir = './public/thumbnails'; // Directory to save thumbnails
    const userID = req.user.id || 1; // Assuming userID is available
    const fileSize = req.file.size;
    const videoTitle = req.body.videoTitle || originalName || 'No title provided';
    const videoDescription = req.body.videoDescription || 'No description provided';
    const frameInterval = 5; // Analyze a frame every 5 seconds for NSFW detection
    const fileLength = 0; // Placeholder for video length

    let thumbnailLocation = '';

    try {
        // Ensure the destination directory exists
        fs.ensureDirSync(req.file.destination);

        // Rename/move the file to the final location
        fs.renameSync(fileLocation, fileFullPath);

        // Step 1: Detect NSFW Content
        console.log('Detecting NSFW content in:', fileFullPath);
        const isNSFW = await detectNSFW(fileFullPath, './frames', frameInterval);
        if (isNSFW) {
            // Delete the video if NSFW is detected
            fs.unlinkSync(fileFullPath);
            return res.status(400).send('The uploaded video contains NSFW content and was rejected.');
        }

        // Step 2: Generate Thumbnail
        console.log('Generating thumbnail for:', fileFullPath);
        thumbnailLocation = await generateThumbnail(fileFullPath, thumbnailDir);

        // Step 3: Save Video Details to Database
        console.log('Saving video details to the database...');
        await db.addVideo(fileName, fileLocation, fileFullPath, thumbnailLocation, userID, fileSize, fileLength, videoTitle, videoDescription);
        // Step 4: Render Index with All Videos
        const videos = await db.getAllVideos();
        res.render('index', {
            title: 'The Video Platform Made For You!',
            videos: videos.reverse(), // Show the latest video first
        });
    } catch (error) {
        console.error('Error processing video upload:', error);

        // Cleanup in case of errors
        if (fs.existsSync(fileFullPath)) {
            fs.unlinkSync(fileFullPath);
        }

        res.status(500).send('Error processing video upload: ' + error.message);
    }
});

app.listen(port, () => {
    console.log(`PoyoTube listening at http://localhost:${port}`);
});