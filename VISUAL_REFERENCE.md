# OAuth 2.0 PKCE Migration - Visual Reference

## Directory Structure

```
/workspaces/pacha/
├── api/                                    (NEW)
│   ├── auth/
│   │   ├── exchange-token.ts              (NEW) - Token exchange API
│   │   └── logout.ts                      (NEW) - Session clear API
│   ├── ws/
│   │   └── otp.ts                         (NEW) - OTP URL generation
│   └── accounts.ts                        (NEW) - Test accounts endpoint
│
├── src/
│   ├── utils/
│   │   └── pkce.ts                        (NEW) - PKCE utilities
│   │
│   ├── lib/
│   │   ├── auth.ts                        (NEW) - OAuth flow
│   │   └── ws.ts                          (NEW) - WebSocket helpers
│   │
│   ├── components/
│   │   ├── AuthButtons.tsx                (NEW) - Login/Signup
│   │   └── UserStatus.tsx                 (NEW) - Auth UI
│   │
│   ├── pages/
│   │   ├── callback/
│   │   │   └── callback-page.tsx          (UPDATED) - OAuth handler
│   │   └── AuthPage.tsx                   (NEW) - Test page
│   │
│   └── app/
│       └── App.tsx                        (UPDATED) - Added /auth route
│
├── vercel.json                            (UPDATED) - API routes config
├── tsconfig.json                          (UPDATED) - Node types
├── package.json                           (UPDATED) - Dependencies
│
├── QUICKSTART.md                          (NEW) - 5-min setup
├── OAUTH_README.md                        (NEW) - Quick reference
├── DEPLOYMENT_GUIDE.md                    (NEW) - Complete guide
├── QA_CHECKLIST.md                        (NEW) - Testing checklist
├── IMPLEMENTATION_SUMMARY.md              (NEW) - Full overview
└── FILE_MANIFEST.md                       (NEW) - This file

[Legacy files unchanged]
```

---

## OAuth 2.0 Flow Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                        STEP 1: LOGIN INITIATION                       │
└──────────────────────────────────────────────────────────────────────┘

User clicks "Login" button
    ↓
Frontend: generateRandomString() → code_verifier
Frontend: createCodeChallenge(verifier) → code_challenge (S256)
Frontend: createState() → random_state
Frontend: sessionStorage.setItem('pkce_code_verifier', verifier)
Frontend: sessionStorage.setItem('pkce_state', state)
    ↓
Redirect to:
https://auth.deriv.com/oauth2/auth?
  response_type=code
  client_id=32LTHOWJyXh0f3E6uTNFP
  redirect_uri=https://extradollarhub.site
  scope=trade
  state=<random_state>
  code_challenge=<S256_hash>
  code_challenge_method=S256

┌──────────────────────────────────────────────────────────────────────┐
│                   STEP 2: USER AUTHORIZATION                          │
└──────────────────────────────────────────────────────────────────────┘

User logs in to Deriv
User grants permission to "trade" scope
    ↓
Deriv redirects to:
https://extradollarhub.site/callback?
  code=<authorization_code>
  state=<same_state>

┌──────────────────────────────────────────────────────────────────────┐
│                  STEP 3: CALLBACK PROCESSING                          │
└──────────────────────────────────────────────────────────────────────┘

Frontend (callback-page.tsx) receives URL parameters
    ↓
handleCallback() function:
    1. Extract code, state, error from URL
    2. Check if error parameter exists
       → if yes: show error message and return
    3. Read sessionStorage.pkce_state
    4. Compare URL state === stored state
       → if mismatch: return error
    5. Read sessionStorage.pkce_code_verifier
       → if missing: return error
    ↓
    6. POST /api/auth/exchange-token:
       {
         code: <authorization_code>,
         code_verifier: <from_sessionStorage>,
         redirect_uri: "https://extradollarhub.site"
       }

┌──────────────────────────────────────────────────────────────────────┐
│              STEP 4: BACKEND TOKEN EXCHANGE                           │
└──────────────────────────────────────────────────────────────────────┘

Backend (api/auth/exchange-token.ts) receives request:
    ↓
    1. Validate body parameters (code, code_verifier, redirect_uri)
    2. Build request to Deriv token endpoint:
       
       POST https://auth.deriv.com/oauth2/token
       Content-Type: application/x-www-form-urlencoded
       
       grant_type=authorization_code
       client_id=32LTHOWJyXh0f3E6uTNFP
       code=<from_request_body>
       code_verifier=<from_request_body>
       redirect_uri=https://extradollarhub.site
    
    3. Deriv verifies:
       - authorization code is valid
       - code_challenge hash matches new code_verifier
       - client_id is registered
       - redirect_uri matches
    
    4. Deriv responds:
       {
         "access_token": "string",
         "token_type": "Bearer",
         "expires_in": 86400
       }
    
    5. Backend stores access_token in HTTP-only cookie:
       Set-Cookie: access_token=<token>; 
                   HttpOnly; 
                   Secure; 
                   SameSite=Lax; 
                   Path=/; 
                   MaxAge=86400
    
    6. Response to frontend: {"ok": true}
       (NO token in response body)

┌──────────────────────────────────────────────────────────────────────┐
│              STEP 5: SESSION ESTABLISHED                              │
└──────────────────────────────────────────────────────────────────────┘

Frontend:
    - Receives {"ok": true}
    - Clears sessionStorage (PKCE values)
    - Verifies login succeeded
    - Displays user as logged in
    - Shows logout button

Session cookie is now active in browser:
    - Automatically sent with ALL requests to same origin
    - Cannot be accessed by JavaScript (HttpOnly)
    - Only sent over HTTPS (Secure flag)

┌──────────────────────────────────────────────────────────────────────┐
│           STEP 6: AUTHENTICATED API CALLS                             │
└──────────────────────────────────────────────────────────────────────┘

Frontend needs to:
    1. Get list of accounts
    2. Generate OTP for WebSocket
    3. Connect authenticated WebSocket

For each request:

GET /api/accounts
    (cookie automatically sent)
    ↓
Backend:
    1. Read cookie → extract access_token
    2. GET https://api.derivws.com/trading/v1/options/accounts
       Headers: Authorization: Bearer <access_token>
                Deriv-App-ID: 126595
    3. Return account data to frontend

POST /api/ws/otp { accountId: "demo" }
    (cookie automatically sent)
    ↓
Backend:
    1. Read cookie → extract access_token
    2. POST https://api.derivws.com/trading/v1/options/accounts/demo/otp
       Headers: Authorization: Bearer <access_token>
                Deriv-App-ID: 126595
    3. Deriv responds: { "url": "wss://...?otp=..." }
    4. Return URL to frontend

Frontend:
    1. Receive OTP URL
    2. new WebSocket(otpUrl)
    3. WebSocket connected
    4. Send trading messages

┌──────────────────────────────────────────────────────────────────────┐
│                  STEP 7: LOGOUT                                       │
└──────────────────────────────────────────────────────────────────────┘

User clicks "Logout"
    ↓
Frontend: POST /api/auth/logout
    ↓
Backend:
    1. Set cookie with maxAge=0 (expire immediately)
       Set-Cookie: access_token=; MaxAge=0; Path=/
    2. Response: {"ok": true}
    ↓
Frontend:
    1. Clear sessionStorage
    2. Clear local state
    3. Redirect to login
    ↓
Session cleared ✓
```

---

## Security Check Points

```
┌─────────────────────────────────────────────────────────────────┐
│ POINT 1: Code Verifier Generation                               │
│ Location: src/utils/pkce.ts                                     │
│ ✅ Random 32-byte verifier                                      │
│ ✅ Stored in sessionStorage (cleared on tab close)              │
│ ✅ Never transmitted except as S256 hash                        │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ POINT 2: Code Challenge                                         │
│ Location: src/utils/pkce.ts                                     │
│ ✅ SHA256(verifier).toBase64Url()                               │
│ ✅ Sent to Deriv in initial redirect                            │
│ ✅ Cannot be reversed to get verifier                           │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ POINT 3: State Parameter                                        │
│ Location: src/utils/pkce.ts                                     │
│ ✅ Random 16-byte state                                         │
│ ✅ Stored in sessionStorage                                     │
│ ✅ Verified on callback (src/lib/auth.ts)                       │
│ ✅ Prevents CSRF attacks                                        │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ POINT 4: Code Exchange                                          │
│ Location: api/auth/exchange-token.ts                            │
│ ✅ Server-to-server only                                        │
│ ✅ Code verifier sent in request body (not URL)                 │
│ ✅ Deriv verifies code_challenge hash                           │
│ ✅ Prevents code interception attacks                           │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ POINT 5: Token Storage                                          │
│ Location: api/auth/exchange-token.ts                            │
│ ✅ HttpOnly cookie (JS cannot read)                             │
│ ✅ Secure flag (HTTPS only)                                     │
│ ✅ SameSite=Lax (CSRF protection)                               │
│ ✅ Path=/ (only root path)                                      │
│ ✅ MaxAge=expires_in (auto-expiration)                          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ POINT 6: API Authorization                                      │
│ Location: api/ws/otp.ts, api/accounts.ts                        │
│ ✅ Cookie-based session retrieval                               │
│ ✅ Authorization header sent to Deriv                           │
│ ✅ Returns 401 if token missing/expired                         │
│ ✅ Deriv-App-ID header sent (malicious requests filtered)       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Component Dependencies

```
AuthPage (src/pages/AuthPage.tsx)
    ↓
UserStatus (src/components/UserStatus.tsx)
    ├── AuthButtons (src/components/AuthButtons.tsx)
    │   ├── startLogin() [src/lib/auth.ts]
    │   └── startSignup() [src/lib/auth.ts]
    │
    ├── fetch('/api/accounts') [REST API]
    │
    ├── fetch('/api/auth/logout') [REST API]
    │
    └── WebSocket (src/lib/ws.ts)
        ├── getAuthenticatedWSUrl() [REST API]
        │   └── fetch('/api/ws/otp')
        │
        └── connectAuthenticatedWS()
            └── new WebSocket(otpUrl)

OAuth Flow Entry: startLogin() [src/lib/auth.ts]
    ├── buildAuthUrl()
    ├── createCodeVerifier() [src/utils/pkce.ts]
    ├── createCodeChallenge() [src/utils/pkce.ts]
    ├── createState() [src/utils/pkce.ts]
    └── window.location.href = auth_url

OAuth Callback Entry: /callback [src/pages/callback/callback-page.tsx]
    └── handleCallback() [src/lib/auth.ts]
        └── fetch('/api/auth/exchange-token')
```

---

## API Endpoint Summary

```
┌────────────────────────────────────────────────────────────────┐
│ POST /api/auth/exchange-token                                  │
├────────────────────────────────────────────────────────────────┤
│ Request:  { code, code_verifier, redirect_uri }                │
│ Response: { ok: true } | { error: "..." }                      │
│ Auth:     None (before login)                                  │
│ Action:   Exchange code for token, set cookie                  │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│ POST /api/ws/otp                                               │
├────────────────────────────────────────────────────────────────┤
│ Request:  { accountId: "string" }                              │
│ Response: { url: "wss://..." } | { error: "..." }              │
│ Auth:     access_token cookie                                  │
│ Action:   Generate OTP URL for WebSocket                       │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│ GET /api/accounts                                              │
├────────────────────────────────────────────────────────────────┤
│ Request:  (no body)                                            │
│ Response: { accounts: [...] } | { error: "..." }               │
│ Auth:     access_token cookie                                  │
│ Action:   List user accounts (test auth)                       │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│ POST /api/auth/logout                                          │
├────────────────────────────────────────────────────────────────┤
│ Request:  (no body)                                            │
│ Response: { ok: true }                                         │
│ Auth:     None (idempotent)                                    │
│ Action:   Clear session cookie                                 │
└────────────────────────────────────────────────────────────────┘
```

---

## Flow Diagram (Simplified)

```
User                 Frontend              Backend              Deriv
  │                     │                    │                   │
  ├─ Click Login ────→   │                    │                   │
  │                      ├─ Generate PKCE ────┤                   │
  │                      │                    │                   │
  │                      ├─ Redirect ──────────────────────────→  │
  │                      │                    │            (OAuth │
  │                      │                    │            Screen)│
  │                      │◀──────────────────────────────────────  │
  ├─ Authorize ──────────┤                    │                   │
  │                      │                    │                   │
  │                      ├─ Callback: code ──→                    │
  │                      │                    │                   │
  │                      │                    ├─ Exchange code ─→ │
  │                      │                    │   (with code_      │
  │                      │                    │    verifier)       │
  │                      │                    │◀─ access_token ──  │
  │                      │                    │                   │
  │                      │◀─ Set Cookie ──────┤                   │
  │                      │ (access_token)     │                   │
  │                      │                    │                   │
  │ Set Login Status ←┬──┤                    │                   │
  │                  │                       │                   │
  │ Show Logout ──→  └─ Session Active       │                   │
  │
  ├─ Get Accounts ────→  │ ─ Fetch data ─────→ API call ────────→ │
  │                      │◀─ Return ─────────────────────────────  │
  ├─ Get OTP ───────→    │ ─ Post request ──→ Generate OTP ──────→ │
  │                      │◀─ OTP URL ────────────────────────────  │
  │
  ├─ Connect WS ──────→  │ ─ WebSocket ──────────────────────────→ │
  │                      │◀─ Connected ─────────────────────────── │
  │
  ├─ Trading ─────────→  │ ─ Send/Receive ────────────────────────→ │
  │ Messages            │◀─ Responses ──────────────────────────── │
  │
  ├─ Click Logout ────→  │                    │                   │
  │                      ├─ Call logout ─────→ Clear Cookie       │
  │                      │◀─ Success ───────────                  │
  │ Set Logout Status ←──┤                    │                   │
```

---

## Decision Tree for Troubleshooting

```
Login not working?
├─ URL has code=... & state=... ?
│  ├─ Yes: Check /callback page for errors
│  │   ├─ JavaScript console errors?
│  │   │  ├─ Yes: Debug in browser DevTools
│  │   │  └─ No: Check Vercel function logs
│  │   └─ State error? → sessionStorage may be cleared
│  │
│  └─ No: OAuth not redirecting
│     ├─ REDIRECT_URI mismatch? → Check env var
│     └─ Click "Login" again
│
Can't access /api/accounts?
├─ Cookie visible in DevTools? 
│  ├─ Yes: Cookie might be expired
│  │   └─ Re-login
│  └─ No: Backend didn't set cookie
│     ├─ Log into /api/auth/exchange-token
│     └─ Check Vercel function logs
│
WebSocket not connecting?
├─ OTP URL provided?
│  ├─ Yes: Try connecting in console
│  └─ No: Backend returned error
│     ├─ Check console error message
│     └─ Verify account ID correct
│
Everything broken?
└─ Environment variables set? → Redeploy
   ├─ Vercel dashboard env vars correct?
   └─ git push && wait for new build
```

---

**Last Updated**: May 11, 2026  
**Version**: 1.0  
**Status**: Production Ready ✅
