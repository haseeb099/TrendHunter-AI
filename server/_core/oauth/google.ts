import { createHash, randomBytes } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import type { Request, Response } from "express";
import { nanoid } from "nanoid";
import { ENV } from "../env";
import { createSessionToken, setSessionCookie } from "../session";
import { createTrialFields } from "../../plans";
import { getPlatformSettings } from "../../planCatalog";
import { createUser, getUserByEmail } from "../../db";
import { normalizeEmail } from "../normalizeEmail";
import { createLogger } from "../logger";

const log = createLogger("oauth-google");

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";
const STATE_COOKIE = "google_oauth_state";

export function isGoogleOAuthConfigured(): boolean {
  return Boolean(ENV.googleClientId && ENV.googleClientSecret);
}

function getOAuthSecret() {
  if (!ENV.cookieSecret) throw new Error("JWT_SECRET is not configured");
  return new TextEncoder().encode(ENV.cookieSecret);
}

async function signOAuthState(redirect: string): Promise<string> {
  const nonce = randomBytes(16).toString("hex");
  return new SignJWT({ redirect, nonce })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("10m")
    .sign(getOAuthSecret());
}

async function verifyOAuthState(token: string): Promise<{ redirect: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getOAuthSecret());
    const redirect = payload.redirect;
    if (typeof redirect !== "string") return null;
    return { redirect };
  } catch {
    return null;
  }
}

function safeRedirect(redirect: string | undefined): string {
  if (!redirect || !redirect.startsWith("/") || redirect.startsWith("//")) {
    return "/dashboard";
  }
  return redirect;
}

export async function buildGoogleAuthUrl(redirect?: string): Promise<string | null> {
  if (!isGoogleOAuthConfigured()) return null;

  const settings = await getPlatformSettings();
  if (settings.google_login_enabled !== true) return null;

  const state = await signOAuthState(safeRedirect(redirect));
  const callbackUrl = `${ENV.appUrl}/api/auth/google/callback`;

  const params = new URLSearchParams({
    client_id: ENV.googleClientId,
    redirect_uri: callbackUrl,
    response_type: "code",
    scope: "openid email profile",
    state,
    access_type: "online",
    prompt: "select_account",
  });

  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

type GoogleTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
};

type GoogleUserInfo = {
  id: string;
  email?: string;
  verified_email?: boolean;
  name?: string;
  picture?: string;
};

async function exchangeCodeForToken(code: string): Promise<GoogleTokenResponse> {
  const callbackUrl = `${ENV.appUrl}/api/auth/google/callback`;
  const body = new URLSearchParams({
    code,
    client_id: ENV.googleClientId,
    client_secret: ENV.googleClientSecret,
    redirect_uri: callbackUrl,
    grant_type: "authorization_code",
  });

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google token exchange failed: ${res.status} ${text}`);
  }

  return (await res.json()) as GoogleTokenResponse;
}

async function fetchGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const res = await fetch(GOOGLE_USERINFO_URL, {
    headers: { authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`Google userinfo failed: ${res.status}`);
  }

  return (await res.json()) as GoogleUserInfo;
}

export async function handleGoogleCallback(req: Request, res: Response): Promise<void> {
  const settings = await getPlatformSettings();
  if (settings.google_login_enabled !== true) {
    res.redirect("/login?error=google_disabled");
    return;
  }

  if (!isGoogleOAuthConfigured()) {
    res.redirect("/login?error=google_not_configured");
    return;
  }

  const code = typeof req.query.code === "string" ? req.query.code : null;
  const state = typeof req.query.state === "string" ? req.query.state : null;
  const error = typeof req.query.error === "string" ? req.query.error : null;

  if (error) {
    log.warn("google_oauth_denied", { error });
    res.redirect("/login?error=google_denied");
    return;
  }

  if (!code || !state) {
    res.redirect("/login?error=google_invalid");
    return;
  }

  const statePayload = await verifyOAuthState(state);
  if (!statePayload) {
    res.redirect("/login?error=google_state");
    return;
  }

  try {
    const token = await exchangeCodeForToken(code);
    const profile = await fetchGoogleUserInfo(token.access_token);

    if (!profile.email || !profile.verified_email) {
      res.redirect("/login?error=google_email");
      return;
    }

    const email = normalizeEmail(profile.email);
    const now = new Date();
    let user = await getUserByEmail(email);

    if (!user) {
      if (settings.registration_enabled === false) {
        res.redirect("/register?error=registration_closed");
        return;
      }

      const openId = `google_${profile.id || nanoid()}`;
      user = await createUser({
        openId,
        email,
        name: profile.name ?? email.split("@")[0] ?? "User",
        loginMethod: "google",
        role: "user",
        planId: "trial",
        planStatus: "active",
        accountStatus: "active",
        lastSignedIn: now,
        termsAcceptedAt: now,
        privacyAcceptedAt: now,
        ...(await createTrialFields(now)),
      });

      if (!user) {
        res.redirect("/login?error=google_create_failed");
        return;
      }

      log.info("google_register", { userId: user.id, email });
    } else {
      if (user.accountStatus === "deactivated") {
        res.redirect("/login?error=account_deactivated");
        return;
      }
      log.info("google_login", { userId: user.id });
    }

    const sessionToken = await createSessionToken(user.openId, user.name ?? "");
    setSessionCookie(req, res, sessionToken);
    res.clearCookie(STATE_COOKIE);
    res.redirect(statePayload.redirect);
  } catch (err) {
    log.error("google_callback_failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    res.redirect("/login?error=google_failed");
  }
}

export async function handleGoogleStart(req: Request, res: Response): Promise<void> {
  const settings = await getPlatformSettings();
  if (settings.google_login_enabled !== true) {
    res.status(403).json({ error: "Google login is disabled" });
    return;
  }

  const redirect = safeRedirect(
    typeof req.query.redirect === "string" ? req.query.redirect : undefined
  );

  const url = await buildGoogleAuthUrl(redirect);
  if (!url) {
    res.status(503).json({ error: "Google OAuth is not configured" });
    return;
  }

  const stateToken = new URL(url).searchParams.get("state");
  if (stateToken) {
    res.cookie(STATE_COOKIE, createHash("sha256").update(stateToken).digest("hex"), {
      httpOnly: true,
      secure: ENV.isProduction,
      sameSite: "lax",
      maxAge: 10 * 60 * 1000,
    });
  }

  res.redirect(url);
}
