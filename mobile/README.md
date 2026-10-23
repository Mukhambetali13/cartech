# AutoMarket mobile

The Android and iOS app is built with Expo and shares its API data types with
the web app in `frontend/src/types`.

## Run locally

```sh
npm install
npm start
```

Use `a` in the Expo terminal for an Android emulator or `i` for an iOS
simulator. The backend and PostgreSQL must be running.

The default API address is `http://localhost:8080/api` on iOS Simulator and
`http://10.0.2.2:8080/api` on the Android emulator. For a physical phone, set
`EXPO_PUBLIC_API_URL` to the computer's LAN address, for example
`http://192.168.1.10:8080/api`, then restart Expo with its cache cleared.
The phone and computer must be on the same network, and the backend must be
reachable from that network.

## Included in this first mobile version

- Login and account registration for clients and mechanics.
- Secure token storage using the device keychain/Android Keystore.
- Authenticated home screen, service catalog, vehicle list, and orders list.
- Shared API request and response types from the existing web frontend.
