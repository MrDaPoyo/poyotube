# PoyoTube!
### What is PoyoTube?

PoyoTube! is a YouTube clone made for HighSeas.
I aim to make a simple, easy to self-host alternative to YouTube, while keeping some of its most basic functionality.

So far you can:

- Register
- Login
- Logout
- Upload Videos
- Watch Videos

### How do I set it up?

Just run `npm i` and then `apt install ffmpeg`. Finally, add this into your `.env` file:
```
URL_ENTIRE=http://localhost:80/
AUTH_SECRET=thisisatestsecret
```