/**
 * ==== CONFIG (edit these) ====
 * GAS_ENDPOINT: Apps Script Web App deployment URL (must end with /exec)
 * SHARED_SECRET: same random string here and in Code.gs
 * USER_EMAIL: optional for now; later will be set from Google Sign-In
 */
const GAS_ENDPOINT  = "https://script.google.com/macros/s/AKfycbxEIVn3epig87HS6dkTCFcXD8tBRd7Za9E9OYyMtXAwnoQupiJSdj4C1HyXrS6V5-ebrQ/exec"; // <-- replace
const SHARED_SECRET = "change_me_please"; // <-- replace with a long random string
const USER_EMAIL    = "";                 // e.g., "pm@yourcompany.az" (optional)
const CLIENT_VERSION = "cost-v2.2.0";
