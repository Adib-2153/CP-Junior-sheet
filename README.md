# Route AC

A dependency-free static study tracker for:

- Competitive Programming Junior Sheet V5.6
- CP-31 (31 problems for every rating from 800 to 1900)
- All original problem, lesson, editorial, and solution links
- A small cross-platform practice set for AtCoder, CodeChef, and LeetCode

## Run locally

Serve this folder with any static web server and open `index.html`.

```bash
python3 -m http.server 3000
```

## Deploy

Upload the contents of this folder to any static host. There is no build step, backend, secret, or environment variable.

## Progress and Codeforces sync

- Manual progress and the saved Codeforces handle use browser `localStorage`.
- Codeforces progress is read from the public `user.info` and `user.status` APIs.
- No password or Codeforces token is requested or stored.
- If Codeforces is temporarily unavailable, every row remains manually trackable.
