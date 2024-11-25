const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./poyotube.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) {
        console.error(err.message);
    }
});

function setupDB() {
    // Create users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    verified BOOLEAN DEFAULT FALSE,
    admin INTEGER NOT NULL DEFAULT 0)`);

    db.run(`CREATE TABLE IF NOT EXISTS videos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,  -- Unique ID for each file
            fileName TEXT NOT NULL,                -- Name of the file
            fileLocation TEXT NOT NULL,            -- Location (path) where the file is stored
            fileFullPath TEXT NOT NULL,
            thumbnailLocation TEXT NOT NULL,       -- Location (path) where the thumbnail is stored
            userID INTEGER NOT NULL,               -- ID of the user who uploaded the file
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,  -- Date and time when the file was created
            lastModifiedAt DATETIME DEFAULT CURRENT_TIMESTAMP, -- Last modified date of the file
            fileSize INTEGER DEFAULT 0 NOT NULL,              -- Weight (size) of the file in bytes
            fileLenght INTEGER DEFAULT 0 NOT NULL,            -- Duration of the file in seconds
            status TEXT DEFAULT 'active',			-- Status of the file (e.g., active, archived, deleted)
            statusLastModifiedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            videoTitle TEXT NOT NULL DEFAULT 'No title provided',
            videoDescription TEXT NOT NULL DEFAULT 'No description provided',
            FOREIGN KEY (userID) REFERENCES users(id))`);
}

setupDB();

function hashPassword(password) {
    return new Promise((resolve, reject) => {
        bcrypt.hash(password, 10, (err, hash) => {
            if (err) {
                reject(err);
            }
            resolve(hash);
        });
    });
}

function createUser(username, email, password) {
    const insert = `INSERT INTO users (username, email, password) VALUES (?, ?, ?)`;
    db.run(insert, [username, email, password], (err) => {
        if (err) {
            console.error(err.message);
            throw err;
        }
        console.log('A new user has been created.');
    });
}

function getUserById(userId) {
    return new Promise((resolve, reject) => {
        const query = `SELECT * FROM users WHERE id = ?`;
        db.get(query, [userId], (err, row) => {
            if (err) {
                reject(err);
            }
            resolve(row);
        });
    });
}

function getUserByEmail(email) {
    return new Promise((resolve, reject) => {
        const query = `SELECT * FROM users WHERE email = ?`;
        db.get(query, [email], (err, row) => {
            if (err) {
                reject(err);
            }
            resolve(row);
        });
    });
}

function getAllVideos() {
    return new Promise((resolve, reject) => {
        const query = `SELECT * FROM videos`;
        db.all(query, [], (err, rows) => {
            if (err) {
                reject(err);
            }
            resolve(rows);
        });
    });
}

function getVideoById(videoId) {
    return new Promise((resolve, reject) => {
        const query = `SELECT * FROM videos WHERE id = ?`;
        db.get(query, [videoId], (err, row) => {
            if (err) {
                reject(err);
            }
            resolve(row);
        });
    });
}

function getVideoThumbnailbyId(videoId) {
    return new Promise((resolve, reject) => {
        const query = `SELECT thumbnailLocation FROM videos WHERE id = ?`;
        db.get(query, [videoId], (err, row) => {
            if (err) {
                reject(err);
            }
            resolve(row);
        });
    });
}

function addVideo(fileName, fileLocation, fileFullPath, thumbnailLocation, userID, fileSize, fileLenght, videoTitle, videoDescription) {
    const insert = `INSERT INTO videos (fileName, fileLocation, fileFullPath, thumbnailLocation, userID, fileSize, fileLenght, videoTitle, videoDescription) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    db.run(insert, [fileName, fileLocation, fileFullPath, thumbnailLocation, userID, fileSize, fileLenght, videoTitle, videoDescription], (err) => {
        if (err) {
            console.error(err.message);
            throw err;
        }
        console.log('A new video has been created.');
    });
}

module.exports = { db, setupDB, createUser, getUserById, getUserByEmail, hashPassword, getAllVideos, getVideoById, getVideoThumbnailbyId, addVideo };