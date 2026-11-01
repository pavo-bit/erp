# Lane D request to Lane C — cross-hostname alumni SSO

Lane D removed the localhost alumni redirect and stopped putting the access
token in the destination URL. When `NEXT_PUBLIC_ALUMNI_PORTAL_URL` points to a
different hostname or protocol, the admin portal now blocks the redirect because
the host-only HttpOnly cookie cannot be shared safely.

Please provide a short-lived, single-use SSO exchange contract for cross-hostname
portal handoff. The target portal should exchange an opaque code for its own
HttpOnly session cookie; raw access/refresh tokens must not appear in query
strings, browser storage, analytics, or referrer headers. Include expiry,
replay prevention, audience binding, and an integration test. Until then, configure
both portals on the same hostname or leave alumni handoff unavailable.
