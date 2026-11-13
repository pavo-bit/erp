"use client";
import React, { useState } from "react";

export default function SetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const token = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("token") : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setStatus("Passwords do not match"); return; }
    try {
      const res = await fetch("/api/v1/auth/set-password", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed");
      setStatus("Password set successfully. You may now log in.");
    } catch (err) {
      setStatus((err as Error).message);
    }
  }

  return (
    <main style={{ maxWidth: 400, margin: "4rem auto", padding: "1rem" }}>
      <h1>Set Password</h1>
      <form onSubmit={submit}>
        <label htmlFor="password">New password</label>
        <input id="password" type="password" value={password} onChange={e=>setPassword(e.target.value)} required />
        <label htmlFor="confirm">Confirm password</label>
        <input id="confirm" type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} required />
        <button type="submit">Set password</button>
      </form>
      {status && <p role="status">{status}</p>}
    </main>
  );
}
