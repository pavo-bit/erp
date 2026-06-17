# Cloudflare Edge Configuration for SSVM

This document details the configuration required at the Cloudflare edge layer to protect the public, unauthenticated lead-capture and registration endpoints of SSVM.

## 1. DNS & Proxying
Ensure that both your SaaS landing domain and the API domain are proxied through Cloudflare (orange cloud icon in the DNS settings). This is required for WAF and Bot Fight Mode to intercept traffic.

## 2. Bot Fight Mode
Enable "Bot Fight Mode" or "Super Bot Fight Mode" in the **Security > Bots** section of your Cloudflare dashboard. This automatically challenges or blocks traffic from known bots before it reaches the backend.

## 3. Web Application Firewall (WAF) Rate Limiting
Layer these rate limits at the edge. They are deliberately set higher than the backend rate limits to act as a secondary defense layer, preventing excessive load from reaching the origin servers.

In **Security > WAF > Rate Limiting Rules**, create the following rules:

### Rule 1: Admissions Lead Capture
- **Rule Name:** Limit Admissions Apply
- **If request matches:** 
  - `URI Path` equals `/api/admissions/apply`
  - `Method` equals `POST`
- **Action:** Block or Challenge (Managed Challenge)
- **Rate Limit:** 10 requests
- **Period:** 1 hour
- **Counting characteristics:** `IP address`

### Rule 2: SaaS Registration Request
- **Rule Name:** Limit SaaS Request
- **If request matches:** 
  - `URI Path` equals `/api/v1/saas/request`
  - `Method` equals `POST`
- **Action:** Block or Challenge (Managed Challenge)
- **Rate Limit:** 6 requests
- **Period:** 1 hour
- **Counting characteristics:** `IP address`

### Rule 3: Alumni Registration
- **Rule Name:** Limit Alumni Registration
- **If request matches:** 
  - `URI Path` equals `/api/auth/alumni/register`
  - `Method` equals `POST`
- **Action:** Block or Challenge (Managed Challenge)
- **Rate Limit:** 10 requests
- **Period:** 1 hour
- **Counting characteristics:** `IP address`

## 4. Cache Bypass Page Rules
To ensure dynamic API requests are never cached by Cloudflare, create a Page Rule in **Rules > Page Rules**:

- **URL:** `*your-api-domain.com/api/*`
- **Setting:** `Cache Level` -> `Bypass`
- **Setting:** `Disable Security` -> `Off` (Important: We still want WAF and Bot Fight Mode on these routes)

## 5. Turnstile Integration
Create a Turnstile site in **Turnstile** on the Cloudflare dashboard.
- Set the domains to match your front-end apps.
- Take note of the **Site Key** (used on the frontend widget).
- Take note of the **Secret Key** and add it to the SSVM backend's `.env` (or AWS Secrets Manager) as `TURNSTILE_SECRET_KEY`.

### Frontend Integration Note
On the 9 frontend apps, you must include the Cloudflare Turnstile widget on the Admissions, SaaS Registration, and Alumni Registration forms. The widget must successfully generate a token which is then submitted in the JSON payload as `turnstileToken`.

Example Frontend implementation:
```html
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
<form id="admissions-form">
  <!-- Other fields -->
  <div class="cf-turnstile" data-sitekey="<YOUR_SITE_KEY>" data-callback="onTurnstileSuccess"></div>
  <input type="hidden" name="turnstileToken" id="turnstileToken">
  
  <!-- Honeypot Field (must remain invisible via CSS) -->
  <input type="text" name="honeypot" id="honeypot" style="display:none;" tabindex="-1" autocomplete="off">
  
  <button type="submit">Submit</button>
</form>
```
