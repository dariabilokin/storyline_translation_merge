"use client";

import type { DragEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

const formatBytes = (bytes: number) => {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(1)} ${units[index]}`;
};

export default function Home() {
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [translatedFile, setTranslatedFile] = useState<File | null>(null);
  const [dragOriginal, setDragOriginal] = useState(false);
  const [dragTranslated, setDragTranslated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const originalInputRef = useRef<HTMLInputElement | null>(null);
  const translatedInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("auth_token");
    if (stored) {
      setToken(stored);
    }
  }, []);

  const canMerge = useMemo(() => originalFile && translatedFile, [originalFile, translatedFile]);

  const handleLogin = async () => {
    setError("");
    setSuccess("");
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
      setToken(data.access_token);
      setPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    setToken(null);
    setOriginalFile(null);
    setTranslatedFile(null);
    setSuccess("");
    setError("");
  };

  const selectFile = (file: File, setter: (file: File) => void) => {
    if (!file.name.toLowerCase().endsWith(".docx")) {
      setError("Please upload a .docx file.");
      return;
    }
    setError("");
    setter(file);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>, setter: (file: File) => void) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) selectFile(file, setter);
  };

  const handleMerge = async () => {
    if (!token || !originalFile || !translatedFile) return;
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const form = new FormData();
      form.append("original_file", originalFile);
      form.append("translated_file", translatedFile);

      const res = await fetch(`${API_BASE}/merge`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.detail || "Merge failed.");
      }

      const blob = await res.blob();
      const cd = res.headers.get("content-disposition") || "";
      const match = /filename="?([^"]+)"?/.exec(cd);
      const filename = match?.[1] || "merged.docx";

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setSuccess("Merged file downloaded.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Merge failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="shell">
        <div className="header">
          <div>
            <div className="title">Storyline Translation Merge</div>
            <div className="subtitle">
              Invite-only workspace to merge Storyline translation tables.
            </div>
          </div>
          {token ? (
            <button className="button secondary" onClick={handleLogout}>
              Log out
            </button>
          ) : null}
        </div>

        {!token ? (
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
        ) : (
          <div className="panel">
            <div className="drop-grid">
              <div
                className={`dropzone ${dragOriginal ? "dragging" : ""}`}
                onClick={() => originalInputRef.current?.click()}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragOriginal(true);
                }}
                onDragLeave={() => setDragOriginal(false)}
                onDrop={(event) => {
                  setDragOriginal(false);
                  onDrop(event, (file) => setOriginalFile(file));
                }}
              >
                <div className="dropzone-title">Original file</div>
                <div className="helper">Drop the source .docx here or click to select.</div>
                {originalFile ? (
                  <div className="file-pill">
                    {originalFile.name} · {formatBytes(originalFile.size)}
                  </div>
                ) : null}
                <button
                  className="button secondary"
                  type="button"
                  onClick={() => originalInputRef.current?.click()}
                >
                  Choose file
                </button>
                <input
                  ref={originalInputRef}
                  type="file"
                  accept=".docx"
                  style={{ display: "none" }}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) selectFile(file, (selected) => setOriginalFile(selected));
                  }}
                />
              </div>

              <div
                className={`dropzone ${dragTranslated ? "dragging" : ""}`}
                onClick={() => translatedInputRef.current?.click()}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragTranslated(true);
                }}
                onDragLeave={() => setDragTranslated(false)}
                onDrop={(event) => {
                  setDragTranslated(false);
                  onDrop(event, (file) => setTranslatedFile(file));
                }}
              >
                <div className="dropzone-title">Translation file</div>
                <div className="helper">Drop the translated .docx here or click to select.</div>
                {translatedFile ? (
                  <div className="file-pill">
                    {translatedFile.name} · {formatBytes(translatedFile.size)}
                  </div>
                ) : null}
                <button
                  className="button secondary"
                  type="button"
                  onClick={() => translatedInputRef.current?.click()}
                >
                  Choose file
                </button>
                <input
                  ref={translatedInputRef}
                  type="file"
                  accept=".docx"
                  style={{ display: "none" }}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) selectFile(file, (selected) => setTranslatedFile(selected));
                  }}
                />
              </div>
            </div>

            <div className="actions" style={{ marginTop: "22px" }}>
              <button className="button" onClick={handleMerge} disabled={!canMerge || loading}>
                {loading ? "Merging..." : "Merge & download"}
              </button>
              <button
                className="button secondary"
                onClick={() => {
                  setOriginalFile(null);
                  setTranslatedFile(null);
                  setError("");
                  setSuccess("");
                }}
              >
                Clear files
              </button>
              {error ? <div className="error">{error}</div> : null}
              {success ? <div className="success">{success}</div> : null}
            </div>
          </div>
        )}

        <div className="footer">
          API: {API_BASE} · Files are processed in-memory and returned immediately.
        </div>
      </div>
    </div>
  );
}
