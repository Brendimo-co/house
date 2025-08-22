/**
 * ==== CONFIG (edit these) ====
 * GAS_ENDPOINT: Apps Script Web App deployment URL (must end with /exec)
 * SHARED_SECRET: same random string here and in Code.gs
 * USER_EMAIL: optional for now; later will be set from Google Sign-In
 */
const GAS_ENDPOINT  = "https://script.google.com/macros/s/AKfycbxr7wJQr05wJ_hpu2RLNJSWX_PuNDgLOXGgoSeW4e5NUcHd2ErcE_3PZ7Wgtj1VLlFqMw/exec"; // <-- replace
const SHARED_SECRET = "change_me_please"; // <-- replace with a long random string
const USER_EMAIL    = "";                 // e.g., "pm@yourcompany.az" (optional)
const CLIENT_VERSION = "cost-v2.2.0";
