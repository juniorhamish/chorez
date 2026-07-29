import { Auth0Client } from "@auth0/nextjs-auth0/server";

/**
 * Server-side Auth0 client, configured from environment variables:
 * AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET, AUTH0_SECRET, APP_BASE_URL.
 * See .env.local.example for details.
 */
export const auth0 = new Auth0Client();
