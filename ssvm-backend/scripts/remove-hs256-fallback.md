# HS256 Fallback Removal Checklist

Once Prometheus metrics (`ssvm_jwt_verification_algorithm{algorithm="HS256"}`) show `0` verifications for 3 consecutive days, it is safe to remove the HS256 fallback logic.

## Steps

1. In `src/lib/tokens.ts`, locate `verifyAccessToken`.
2. Remove the fallback block inside the `catch` statement.

```diff
 export function verifyAccessToken(token: string): AccessTokenPayload | null {
   const env = getEnv();
   try {
     const payload = jwt.verify(token, env.ACCESS_TOKEN_PUBLIC_KEY, { algorithms: ["RS256"] }) as AccessTokenPayload;
     if (payload.type !== "access") return null;
     jwtVerificationTotal.labels({ algorithm: "RS256" }).inc();
     return payload;
   } catch (error) {
-    if (error instanceof jwt.JsonWebTokenError && env.ACCESS_TOKEN_SECRET) {
-      try {
-        const payload = jwt.verify(token, env.ACCESS_TOKEN_SECRET, { algorithms: ["HS256"] }) as AccessTokenPayload;
-        if (payload.type !== "access") return null;
-        jwtVerificationTotal.labels({ algorithm: "HS256" }).inc();
-        return payload;
-      } catch {
-        return null;
-      }
-    }
     return null;
   }
 }
```

3. In `src/lib/tokens.ts`, locate `isTokenExpiredError`.
4. Remove the fallback block inside the `catch` statement.

```diff
 export function isTokenExpiredError(token: string): boolean {
   const env = getEnv();
   try {
     jwt.verify(token, env.ACCESS_TOKEN_PUBLIC_KEY, { algorithms: ["RS256"] });
     return false;
   } catch (err) {
     if (err instanceof jwt.TokenExpiredError) return true;
-    if (err instanceof jwt.JsonWebTokenError && env.ACCESS_TOKEN_SECRET) {
-      try {
-        jwt.verify(token, env.ACCESS_TOKEN_SECRET, { algorithms: ["HS256"] });
-        return false;
-      } catch (fallbackErr) {
-        if (fallbackErr instanceof jwt.TokenExpiredError) return true;
-        return false;
-      }
-    }
     return false;
   }
 }
```

5. In `src/lib/tokens.ts`, locate `verifyRefreshToken`.
6. Remove the fallback block inside the `catch` statement.

```diff
 export function verifyRefreshToken(token: string): RefreshTokenPayload | null {
   const env = getEnv();
   try {
     const payload = jwt.verify(token, env.REFRESH_TOKEN_PUBLIC_KEY, { algorithms: ["RS256"] }) as RefreshTokenPayload;
     if (payload.type !== "refresh") return null;
     jwtVerificationTotal.labels({ algorithm: "RS256" }).inc();
     return payload;
   } catch (error) {
-    if (error instanceof jwt.JsonWebTokenError && env.REFRESH_TOKEN_SECRET) {
-      try {
-        const payload = jwt.verify(token, env.REFRESH_TOKEN_SECRET, { algorithms: ["HS256"] }) as RefreshTokenPayload;
-        if (payload.type !== "refresh") return null;
-        jwtVerificationTotal.labels({ algorithm: "HS256" }).inc();
-        return payload;
-      } catch {
-        return null;
-      }
-    }
     return null;
   }
 }
```

7. In `src/lib/tokens.ts`, locate `verifyPendingTwoFactorToken`.
8. Remove the fallback block inside the `catch` statement.

```diff
 export function verifyPendingTwoFactorToken(token: string): PendingTwoFactorPayload | null {
   const env = getEnv();
   try {
     const payload = jwt.verify(token, env.ACCESS_TOKEN_PUBLIC_KEY, { algorithms: ["RS256"] }) as PendingTwoFactorPayload;
     if (payload.type !== "2fa_pending") return null;
     jwtVerificationTotal.labels({ algorithm: "RS256" }).inc();
     return payload;
   } catch (error) {
-    if (error instanceof jwt.JsonWebTokenError && env.ACCESS_TOKEN_SECRET) {
-      try {
-        const payload = jwt.verify(token, env.ACCESS_TOKEN_SECRET, { algorithms: ["HS256"] }) as PendingTwoFactorPayload;
-        if (payload.type !== "2fa_pending") return null;
-        jwtVerificationTotal.labels({ algorithm: "HS256" }).inc();
-        return payload;
-      } catch {
-        return null;
-      }
-    }
     return null;
   }
 }
```

9. After deploying these changes, remove `ACCESS_TOKEN_SECRET` and `REFRESH_TOKEN_SECRET` from the production `.env` configuration.
