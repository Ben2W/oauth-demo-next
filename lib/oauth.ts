import { z } from "zod";
import CryptoJS from "crypto-js";
import { nanoid } from "nanoid";

// Schema for environment variables
export const envSchema = z.object({
  FAPI_URL: z.string().url(),
  CLIENT_ID: z.string().min(1),
  CLIENT_SECRET: z.string().min(1),
  REDIRECT_URI: z.string().url(),
});

// Generate code verifier and challenge for PKCE
export function generateCodeVerifier() {
  return CryptoJS.lib.WordArray.random(32)
    .toString(CryptoJS.enc.Base64)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

export function generateCodeChallenge(verifier: string) {
  return CryptoJS.SHA256(verifier)
    .toString(CryptoJS.enc.Base64)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

// Generate state parameter
export function generateState() {
  return nanoid();
}

// Types for OAuth responses
export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
  token_type: string;
  expires_in: number;
  scope?: string;
}

export interface UserInfo {
  sub: string;
  email?: string;
  name?: string;
  picture?: string;
  [key: string]: any;
}

// OAuth flow types
export type OAuthFlow = "public" | "confidential";

// Store for tokens (using localStorage)
export const tokenStore = {
  get accessToken() {
    return localStorage.getItem("oauth_access_token") || "";
  },
  set accessToken(value: string) {
    localStorage.setItem("oauth_access_token", value);
  },
  get refreshToken() {
    return localStorage.getItem("oauth_refresh_token") || "";
  },
  set refreshToken(value: string) {
    localStorage.setItem("oauth_refresh_token", value);
  },
  get idToken() {
    return localStorage.getItem("oauth_id_token") || "";
  },
  set idToken(value: string) {
    localStorage.setItem("oauth_id_token", value);
  },
  get codeVerifier() {
    return localStorage.getItem("oauth_code_verifier") || "";
  },
  set codeVerifier(value: string) {
    localStorage.setItem("oauth_code_verifier", value);
  },
  get state() {
    return localStorage.getItem("oauth_state") || "";
  },
  set state(value: string) {
    localStorage.setItem("oauth_state", value);
  },
  get flow() {
    return (localStorage.getItem("oauth_flow") || "public") as OAuthFlow;
  },
  set flow(value: OAuthFlow) {
    localStorage.setItem("oauth_flow", value);
  },
};

// Reset token store
export function resetTokenStore() {
  localStorage.removeItem("oauth_access_token");
  localStorage.removeItem("oauth_refresh_token");
  localStorage.removeItem("oauth_id_token");
  localStorage.removeItem("oauth_code_verifier");
  localStorage.removeItem("oauth_state");
  localStorage.removeItem("oauth_flow");
}

// Generate authorization URL
export function generateAuthUrl(
  flow: OAuthFlow = "public",
  state: string,
  codeVerifier?: string,
  codeChallengeMethod?: "S256" | "plain",
  usePKCE: boolean = true
) {
  let finalCodeChallenge: string = "";
  let finalCodeVerifier: string = "";

  if (usePKCE) {
    // Use provided code verifier or generate new one
    if (codeVerifier) {
      finalCodeVerifier = codeVerifier;
      finalCodeChallenge =
        codeChallengeMethod === "plain"
          ? codeVerifier
          : generateCodeChallenge(codeVerifier);
    } else {
      finalCodeVerifier = generateCodeVerifier();
      finalCodeChallenge =
        codeChallengeMethod === "plain"
          ? finalCodeVerifier
          : generateCodeChallenge(finalCodeVerifier);
    }
  }

  // Store PKCE and state values
  tokenStore.codeVerifier = finalCodeVerifier;
  tokenStore.state = state || "";
  tokenStore.flow = flow;

  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.NEXT_PUBLIC_CLIENT_ID!,
    redirect_uri: process.env.NEXT_PUBLIC_REDIRECT_URI!,
    scope: "email profile",
  });

  // Only add PKCE parameters if enabled
  if (usePKCE) {
    params.append("code_challenge", finalCodeChallenge);
    params.append("code_challenge_method", codeChallengeMethod || "S256");
  }

  // Only add state parameter if it's provided
  if (state !== "") {
    params.append("state", state);
  }

  return `${
    process.env.NEXT_PUBLIC_FAPI_URL
  }/oauth/authorize?${params.toString()}`;
}

// Exchange code for tokens
export async function exchangeCodeForTokens(
  code: string
): Promise<TokenResponse> {
  const params = new URLSearchParams({
    client_id: process.env.NEXT_PUBLIC_CLIENT_ID!,
    code,
    code_verifier: tokenStore.codeVerifier,
    grant_type: "authorization_code",
    redirect_uri: process.env.NEXT_PUBLIC_REDIRECT_URI!,
  });

  // For confidential clients, add client secret
  if (tokenStore.flow === "confidential") {
    params.append("client_secret", process.env.NEXT_PUBLIC_CLIENT_SECRET!);
  }

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_FAPI_URL}/oauth/token`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    }
  );

  if (!response.ok) {
    throw new Error("Failed to exchange code for tokens");
  }

  const data = await response.json();

  // Store tokens
  tokenStore.accessToken = data.access_token;
  tokenStore.refreshToken = data.refresh_token;
  tokenStore.idToken = data.id_token;

  return data;
}

// Refresh access token
export async function refreshAccessToken(): Promise<TokenResponse> {
  if (!tokenStore.refreshToken) {
    throw new Error("No refresh token available");
  }

  const params = new URLSearchParams({
    client_id: process.env.NEXT_PUBLIC_CLIENT_ID!,
    refresh_token: tokenStore.refreshToken,
    grant_type: "refresh_token",
  });

  // For confidential clients, add client secret
  if (tokenStore.flow === "confidential") {
    params.append("client_secret", process.env.NEXT_PUBLIC_CLIENT_SECRET!);
  }

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_FAPI_URL}/oauth/token`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    }
  );

  if (!response.ok) {
    throw new Error("Failed to refresh token");
  }

  const data = await response.json();

  // Update stored tokens
  tokenStore.accessToken = data.access_token;
  tokenStore.refreshToken = data.refresh_token;
  tokenStore.idToken = data.id_token;

  return data;
}

// Get user info
export async function getUserInfo(): Promise<UserInfo> {
  if (!tokenStore.accessToken) {
    throw new Error("No access token available");
  }

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_FAPI_URL}/oauth/userinfo`,
    {
      headers: {
        Authorization: `Bearer ${tokenStore.accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to get user info");
  }

  return response.json();
}

// Client credentials flow
export async function getClientCredentialsToken(): Promise<TokenResponse> {
  const params = new URLSearchParams({
    client_id: process.env.NEXT_PUBLIC_CLIENT_ID!,
    client_secret: process.env.NEXT_PUBLIC_CLIENT_SECRET!,
    grant_type: "client_credentials",
    scope: "email profile",
  });

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_FAPI_URL}/oauth/token`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    }
  );

  if (!response.ok) {
    throw new Error("Failed to get client credentials token");
  }

  const data = await response.json();

  // Store access token
  tokenStore.accessToken = data.access_token;
  tokenStore.flow = "confidential";

  return data;
}
