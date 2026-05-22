import { config } from "./config.js";

// Wraps Google Identity Services token-flow auth + the gapi client library.
// The user is "signed in" while we have a non-expired access token.

let tokenClient = null;
let accessToken = null;
let tokenExpiresAt = 0;
let userEmail = null;
let gapiReady = false;
let gsiReady = false;

const subscribers = new Set();

function notify() {
  for (const cb of subscribers) cb(getState());
}

export function onAuthChange(cb) {
  subscribers.add(cb);
  cb(getState());
  return () => subscribers.delete(cb);
}

export function getState() {
  return {
    signedIn: !!accessToken && Date.now() < tokenExpiresAt,
    email: userEmail,
    token: accessToken,
    ready: gapiReady && gsiReady && !!config.googleClientId,
  };
}

export function getAccessToken() {
  if (!accessToken || Date.now() >= tokenExpiresAt) return null;
  return accessToken;
}

// Wait until both the gapi and GIS libraries are loaded.
async function waitForLibs() {
  await new Promise((resolve) => {
    const tick = () => {
      if (window.gapi && window.google?.accounts?.oauth2) return resolve();
      setTimeout(tick, 50);
    };
    tick();
  });
  if (!gapiReady) {
    await new Promise((resolve) =>
      window.gapi.load("client", { callback: resolve, onerror: resolve }),
    );
    await window.gapi.client.init({
      discoveryDocs: [
        "https://sheets.googleapis.com/$discovery/rest?version=v4",
        "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest",
      ],
    });
    gapiReady = true;
  }
  gsiReady = true;
}

export async function init() {
  await waitForLibs();
  if (!config.googleClientId) {
    notify();
    return;
  }
  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: config.googleClientId,
    scope: config.scopes,
    callback: (resp) => {
      if (resp.error) {
        console.error("Token error", resp);
        notify();
        return;
      }
      accessToken = resp.access_token;
      tokenExpiresAt = Date.now() + (resp.expires_in - 60) * 1000;
      window.gapi.client.setToken({ access_token: accessToken });
      fetchUserInfo().finally(notify);
    },
  });
  notify();
}

async function fetchUserInfo() {
  try {
    const r = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (r.ok) {
      const data = await r.json();
      userEmail = data.email;
    }
  } catch (e) {
    // best-effort; ignore
  }
}

export function signIn() {
  if (!tokenClient) {
    alert(
      "Add your Google OAuth Client ID in Settings before signing in.\nSee the README for setup steps.",
    );
    return;
  }
  tokenClient.requestAccessToken({ prompt: accessToken ? "" : "consent" });
}

export function signOut() {
  if (accessToken && window.google?.accounts?.oauth2) {
    window.google.accounts.oauth2.revoke(accessToken, () => {});
  }
  accessToken = null;
  tokenExpiresAt = 0;
  userEmail = null;
  window.gapi?.client?.setToken(null);
  notify();
}
