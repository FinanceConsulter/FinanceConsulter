// Global 401 handling: when the backend rejects the stored token (expired / invalid),
// drop it and reload so the app falls back to the login screen.
// Installed once from index.js; wraps window.fetch and the default axios instance.
import axios from 'axios';
import { API_URL } from './api';

const TOKEN_KEY = 'authToken';
const RELOAD_GUARD_KEY = 'fc:authReloadAt';
const RELOAD_GUARD_MS = 10000;

let installed = false;
let handlingUnauthorized = false;

// Path of `url` relative to API_URL, or null if the request does not go to our API
function apiPathOf(url) {
  if (!url) return null;
  try {
    const base = new URL(API_URL, window.location.href);
    const target = new URL(url, window.location.href);
    const basePath = base.pathname.replace(/\/+$/, '');
    if (target.origin !== base.origin) return null;
    if (target.pathname !== basePath && !target.pathname.startsWith(`${basePath}/`)) return null;
    return target.pathname.slice(basePath.length) || '/';
  } catch {
    return null;
  }
}

function urlOfFetchInput(input) {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  return input?.url || '';
}

function handleUnauthorized(url) {
  if (handlingUnauthorized) return;

  const path = apiPathOf(url);
  // A failed login is a normal 401 ("Invalid Credentials"), not an expired session
  if (path === null || path.replace(/\/+$/, '') === '/login') return;

  try {
    if (!localStorage.getItem(TOKEN_KEY)) return;
    handlingUnauthorized = true;
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    return;
  }

  // Guard against reload loops: at most one forced reload per RELOAD_GUARD_MS
  try {
    const lastReload = Number(sessionStorage.getItem(RELOAD_GUARD_KEY) || 0);
    if (Date.now() - lastReload < RELOAD_GUARD_MS) {
      handlingUnauthorized = false;
      return;
    }
    sessionStorage.setItem(RELOAD_GUARD_KEY, String(Date.now()));
  } catch {
    // sessionStorage unavailable: the token is already removed, so a reload cannot loop
  }

  window.location.reload();
}

export function installAuthInterceptor() {
  if (installed || typeof window === 'undefined' || typeof window.fetch !== 'function') return;
  installed = true;

  const originalFetch = window.fetch.bind(window);
  window.fetch = async function fetchWithAuthCheck(input, init) {
    const response = await originalFetch(input, init);
    if (response.status === 401) {
      handleUnauthorized(urlOfFetchInput(input));
    }
    return response;
  };

  axios.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error?.response?.status === 401) {
        let url = error.config?.url || '';
        try {
          if (error.config) url = axios.getUri(error.config);
        } catch {
          // keep config.url
        }
        handleUnauthorized(url);
      }
      return Promise.reject(error);
    }
  );
}

installAuthInterceptor();
