"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

export default function LoginPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem("auth_token");
    if (token) {
      router.push("/");
    }
  }, [router]);

  const handleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        throw new Error("Invalid credentials.");
      }
      const data = await res.json();
      localStorage.setItem("auth_token", data.access_token);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) {
    return (
      <div className="page">
        <div className="shell">
          <div className="panel">
            <div className="helper">Loading…</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="shell">
        <div className="header">
          <div>
            <div className="title">Sign in</div>
            <div className="subtitle">Invite-only access for Storyline merge.</div>
          </div>
          <Link className="button secondary" href="/">
            Back to merge
          </Link>
        </div>

        <div className="panel login-panel">
          <div className="stack">
            <div>
              <div className="label">Email</div>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <div>
              <div className="label">Password</div>
              <input
                className="input"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
              />
            </div>
            <button className="button" onClick={handleLogin} disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </button>
            {error ? <div className="error">{error}</div> : null}
            <div className="helper">
              This tool is invite-only. Contact the admin for access.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
