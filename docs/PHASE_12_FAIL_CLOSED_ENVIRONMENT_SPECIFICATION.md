# Phase 12 Fail-Closed Environment Specification
**Project:** Multi-School SaaS School ERP  
**Component:** `scripts/validate-env.js`  
**Classification:** Infrastructure & Security Standard  

---

## 1. The Fail-Closed Principle
In multi-tenant SaaS environments processing sensitive minor data, **security must fail closed**:
- If an environment secret is missing or default, the application **must refuse to start** rather than falling back to an insecure default.
- In production and pilot environments, wildcards in CORS, unencrypted database connections, placeholder passwords, and low-entropy cryptographic keys are treated as critical blocking errors.
- Pre-flight validation executes before container initialization and deployment promotion.

---

## 2. Multi-Profile Environment Matrix & Requirements

| Variable | Development | Test | Pilot | Production |
| :--- | :--- | :--- | :--- | :--- |
| `DATABASE_URL` | Required (`postgres://*`) | Required (`ssvm_test`) | Required (Non-default credentials) | Required (PgBouncer pool URI) |
| `DATABASE_URL_AUTH` | Optional (falls back to main) | Optional | **Required** | **Required** |
| `DATABASE_URL_TRUSTED` | Optional (falls back to main) | Optional | **Required** | **Required** |
| `JWT_SECRET` | Optional / default allowed | Optional | Min 32 chars, no placeholders | Min 32 chars, entropy $\ge 3.0$ |
| `ACCESS_TOKEN_PRIVATE_KEY` | Optional | Optional | Optional | **Required (RS256 PEM)** |
| `ACCESS_TOKEN_PUBLIC_KEY` | Optional | Optional | Optional | **Required (RS256 PEM)** |
| `FIELD_ENCRYPTION_KEY` | Optional | Optional | **64 Hex Chars (AES-256)** | **64 Hex Chars (AES-256)** |
| `REDIS_URL` | Optional | Required | **Required** | **Required** |
| `FRONTEND_URL` | Optional (`localhost:3000`) | Optional | Non-wildcard HTTPS/HTTP | **HTTPS Only, No Wildcards** |
| `COOKIE_SECURE` | Optional (`false`) | Optional (`false`) | `true` | **`true` (Strict HTTPS)** |
| `UPLOAD_DIR` | Local folder | Local folder | Persistent storage (no `/tmp`) | Persistent storage (no `/tmp`) |
| `BACKUP_RETENTION_DAYS` | Optional | Optional | $\ge 7$ Days | $\ge 7$ Days |
| `RAZORPAY_KEY_ID` | Optional (`rzp_test_*`) | Optional (`rzp_test_*`) | `rzp_test_*` or `rzp_live_*` | **`rzp_live_*` Only** |

---

## 3. Secret Masking & Entropy Enforcement

### 3.1 Masking Standard
To avoid leaking secrets into CI/CD logs, container outputs, or incident tickets, `scripts/validate-env.js` strictly masks all sensitive values:
- Values $\le 8$ characters: completely masked as `********`.
- Values $> 8$ characters: formatted as `abc...xyz (len: 64)`.

### 3.2 Entropy Calculation Formula
Shannon entropy is calculated across character frequencies:
$$H(X) = -\sum_{i=1}^{n} P(x_i) \log_2 P(x_i)$$
Values with $H(X) < 3.0$ (such as repeating character sequences or dictionary words) are rejected in production.

---

## 4. CI/CD Integration Example
Add as the first step in deployment pipelines:
```yaml
- name: Validate Environment Secrets
  run: |
    node scripts/validate-env.js --profile=production --env-file=.env.production
```

