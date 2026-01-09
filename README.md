# Couponify

Monorepo hosting an Expo + React Native client and a Node + Express backend aggregating public coupon/deal sources.

## Setup

```bash
npm install
cp server/.env.example server/.env
```

## Running (development)

Start the backend and client in separate terminals:

```bash
cd server
npm run dev
```

```bash
npx expo start -c
```

Set up the Expo app’s API target once per machine:

```bash
npm run set:dev-ip
```

That overwrites `client/.env` with `EXPO_PUBLIC_API_BASE_URL=http://<your-lan-ip>:4000`. The app logs `[api] baseUrl ...` on launch. You must keep your backend running on port 4000 locally so Expo can reach it (no default to localhost on devices).

## Expo runtime troubleshooting

If you hit Hermes errors or Metro reports `main` isn’t registered, run `npm run rebuild:expo` from `client/` and then restart Expo via `npx expo start -c`. Follow the detailed guidance in `client/README_DEV_FIXES.md` to kill stray Metro servers and keep SDK 49 packages aligned.

## Environment

- `server/.env` (copy from `server/.env.example`) configures provider feeds and admin tokens.
- Use `EXPO_PUBLIC_API_URL` (prefixed with `EXPO_PUBLIC_` so Expo picks it up) when pointing the client at a remote server.

## Verification checklist
1. `npm run dev:server` starts the Express API with SQLite, ingestion worker, and `/health`.
2. `npm run dev:client` kicks off the Expo app that respects the configured API base URL.
3. The Home feed shows cards, the For You tab refreshes at the new server URL, and trending stores scroll horizontally.
4. The Detail screen exposes verify/report actions; copies trigger server metrics.
5. The Submit screen posts through `/api/submissions`; you can confirm entries in SQLite.
6. Notification preferences, daily digest scheduling, and watchlist alerts react to backend data changes.
