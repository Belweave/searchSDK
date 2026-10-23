# Expo application example

Copy `App.tsx` into an existing Expo SDK 55–57 TypeScript application's root
component (or use it as a screen). Install the SDK and its matching React Native
peer as described in the package README. Expo Router projects can import this
screen from a route. No Metro configuration changes or native config plugin are
required by this adapter. Native iOS/Android execution needs an Expo development
or production build with the React Native peer's native module autolinked; stock
Expo Go cannot load that module. Use your application's existing EAS build setup
or `npx expo run:ios` / `npx expo run:android` after installing the peers.

Replace the placeholder HTTPS endpoint with an application-owned gateway that
implements searchSDK protocol v1. Run it from your existing session/auth context:

```tsx
<App endpoint="https://your-app.example/api/search" getAccessToken={session.getAccessToken} />
```

The optional callback is intentionally supplied by your application: the SDK does
not implement sign-in, store tokens, or accept search-provider credentials. An
unauthenticated gateway can omit the callback. Keep the callback stable (for
example, with `useCallback`) so the screen can reuse the client. Buttons explicitly
start and cancel searches; unmounting cancels the active operation. The UI guards
against an older request overwriting a newer request's results.

Use `npx expo start --dev-client` with your native development build, or
`npx expo start --web` for web.
This repository's deterministic package tests do not run this screen in a native
Expo runtime. Web gateways must allow your app origin and preflight headers,
including `Content-Type`, `Authorization`, and the response protocol header.
