# Database Setup — fixing login/signup

## What broke

Login and signup returned `503 Database not connected` (and Google sign-in returned a
confusing `500`) because **there was no reachable database**:

- The original Atlas cluster `cluster0.qswsvxl.mongodb.net` **no longer exists** — its DNS
  does not resolve. Free-tier M0 clusters are paused after ~60 days idle and eventually deleted.
- `server.js` silently fell back to `mongodb://localhost:27017/finance` when `MONGO_URI` was
  unset. On Render that means "look for MongoDB inside this container", where none runs — so
  the API reported healthy while every database route failed.

The auth code itself was fine. It had nothing to connect to.

---

## Part 1 — Local development (Docker)

MongoDB runs in a container. Nothing to install beyond Docker Desktop.

Start it (Docker Desktop must be running):

```bash
docker run -d --name finance-mongo -p 27017:27017 -v finance-mongo-data:/data/db --restart unless-stopped mongo:7
```

`backend/.env` already points at `mongodb://localhost:27017/finance`, so no config change is needed.

Then start the backend:

```bash
npm --prefix backend start
```

You should see `✅ MongoDB connected`. Confirm with:

```bash
curl http://localhost:5000/api/health
```

A healthy response is `200` with `"database":"connected"`. A `503` means it still cannot connect.

Useful container commands:

```bash
docker start finance-mongo
docker stop finance-mongo
docker logs finance-mongo
```

Data persists in the `finance-mongo-data` volume across restarts.

---

## Part 2 — Deployed site (Atlas + Render)

Docker only fixes local. The deployed backend needs hosted MongoDB.

### 2a. Create a free Atlas cluster

1. Sign up at https://www.mongodb.com/cloud/atlas/register
2. **Create a free M0 cluster** — pick a region near your Render region
3. **Database Access** → Add New Database User
   - Username and a **newly generated password** (do not reuse the old one, see Security below)
   - Role: `Read and write to any database`
4. **Network Access** → Add IP Address → **Allow access from anywhere (`0.0.0.0/0`)`**
   - Render's free tier uses dynamic egress IPs, so a narrow allowlist will intermittently fail
5. **Connect** → **Drivers** → copy the connection string. It looks like:

   ```
   mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

   Replace `<password>` with the real password, and insert the database name before the `?`:

   ```
   mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/finance?retryWrites=true&w=majority
   ```

   Without `/finance` Mongo writes to the `test` database.

   If the password contains `@ : / ? # [ ] %`, URL-encode it or the string will not parse.

### 2b. Set the environment variables on Render

Render dashboard → your service → **Environment** → add/update:

| Key | Value |
|---|---|
| `MONGO_URI` | the Atlas string from above |
| `JWT_SECRET` | a fresh 64-byte random hex string (see below) |
| `GOOGLE_CLIENT_ID` | `557173934310-nfmuglfc61d6e46f1f6imut28nfslq2i.apps.googleusercontent.com` |
| `NODE_ENV` | `production` |

`GOOGLE_CLIENT_ID` is now **required** — Google sign-in verifies token signatures against
Google's public keys and refuses to run without it. It must match `VITE_GOOGLE_CLIENT_ID`
in `finance/.env`.

Generate a real JWT secret:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Then **Manual Deploy → Clear build cache & deploy**.

### 2c. Verify

```bash
curl https://finance-tracker-ai-dashboard.onrender.com/api/health
```

Expected: `200` with `"database":"connected"` and `"mongoUriConfigured":true`.

If it returns 503, check the Render logs — the server now prints the specific cause
(dead hostname, rejected credentials, or IP allowlist) rather than a generic failure.

---

## Security — please action these

1. **Old Atlas credentials are in git history.** Commit `0e1cbc8` contains
   `mongodb+srv://hharshil1912:1912005@cluster0.qswsvxl.mongodb.net/...` and a real
   `JWT_SECRET`. The cluster is gone, but **never reuse that password**. Removing it from
   history requires a rewrite (`git filter-repo`) and a force push.

2. **Rotate `JWT_SECRET`.** The current local value is the placeholder
   `your_super_secret_jwt_key_change_this_in_production_12345`. Anyone who knows it can mint
   valid session tokens for any account. Changing it logs everyone out, which is fine.

3. **Google sign-in previously accepted forged tokens.** The old code used `jwt.decode()`,
   which reads a token's payload without verifying its signature — so any client could claim
   any email address and receive a valid session. Now fixed via `verifyIdToken`. If the site
   was publicly reachable with a working database at any point, treat existing Google-provider
   accounts as untrusted.

4. **`.env` holds live third-party keys** (Cohere, OpenAI, Twilio, a Gmail app password).
   These are correctly gitignored. Do not share the project *folder* — share a git clone.
