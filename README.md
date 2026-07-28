# English Coach

Initial technical foundation for a personal AI-assisted English-learning app. This repository contains one Expo React Native client, one Next.js API, and shared TypeScript packages. Learning content and AI features are intentionally not implemented yet.

## Architecture

- `apps/mobile` â€” Expo SDK 54, Expo Router, NativeWind, TanStack Query, Zustand, React Hook Form, and the Better Auth Expo client.
- `apps/server` â€” Next.js App Router API with Better Auth route handlers and a credential-free health endpoint.
- `packages/database` â€” lazy Neon HTTP/Drizzle client and schema entry points.
- `packages/shared` â€” small cross-platform constants and types.
- `packages/validation` â€” shared Zod authentication form schemas.

The mobile app calls the Next.js API. It must never receive `DATABASE_URL` or connect directly to Neon.

## Folder structure

```text
english-learning-app/
â”œâ”€â”€ apps/
â”‚   â”œâ”€â”€ mobile/
â”‚   â”‚   â”œâ”€â”€ app/                 # Expo Router routes
â”‚   â”‚   â”œâ”€â”€ assets/
â”‚   â”‚   â””â”€â”€ src/                 # features, components, clients, providers, state
â”‚   â””â”€â”€ server/
â”‚       â””â”€â”€ src/
â”‚           â”œâ”€â”€ app/api/auth/[...all]/
â”‚           â”œâ”€â”€ app/api/health/
â”‚           â””â”€â”€ lib/
â”œâ”€â”€ packages/
â”‚   â”œâ”€â”€ database/src/schema/
â”‚   â”œâ”€â”€ shared/src/
â”‚   â””â”€â”€ validation/src/
â”œâ”€â”€ package.json
â”œâ”€â”€ pnpm-workspace.yaml
â”œâ”€â”€ pnpm-lock.yaml
â””â”€â”€ turbo.json
```

## Prerequisites

- Node.js 20.19 or newer (Expo SDK 54 requirement)
- Corepack and pnpm 11
- Expo Go on a phone for JavaScript-only testing
- Android Studio only when using an emulator or local native Android build
- A Neon PostgreSQL connection string when database/auth work begins

Enable pnpm if necessary with `corepack enable pnpm`. If system permissions prevent that, prefix commands with `corepack`, for example `corepack pnpm install`.

## Install

```bash
pnpm install
```

There is one root `pnpm-lock.yaml`; do not run npm, Yarn, or Bun in a workspace.

## Environment setup

Copy, but do not commit, the templates:

```text
apps/server/.env.example  -> apps/server/.env.local
apps/mobile/.env.example  -> apps/mobile/.env
```

Server values:

- `DATABASE_URL`: Neon pooled PostgreSQL URL.
- `BETTER_AUTH_SECRET`: at least 32 high-entropy characters.
- `BETTER_AUTH_URL`: normally `http://localhost:3000` locally.
- `BETTER_AUTH_TRUSTED_ORIGINS`: extra comma-separated origins.
- `GROQ_API_KEY`: server-only GroqCloud key for dynamic assessments and future AI teacher/speech features.
- `GROQ_TEXT_MODEL`: defaults to `openai/gpt-oss-20b` for strict structured question generation.

Mobile has only `EXPO_PUBLIC_API_URL`; never place database credentials or private keys in an `EXPO_PUBLIC_` variable.

### Find the Windows LAN address

Run `ipconfig` in PowerShell or Command Prompt and find the active Wi-Fi adapter's `IPv4 Address`. Replace `192.168.1.100` in `apps/mobile/.env` with that address. A physical phone cannot use the Windows computer's `localhost`; the phone and computer should normally be on the same Wi-Fi network.

## Run locally

In separate terminals:

```bash
pnpm dev:server
pnpm dev:mobile
```

The API is at `http://localhost:3000`; its credential-free check is `GET /api/health`.

Other commands:

```bash
pnpm android
pnpm ios
pnpm web
pnpm lint
pnpm typecheck
pnpm format:check
```

### Android

- Expo Go: run `pnpm dev:mobile`, scan the QR code, and choose Expo Go.
- Development client: install EAS CLI if needed, then run `eas build --profile development --platform android` from `apps/mobile`. This creates a signed development build; it is not run automatically by this repository.
- Preview APK: from `apps/mobile`, run `eas build --profile preview --platform android`. The profile uses internal distribution and APK output.

### iPhone and web/PWA

- Expo Go: run `pnpm dev:mobile` and scan the QR code with the iPhone camera/Expo Go. Both devices should be on the same network.
- Web: run `pnpm web` and open the printed URL.
- PWA-oriented web testing: use the web build in Safari, then use **Share > Add to Home Screen**. Deployment and production PWA metadata are future work.
- A custom native iPhone installation generally requires Apple code signing and may require an Apple Developer membership. No iOS cloud build or credential request is part of this foundation.

## Database and Better Auth

Do not run migration commands until `DATABASE_URL` points to a valid Neon database.

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:push
pnpm db:studio
```

The auth schema file is deliberately a placeholder because no credentials were supplied. After configuring `apps/server/.env.local`, generate the schema with the installed Better Auth version:

```bash
corepack pnpm --dir apps/server dlx auth@1.6.25 generate --config src/lib/auth.ts --output ../../packages/database/src/schema/auth.ts --yes
pnpm db:generate
pnpm db:migrate
```

Review generated SQL before migration. The Better Auth schema should define user, account, session, and verification concepts.

## Physical-device connectivity troubleshooting

1. Confirm the API works on Windows at `http://localhost:3000/api/health`.
2. Confirm the phone and Windows computer are on the same Wi-Fi and not isolated by a guest network.
3. Set `EXPO_PUBLIC_API_URL=http://<windows-ipv4>:3000`, then restart Expo with a cleared cache if needed.
4. Allow private-network access for Node.js through Windows Defender Firewall.
5. Test `http://<windows-ipv4>:3000/api/health` in the phone browser.
6. Disable a VPN temporarily if it blocks LAN routing.

## Next steps

1. Add Neon and Better Auth environment values.
2. Generate and review the official Better Auth Drizzle schema.
3. Run the first database migration.
4. Complete email/password sign-in and session-aware route protection.
5. Add English-learning domain tables and features in a separate development phase.
6. Choose AI and speech-to-text providers later; no provider SDK is installed now.
