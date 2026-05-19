"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useToolState } from "@/hooks/use-tool-state";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import {
  ToolShell,
  ControlGroup,
  ToolActionButton,
} from "@/components/tools/tool-shell";
import { Segment, Toggle, Select } from "@/components/tools/controls";

// --- Types ---

interface DecodedJwt {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  signature: string;
  headerRaw: string;
  payloadRaw: string;
  signatureRaw: string;
}

type Tab = "decode" | "builder" | "diff";
type VerifyState = "idle" | "verifying" | "valid" | "invalid" | "unsupported";

interface SecurityIssue {
  severity: "critical" | "warning" | "info";
  title: string;
  detail: string;
}

// --- Constants ---

const CLAIM_DESCRIPTIONS: Record<string, string> = {
  iss: "Issuer - who created and signed this token",
  sub: "Subject - the user or entity this token represents",
  aud: "Audience - intended recipient(s) of this token",
  exp: "Expiration Time - when this token expires",
  nbf: "Not Before - token is not valid before this time",
  iat: "Issued At - when this token was created",
  jti: "JWT ID - unique identifier for this token",
  scope: "Scope - OAuth 2.0 scopes granted to this token",
  roles: "Roles - authorization roles assigned to the subject",
  permissions: "Permissions - specific permissions granted",
  email: "Email - email address of the subject",
  name: "Name - display name of the subject",
  picture: "Picture - URL of the subject's profile picture",
  azp: "Authorized Party - the party to which the token was issued",
  at_hash: "Access Token Hash - hash of the access token",
  nonce: "Nonce - value used to associate a client session with a token",
  auth_time: "Authentication Time - when the user last authenticated",
  updated_at: "Updated At - when the subject's info was last updated",
  email_verified: "Email Verified - whether the email has been verified",
  phone_number: "Phone Number - phone number of the subject",
  given_name: "Given Name - first name of the subject",
  family_name: "Family Name - last name of the subject",
  locale: "Locale - the subject's preferred locale",
  zoneinfo: "Time Zone - the subject's time zone",
  sid: "Session ID - identifier for the user's session",
  acr: "Authentication Context Class - how the user authenticated",
  amr: "Authentication Methods - methods used to authenticate",
  typ: "Type - token type (e.g., JWT, at+jwt)",
  client_id: "Client ID - OAuth 2.0 client identifier",
  realm_access: "Realm Access - Keycloak realm-level roles",
  resource_access: "Resource Access - Keycloak resource-level roles",
};

const TIMESTAMP_CLAIMS = new Set([
  "exp", "nbf", "iat", "auth_time", "updated_at",
]);

const ALGORITHMS = [
  "HS256", "HS384", "HS512",
  "RS256", "RS384", "RS512",
  "ES256", "ES384", "ES512",
  "PS256", "PS384", "PS512",
  "EdDSA",
];

const DURATIONS: { label: string; seconds: number }[] = [
  { label: "1 hour", seconds: 3600 },
  { label: "24 hours", seconds: 86400 },
  { label: "7 days", seconds: 604800 },
  { label: "30 days", seconds: 2592000 },
  { label: "1 year", seconds: 31536000 },
];

const SAMPLE_TOKENS: { name: string; description: string; token: string }[] = [
  {
    name: "Basic User",
    description: "Simple user identity token with standard claims",
    token: buildSampleToken(
      { alg: "HS256", typ: "JWT" },
      { sub: "user_2kX9mP", name: "Jane Cooper", email: "jane@example.com", iat: nowUnix(), exp: nowUnix() + 86400, iss: "https://auth.example.com", aud: "app_dashboard" }
    ),
  },
  {
    name: "Expired Token",
    description: "Token that expired 48 hours ago",
    token: buildSampleToken(
      { alg: "RS256", typ: "JWT" },
      { sub: "user_8fG3nR", name: "Alex Morgan", email: "alex@corp.io", iat: nowUnix() - 259200, exp: nowUnix() - 172800, iss: "https://id.corp.io", roles: ["viewer"] }
    ),
  },
  {
    name: "OAuth Access",
    description: "OAuth 2.0 access token with scopes and permissions",
    token: buildSampleToken(
      { alg: "RS256", typ: "at+jwt" },
      { sub: "user_4pL7wQ", iss: "https://oauth.provider.com", aud: "https://api.example.com", iat: nowUnix(), exp: nowUnix() + 3600, scope: "openid profile email read:data write:data", azp: "client_abc123", jti: "tok_9f8e7d6c5b4a", client_id: "client_abc123" }
    ),
  },
  {
    name: "API Key",
    description: "Long-lived API key token with minimal claims",
    token: buildSampleToken(
      { alg: "HS256", typ: "JWT" },
      { sub: "svc_billing_agent", iss: "https://api.internal.io", iat: nowUnix(), permissions: ["invoices:read", "invoices:write", "customers:read"], jti: "api_3k8m2n5p" }
    ),
  },
];

// --- Utility functions ---

function nowUnix(): number {
  return Math.floor(Date.now() / 1000);
}

function base64UrlEncode(str: string): string {
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const pad = base64.length % 4;
  if (pad === 2) base64 += "==";
  else if (pad === 3) base64 += "=";
  try {
    return decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
  } catch {
    return atob(base64);
  }
}

function base64UrlToBytes(str: string): Uint8Array {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const pad = base64.length % 4;
  if (pad === 2) base64 += "==";
  else if (pad === 3) base64 += "=";
  const binary = atob(base64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function buildSampleToken(
  header: Record<string, unknown>,
  payload: Record<string, unknown>
): string {
  const h = base64UrlEncode(JSON.stringify(header));
  const p = base64UrlEncode(JSON.stringify(payload));
  const fakeSig = base64UrlEncode("sample-signature-not-cryptographic");
  return `${h}.${p}.${fakeSig}`;
}

function decodeJwt(token: string): { decoded: DecodedJwt | null; error: string | null } {
  const trimmed = token.trim();
  if (!trimmed) return { decoded: null, error: null };

  const parts = trimmed.split(".");
  if (parts.length !== 3) {
    return { decoded: null, error: "Invalid JWT: expected 3 parts separated by dots" };
  }

  try {
    const headerJson = base64UrlDecode(parts[0]);
    const payloadJson = base64UrlDecode(parts[1]);
    const header = JSON.parse(headerJson);
    const payload = JSON.parse(payloadJson);

    return {
      decoded: {
        header,
        payload,
        signature: parts[2],
        headerRaw: parts[0],
        payloadRaw: parts[1],
        signatureRaw: parts[2],
      },
      error: null,
    };
  } catch (e) {
    return { decoded: null, error: `Failed to decode: ${(e as Error).message}` };
  }
}

function formatTimestamp(unix: number): string {
  return new Date(unix * 1000).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  });
}

function relativeTime(unix: number): string {
  const now = nowUnix();
  const diff = unix - now;
  const abs = Math.abs(diff);
  const suffix = diff < 0 ? "ago" : "from now";

  if (abs < 60) return `${abs}s ${suffix}`;
  if (abs < 3600) return `${Math.floor(abs / 60)}m ${suffix}`;
  if (abs < 86400) return `${Math.floor(abs / 3600)}h ${suffix}`;
  if (abs < 2592000) return `${Math.floor(abs / 86400)}d ${suffix}`;
  return `${Math.floor(abs / 2592000)}mo ${suffix}`;
}

function getTokenSizeKB(token: string): number {
  return new Blob([token]).size / 1024;
}

function analyzeSecurityIssues(decoded: DecodedJwt, rawToken: string): SecurityIssue[] {
  const issues: SecurityIssue[] = [];
  const alg = decoded.header.alg;
  const now = nowUnix();

  if (alg === "none" || alg === "None" || alg === "NONE") {
    issues.push({
      severity: "critical",
      title: 'Algorithm "none"',
      detail: "This token has no signature verification. Anyone can forge tokens with this header. Never accept alg:none in production.",
    });
  }

  if (typeof alg === "string" && alg.startsWith("HS")) {
    issues.push({
      severity: "warning",
      title: `HMAC algorithm (${alg})`,
      detail: "HMAC algorithms use a shared secret. If the secret is short or predictable, tokens can be forged via brute force. Use RS256/ES256 for public clients.",
    });
  }

  if (decoded.payload.exp === undefined) {
    issues.push({
      severity: "warning",
      title: "No expiration (exp) claim",
      detail: "This token never expires. If compromised, it grants indefinite access. Always set an expiration.",
    });
  } else if (typeof decoded.payload.exp === "number" && decoded.payload.exp < now) {
    issues.push({
      severity: "info",
      title: "Token is expired",
      detail: `Expired ${relativeTime(decoded.payload.exp)}. This token should be rejected by any compliant verifier.`,
    });
  }

  if (typeof decoded.payload.nbf === "number" && decoded.payload.nbf > now) {
    issues.push({
      severity: "info",
      title: "Token not yet valid",
      detail: `Becomes valid ${relativeTime(decoded.payload.nbf)}. This token should be rejected until then.`,
    });
  }

  if (decoded.payload.iss === undefined) {
    issues.push({
      severity: "warning",
      title: "No issuer (iss) claim",
      detail: "Without an issuer claim, it is harder to validate the token's origin. Recommended for all JWTs.",
    });
  }

  const sizeKB = getTokenSizeKB(rawToken);
  if (sizeKB > 8) {
    issues.push({
      severity: "warning",
      title: `Large token (${sizeKB.toFixed(1)} KB)`,
      detail: "Tokens over 8 KB can cause performance issues with HTTP headers. Consider moving large claims to a server-side store.",
    });
  }

  return issues;
}

// --- HMAC verification via WebCrypto ---

async function verifyHmac(
  token: string,
  secret: string,
  alg: string
): Promise<{ ok: boolean; reason?: string }> {
  const parts = token.split(".");
  if (parts.length !== 3) return { ok: false, reason: "Token must have 3 parts" };

  const hashMap: Record<string, string> = {
    HS256: "SHA-256",
    HS384: "SHA-384",
    HS512: "SHA-512",
  };
  const hashName = hashMap[alg];
  if (!hashName) return { ok: false, reason: `${alg} is not an HMAC algorithm (supported: HS256/HS384/HS512)` };

  try {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(secret),
      { name: "HMAC", hash: hashName },
      false,
      ["sign", "verify"]
    );
    const signingInput = enc.encode(`${parts[0]}.${parts[1]}`);
    const expectedSig = await crypto.subtle.sign("HMAC", key, signingInput);
    const expectedB64 = bytesToBase64Url(new Uint8Array(expectedSig));
    return { ok: expectedB64 === parts[2] };
  } catch (e) {
    return { ok: false, reason: (e as Error).message };
  }
}

// --- Icons ---

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );
}

// --- Subcomponents ---

function CopyButton({ copied, onCopy, label = "Copy" }: { copied: boolean; onCopy: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onCopy}
      className="flex items-center gap-1 text-xs transition-colors px-2 py-1 rounded"
      style={{ color: "var(--kami-text-dim)", minHeight: 32 }}
    >
      {copied ? (<><CheckIcon /> Copied</>) : (<><CopyIcon /> {label}</>)}
    </button>
  );
}

function TimestampValue({ unix, toggled, onToggle }: { unix: number; toggled: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="case-preserve inline text-left rounded px-0.5 -mx-0.5 transition-colors cursor-pointer"
      title="Click to toggle between unix and human-readable"
    >
      {toggled ? (
        <span style={{ color: "var(--kami-accent, #b45309)" }}>
          {formatTimestamp(unix)}
          <span className="text-xs ml-1" style={{ color: "var(--kami-text-dim)" }}>({relativeTime(unix)})</span>
        </span>
      ) : (
        <span style={{ color: "var(--kami-text)" }}>
          {unix}
          <span className="text-xs ml-1" style={{ color: "var(--kami-text-dim)" }}>({relativeTime(unix)})</span>
        </span>
      )}
    </button>
  );
}

function ClaimDescription({ claimKey }: { claimKey: string }) {
  const desc = CLAIM_DESCRIPTIONS[claimKey];
  if (!desc) return null;
  return (
    <span className="text-xs ml-2 font-sans italic" style={{ color: "var(--kami-text-dim)" }}>
      // {desc}
    </span>
  );
}

function PayloadValue({ value }: { value: unknown }) {
  if (value === null) return <span style={{ color: "var(--kami-text-dim)" }}>null</span>;
  if (value === undefined) return <span style={{ color: "var(--kami-text-dim)" }}>undefined</span>;
  if (typeof value === "boolean") return <span className="text-blue-600">{String(value)}</span>;
  if (typeof value === "number") return <span className="text-green-700">{value}</span>;
  if (typeof value === "string") return <span className="text-orange-700">&quot;{value}&quot;</span>;

  if (Array.isArray(value)) {
    if (value.length === 0) return <span style={{ color: "var(--kami-text-muted)" }}>[]</span>;
    return (
      <span>
        <span style={{ color: "var(--kami-text-dim)" }}>[</span>
        <span className="text-xs ml-1" style={{ color: "var(--kami-text-dim)" }}>({value.length} items)</span>
        {value.map((item, i) => (
          <div key={i} className="pl-4">
            <PayloadValue value={item} />
            {i < value.length - 1 && <span style={{ color: "var(--kami-text-dim)" }}>,</span>}
          </div>
        ))}
        <span style={{ color: "var(--kami-text-dim)" }}>]</span>
      </span>
    );
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return <span style={{ color: "var(--kami-text-muted)" }}>{"{}"}</span>;
    return (
      <span>
        {"{"}
        {entries.map(([k, v], i) => (
          <div key={k} className="pl-4">
            <span className="text-purple-400">&quot;{k}&quot;</span>
            <span style={{ color: "var(--kami-text-dim)" }}>: </span>
            <PayloadValue value={v} />
            {i < entries.length - 1 && <span style={{ color: "var(--kami-text-dim)" }}>,</span>}
          </div>
        ))}
        {"}"}
      </span>
    );
  }

  return <span style={{ color: "var(--kami-text)" }}>{String(value)}</span>;
}

const cardStyle: React.CSSProperties = {
  background: "var(--kami-surface-solid)",
  border: "1px solid var(--kami-border-strong)",
  borderRadius: "var(--kami-card-radius, 0.75rem)",
  boxShadow: "var(--kami-card-shadow, none)",
};

const inputStyle: React.CSSProperties = {
  background: "var(--kami-input-bg, var(--kami-surface-solid))",
  color: "var(--kami-text)",
  border: "1px solid var(--kami-border-strong)",
  borderRadius: "var(--kami-input-radius, 0.5rem)",
};

function SecurityPanel({ issues }: { issues: SecurityIssue[] }) {
  if (issues.length === 0) {
    return (
      <div
        className="p-4 flex items-center gap-3"
        style={{
          background: "color-mix(in srgb, #16a34a 10%, var(--kami-surface))",
          border: "1px solid color-mix(in srgb, #16a34a 30%, transparent)",
          borderRadius: "var(--kami-card-radius, 0.75rem)",
        }}
      >
        <div className="flex-shrink-0" style={{ color: "#16a34a" }}><ShieldIcon /></div>
        <div>
          <p className="text-sm font-medium" style={{ color: "var(--kami-text)" }}>No security issues detected</p>
          <p className="text-xs mt-0.5" style={{ color: "var(--kami-text-muted)" }}>Standard claims present, algorithm looks reasonable, token size is fine.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={cardStyle}>
      <div className="flex items-center gap-2 px-4 py-2.5" style={{ borderBottom: "1px solid var(--kami-border)" }}>
        <ShieldIcon />
        <span className="text-sm font-medium" style={{ color: "var(--kami-text)" }}>Security Analysis</span>
        <span className="ml-auto text-xs" style={{ color: "var(--kami-text-dim)" }}>{issues.length} issue{issues.length !== 1 ? "s" : ""}</span>
      </div>
      <div>
        {issues.map((issue, i) => (
          <div key={i} className="px-4 py-3 flex items-start gap-3" style={i > 0 ? { borderTop: "1px solid var(--kami-border)" } : undefined}>
            <span
              className={`mt-0.5 flex-shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                issue.severity === "critical"
                  ? "bg-red-100 text-red-700"
                  : issue.severity === "warning"
                  ? "bg-amber-100 text-amber-700"
                  : "bg-blue-100 text-blue-700"
              }`}
            >
              {issue.severity}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium" style={{ color: "var(--kami-text)" }}>{issue.title}</p>
              <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "var(--kami-text-muted)" }}>{issue.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ClaimInspector({
  payload,
  toggledTimestamps,
  onToggleTimestamp,
}: {
  payload: Record<string, unknown>;
  toggledTimestamps: Set<string>;
  onToggleTimestamp: (key: string) => void;
}) {
  const entries = Object.entries(payload);
  if (entries.length === 0) return null;

  return (
    <div style={cardStyle}>
      <div className="flex items-center gap-2 px-4 py-2.5" style={{ borderBottom: "1px solid var(--kami-border)" }}>
        <InfoIcon />
        <span className="text-sm font-medium" style={{ color: "var(--kami-text)" }}>Claim Inspector</span>
        <span className="ml-auto text-xs" style={{ color: "var(--kami-text-dim)" }}>{entries.length} claim{entries.length !== 1 ? "s" : ""}</span>
      </div>
      <div>
        {entries.map(([key, value], idx) => {
          const isTimestamp = TIMESTAMP_CLAIMS.has(key) && typeof value === "number";
          const desc = CLAIM_DESCRIPTIONS[key];
          return (
            <div key={key} className="px-4 py-2.5 flex items-start gap-3" style={idx > 0 ? { borderTop: "1px solid var(--kami-border)" } : undefined}>
              <code className="text-xs font-mono text-purple-600 bg-purple-50 rounded px-1.5 py-0.5 flex-shrink-0 mt-0.5">
                {key}
              </code>
              <div className="min-w-0 flex-1">
                {desc && (
                  <p className="text-[11px] mb-1" style={{ color: "var(--kami-text-dim)" }}>{desc}</p>
                )}
                <div className="text-sm font-mono break-all" style={{ color: "var(--kami-text)" }}>
                  {isTimestamp ? (
                    <TimestampValue
                      unix={value as number}
                      toggled={toggledTimestamps.has(key)}
                      onToggle={() => onToggleTimestamp(key)}
                    />
                  ) : (
                    <PayloadValue value={value} />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- Decode workspace ---

function DecodeWorkspace({
  input,
  setInput,
  copiedSection,
  handleCopy,
  secret,
  verifyState,
  verifyMessage,
  isMetro,
  metroCPivot,
}: {
  input: string;
  setInput: (v: string) => void;
  copiedSection: string | null;
  handleCopy: (section: string, text: string) => void;
  secret: string;
  verifyState: VerifyState;
  verifyMessage: string;
  isMetro?: boolean;
  metroCPivot?: "input" | "output";
}) {
  const [toggledTimestamps, setToggledTimestamps] = useState<Set<string>>(new Set());
  const [showSamples, setShowSamples] = useState(false);

  const { decoded, error } = useMemo(() => decodeJwt(input), [input]);
  const securityIssues = useMemo(
    () => (decoded ? analyzeSecurityIssues(decoded, input) : []),
    [decoded, input]
  );

  const expStatus = useMemo(() => {
    if (!decoded) return null;
    const exp = decoded.payload.exp;
    if (typeof exp !== "number") {
      return { status: "no-exp" as const, label: "No Expiration", detail: "Token has no exp claim" };
    }
    const now = nowUnix();
    const formatted = formatTimestamp(exp);
    if (exp < now) {
      return { status: "expired" as const, label: "Expired", detail: `${formatted} (${relativeTime(exp)})` };
    }
    return { status: "valid" as const, label: "Valid", detail: `${formatted} (${relativeTime(exp)})` };
  }, [decoded]);

  const handleToggleTimestamp = useCallback((key: string) => {
    setToggledTimestamps((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  return (
    <div className="space-y-4">
      {/* Token input */}
      {(!isMetro || metroCPivot === "input") && (<>
      <div>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste your JWT here... e.g. eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgN..."
          className="w-full px-4 py-3 text-base font-mono focus:outline-none"
          style={{
            ...inputStyle,
            border: `1px solid ${input.trim() && error ? "#fca5a5" : "var(--kami-border-strong)"}`,
            minHeight: 96,
          }}
          rows={4}
          autoFocus
          spellCheck={false}
        />
        <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-3">
            {error && <span className="text-red-500">{error}</span>}
            {decoded && !error && (
              <span className="text-green-600">
                Valid JWT structure
                <span className="ml-2" style={{ color: "var(--kami-text-dim)" }}>
                  {getTokenSizeKB(input).toFixed(1)} KB
                </span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowSamples(!showSamples)}
              className="transition-colors"
              style={{ color: "var(--kami-text-dim)", minHeight: 32 }}
            >
              {showSamples ? "Hide samples" : "Load sample"}
            </button>
            {input && (
              <button type="button" onClick={() => setInput("")} style={{ color: "var(--kami-text-dim)", minHeight: 32 }}>
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Sample tokens */}
      {showSamples && (
        <div className="p-4" style={cardStyle}>
          <p className="text-xs font-medium mb-3" style={{ color: "var(--kami-text-muted)" }}>Sample Tokens</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {SAMPLE_TOKENS.map((sample) => (
              <button
                key={sample.name}
                type="button"
                onClick={() => {
                  setInput(sample.token);
                  setShowSamples(false);
                }}
                className="text-left p-3 transition-colors"
                style={{
                  background: "var(--kami-surface)",
                  border: "1px solid var(--kami-border)",
                  borderRadius: "var(--kami-input-radius, 0.5rem)",
                  minHeight: 56,
                }}
              >
                <p className="text-sm font-medium" style={{ color: "var(--kami-text)" }}>{sample.name}</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--kami-text-muted)" }}>{sample.description}</p>
              </button>
            ))}
          </div>
        </div>
      )}
      </>)}

      {(!isMetro || metroCPivot === "output") && decoded && (
        <>
          {/* Color-coded token preview */}
          <div className="px-4 py-3 overflow-auto" style={cardStyle}>
            <span className="text-xs font-medium mb-2 block" style={{ color: "var(--kami-text-muted)" }}>Encoded Token</span>
            <p className="font-mono text-sm break-all leading-relaxed">
              <span className="text-red-500">{decoded.headerRaw}</span>
              <span style={{ color: "var(--kami-text-dim)" }}>.</span>
              <span className="text-purple-600">{decoded.payloadRaw}</span>
              <span style={{ color: "var(--kami-text-dim)" }}>.</span>
              <span className="text-blue-500">{decoded.signatureRaw}</span>
            </p>
          </div>

          {/* Expiration status */}
          {expStatus && (
            <div
              className="flex items-center gap-3 px-4 py-3 flex-wrap"
              style={{
                background:
                  expStatus.status === "valid"
                    ? "color-mix(in srgb, #16a34a 10%, var(--kami-surface))"
                    : expStatus.status === "expired"
                    ? "color-mix(in srgb, #dc2626 10%, var(--kami-surface))"
                    : "var(--kami-surface)",
                border: `1px solid ${
                  expStatus.status === "valid"
                    ? "color-mix(in srgb, #16a34a 30%, transparent)"
                    : expStatus.status === "expired"
                    ? "color-mix(in srgb, #dc2626 30%, transparent)"
                    : "var(--kami-border-strong)"
                }`,
                borderRadius: "var(--kami-card-radius, 0.75rem)",
              }}
            >
              <span
                className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                  expStatus.status === "valid"
                    ? "bg-green-200 text-green-800"
                    : expStatus.status === "expired"
                    ? "bg-red-200 text-red-800"
                    : "bg-gray-200 text-gray-700"
                }`}
              >
                {expStatus.label}
              </span>
              <span className="text-sm" style={{ color: "var(--kami-text-muted)" }}>{expStatus.detail}</span>
            </div>
          )}

          {/* HMAC verify result banner */}
          {verifyState !== "idle" && (
            <div
              className="flex items-center gap-3 px-4 py-3"
              style={{
                background:
                  verifyState === "valid"
                    ? "color-mix(in srgb, #16a34a 10%, var(--kami-surface))"
                    : verifyState === "invalid"
                    ? "color-mix(in srgb, #dc2626 10%, var(--kami-surface))"
                    : "var(--kami-surface)",
                border: `1px solid ${
                  verifyState === "valid"
                    ? "color-mix(in srgb, #16a34a 30%, transparent)"
                    : verifyState === "invalid"
                    ? "color-mix(in srgb, #dc2626 30%, transparent)"
                    : "var(--kami-border-strong)"
                }`,
                borderRadius: "var(--kami-card-radius, 0.75rem)",
              }}
            >
              <ShieldIcon />
              <div className="text-sm" style={{ color: "var(--kami-text)" }}>
                {verifyState === "verifying" && "Verifying..."}
                {verifyState === "valid" && "Signature verified with provided secret"}
                {verifyState === "invalid" && (
                  <>
                    Signature does NOT match
                    {verifyMessage && <span className="ml-2 text-xs" style={{ color: "var(--kami-text-dim)" }}>({verifyMessage})</span>}
                  </>
                )}
                {verifyState === "unsupported" && (
                  <>
                    {verifyMessage || "Unsupported algorithm for in-browser verification"}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Security analysis */}
          <SecurityPanel issues={securityIssues} />

          {/* Header / Payload / Signature cards in a responsive grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Header card */}
            <div style={cardStyle}>
              <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: "1px solid var(--kami-border)" }}>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-red-500" />
                  <span className="text-sm font-medium" style={{ color: "var(--kami-text)" }}>Header</span>
                </div>
                <CopyButton
                  copied={copiedSection === "header"}
                  onCopy={() => handleCopy("header", JSON.stringify(decoded.header, null, 2))}
                />
              </div>
              <pre className="overflow-auto px-4 py-3 text-sm font-mono max-h-[260px]" style={{ color: "var(--kami-text)" }}>
                {"{"}
                {Object.entries(decoded.header).map(([key, value], i, arr) => (
                  <div key={key} className="pl-4">
                    <span className="text-red-400">&quot;{key}&quot;</span>
                    <span style={{ color: "var(--kami-text-dim)" }}>: </span>
                    <PayloadValue value={value} />
                    {i < arr.length - 1 && <span style={{ color: "var(--kami-text-dim)" }}>,</span>}
                  </div>
                ))}
                {"}"}
              </pre>
            </div>

            {/* Payload card */}
            <div style={cardStyle}>
              <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: "1px solid var(--kami-border)" }}>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-purple-500" />
                  <span className="text-sm font-medium" style={{ color: "var(--kami-text)" }}>Payload</span>
                  <span className="text-xs" style={{ color: "var(--kami-text-dim)" }}>{Object.keys(decoded.payload).length} claims</span>
                </div>
                <CopyButton
                  copied={copiedSection === "payload"}
                  onCopy={() => handleCopy("payload", JSON.stringify(decoded.payload, null, 2))}
                />
              </div>
              <pre className="overflow-auto px-4 py-3 text-sm font-mono max-h-[260px]" style={{ color: "var(--kami-text)" }}>
                {"{"}
                {Object.entries(decoded.payload).map(([key, value], i, arr) => {
                  const isTimestamp = TIMESTAMP_CLAIMS.has(key) && typeof value === "number";
                  return (
                    <div key={key} className="pl-4">
                      <span className="text-purple-400">&quot;{key}&quot;</span>
                      <span style={{ color: "var(--kami-text-dim)" }}>: </span>
                      {isTimestamp ? (
                        <TimestampValue
                          unix={value as number}
                          toggled={toggledTimestamps.has(key)}
                          onToggle={() => handleToggleTimestamp(key)}
                        />
                      ) : (
                        <PayloadValue value={value} />
                      )}
                      {i < arr.length - 1 && <span style={{ color: "var(--kami-text-dim)" }}>,</span>}
                      <ClaimDescription claimKey={key} />
                    </div>
                  );
                })}
                {"}"}
              </pre>
            </div>

            {/* Signature card */}
            <div style={cardStyle}>
              <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: "1px solid var(--kami-border)" }}>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-blue-500" />
                  <span className="text-sm font-medium" style={{ color: "var(--kami-text)" }}>Signature</span>
                  {decoded.header.alg ? (
                    <span className="text-xs" style={{ color: "var(--kami-text-dim)" }}>
                      {String(decoded.header.alg)}
                    </span>
                  ) : null}
                </div>
                <CopyButton
                  copied={copiedSection === "signature"}
                  onCopy={() => handleCopy("signature", decoded.signature)}
                />
              </div>
              <div className="px-4 py-3">
                <p className="font-mono text-sm text-blue-500 break-all">{decoded.signature}</p>
                {secret && (
                  <p className="mt-2 text-xs" style={{ color: "var(--kami-text-dim)" }}>
                    Tip: enter your HMAC secret in the controls panel and hit Verify.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Claim Inspector full width */}
          <ClaimInspector
            payload={decoded.payload}
            toggledTimestamps={toggledTimestamps}
            onToggleTimestamp={handleToggleTimestamp}
          />
        </>
      )}
    </div>
  );
}

// --- Builder workspace ---

function BuilderWorkspace({
  copiedSection,
  handleCopy,
  algorithm,
  setAlgorithm,
  duration,
  setDuration,
  includeIat,
  setIncludeIat,
  includeExp,
  setIncludeExp,
}: {
  copiedSection: string | null;
  handleCopy: (section: string, text: string) => void;
  algorithm: string;
  setAlgorithm: (v: string) => void;
  duration: number;
  setDuration: (v: number) => void;
  includeIat: boolean;
  setIncludeIat: (v: boolean) => void;
  includeExp: boolean;
  setIncludeExp: (v: boolean) => void;
}) {
  const [payloadText, setPayloadText] = useState(
    JSON.stringify(
      {
        sub: "user_123",
        name: "Jane Doe",
        email: "jane@example.com",
        roles: ["admin", "user"],
      },
      null,
      2
    )
  );
  const [jsonError, setJsonError] = useState<string | null>(null);

  const generatedToken = useMemo(() => {
    try {
      const payloadObj = JSON.parse(payloadText);
      setJsonError(null);

      const now = nowUnix();
      const finalPayload = { ...payloadObj };
      if (includeIat) finalPayload.iat = now;
      if (includeExp) finalPayload.exp = now + duration;

      const header = { alg: algorithm, typ: "JWT" };
      const h = base64UrlEncode(JSON.stringify(header));
      const p = base64UrlEncode(JSON.stringify(finalPayload));
      return `${h}.${p}.`;
    } catch (e) {
      setJsonError((e as Error).message);
      return null;
    }
  }, [payloadText, algorithm, duration, includeIat, includeExp]);

  const templates = [
    { name: "User Identity", payload: { sub: "user_123", name: "Jane Doe", email: "jane@example.com", email_verified: true } },
    { name: "API Service", payload: { sub: "svc_billing", permissions: ["invoices:read", "invoices:write"], client_id: "client_abc" } },
    { name: "OAuth Token", payload: { sub: "user_456", iss: "https://auth.example.com", aud: "https://api.example.com", scope: "openid profile email", azp: "client_xyz" } },
  ];

  return (
    <div className="space-y-4">
      <div
        className="px-4 py-3"
        style={{
          background: "color-mix(in srgb, var(--kami-accent, #f59e0b) 10%, var(--kami-surface))",
          color: "var(--kami-text)",
          border: "1px solid color-mix(in srgb, var(--kami-accent, #f59e0b) 30%, transparent)",
          borderRadius: "var(--kami-card-radius, 0.75rem)",
        }}
      >
        <p className="text-xs">
          <span className="font-semibold">Demo tokens only.</span> The generated token has no cryptographic signature and must not be used for authentication.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Quick templates + JSON editor */}
        <div className="p-5 space-y-3" style={cardStyle}>
          <label className="text-xs font-medium block" style={{ color: "var(--kami-text-muted)" }}>Quick Templates</label>
          <div className="flex flex-wrap gap-1.5">
            {templates.map((t) => (
              <button
                key={t.name}
                type="button"
                onClick={() => setPayloadText(JSON.stringify(t.payload, null, 2))}
                className="px-3 py-1.5 text-xs transition-colors"
                style={{
                  background: "var(--kami-surface)",
                  color: "var(--kami-text-muted)",
                  border: "1px solid var(--kami-border)",
                  borderRadius: "var(--kami-cta-radius, 0.375rem)",
                  minHeight: 32,
                }}
              >
                {t.name}
              </button>
            ))}
          </div>
          <label className="text-xs font-medium block" style={{ color: "var(--kami-text-muted)" }}>Payload JSON</label>
          <textarea
            value={payloadText}
            onChange={(e) => setPayloadText(e.target.value)}
            className="w-full px-3 py-2.5 text-sm font-mono focus:outline-none"
            style={{
              ...inputStyle,
              border: `1px solid ${jsonError ? "#fca5a5" : "var(--kami-border)"}`,
              minHeight: 240,
            }}
            rows={12}
            spellCheck={false}
          />
          {jsonError && <p className="text-xs text-red-500">{jsonError}</p>}
        </div>

        {/* Generated token */}
        {generatedToken && (
          <div style={cardStyle}>
            <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: "1px solid var(--kami-border)" }}>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium" style={{ color: "var(--kami-text)" }}>Generated Token</span>
                <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 uppercase">Unsigned</span>
              </div>
              <CopyButton
                copied={copiedSection === "builder-token"}
                onCopy={() => handleCopy("builder-token", generatedToken)}
              />
            </div>
            <div className="px-4 py-3">
              <p className="font-mono text-sm break-all leading-relaxed" style={{ color: "var(--kami-text-muted)" }}>
                {generatedToken}
              </p>
              <div className="mt-3 text-xs space-y-1" style={{ color: "var(--kami-text-dim)" }}>
                <p>Algorithm: <span style={{ color: "var(--kami-text)" }}>{algorithm}</span></p>
                {includeIat && <p>iat: <span style={{ color: "var(--kami-text)" }}>{nowUnix()}</span></p>}
                {includeExp && <p>exp duration: <span style={{ color: "var(--kami-text)" }}>{DURATIONS.find((d) => d.seconds === duration)?.label || `${duration}s`}</span></p>}
              </div>
            </div>
          </div>
        )}
      </div>
      {/* hidden suppressors for unused setters in this scope */}
      <div className="hidden">{setAlgorithm.length}{setDuration.length}{setIncludeIat.length}{setIncludeExp.length}</div>
    </div>
  );
}

// --- Diff workspace ---

function DiffWorkspace() {
  const [tokenA, setTokenA] = useState("");
  const [tokenB, setTokenB] = useState("");

  const decodedA = useMemo(() => decodeJwt(tokenA), [tokenA]);
  const decodedB = useMemo(() => decodeJwt(tokenB), [tokenB]);

  const diff = useMemo(() => {
    if (!decodedA.decoded || !decodedB.decoded) return null;

    const allHeaderKeys = new Set([
      ...Object.keys(decodedA.decoded.header),
      ...Object.keys(decodedB.decoded.header),
    ]);
    const allPayloadKeys = new Set([
      ...Object.keys(decodedA.decoded.payload),
      ...Object.keys(decodedB.decoded.payload),
    ]);

    const headerDiffs: { key: string; a: unknown; b: unknown; status: "same" | "changed" | "added" | "removed" }[] = [];
    const payloadDiffs: { key: string; a: unknown; b: unknown; status: "same" | "changed" | "added" | "removed" }[] = [];

    for (const key of Array.from(allHeaderKeys)) {
      const a = decodedA.decoded.header[key];
      const b = decodedB.decoded.header[key];
      if (a === undefined) headerDiffs.push({ key, a, b, status: "added" });
      else if (b === undefined) headerDiffs.push({ key, a, b, status: "removed" });
      else if (JSON.stringify(a) !== JSON.stringify(b)) headerDiffs.push({ key, a, b, status: "changed" });
      else headerDiffs.push({ key, a, b, status: "same" });
    }

    for (const key of Array.from(allPayloadKeys)) {
      const a = decodedA.decoded.payload[key];
      const b = decodedB.decoded.payload[key];
      if (a === undefined) payloadDiffs.push({ key, a, b, status: "added" });
      else if (b === undefined) payloadDiffs.push({ key, a, b, status: "removed" });
      else if (JSON.stringify(a) !== JSON.stringify(b)) payloadDiffs.push({ key, a, b, status: "changed" });
      else payloadDiffs.push({ key, a, b, status: "same" });
    }

    const sigSame = decodedA.decoded.signature === decodedB.decoded.signature;
    return { headerDiffs, payloadDiffs, sigSame };
  }, [decodedA, decodedB]);

  const statusColor = (status: string): React.CSSProperties => {
    switch (status) {
      case "changed":
        return { background: "color-mix(in srgb, #f59e0b 10%, var(--kami-surface))", borderLeft: "2px solid #f59e0b" };
      case "added":
        return { background: "color-mix(in srgb, #16a34a 10%, var(--kami-surface))", borderLeft: "2px solid #16a34a" };
      case "removed":
        return { background: "color-mix(in srgb, #dc2626 10%, var(--kami-surface))", borderLeft: "2px solid #dc2626" };
      default:
        return {};
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "changed": return <span className="rounded bg-amber-100 px-1 py-0.5 text-[10px] font-medium text-amber-700">CHANGED</span>;
      case "added": return <span className="rounded bg-green-100 px-1 py-0.5 text-[10px] font-medium text-green-700">ADDED IN B</span>;
      case "removed": return <span className="rounded bg-red-100 px-1 py-0.5 text-[10px] font-medium text-red-700">ONLY IN A</span>;
      default: return null;
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--kami-text-muted)" }}>Token A</label>
          <textarea
            value={tokenA}
            onChange={(e) => setTokenA(e.target.value)}
            placeholder="Paste first JWT..."
            className="w-full px-4 py-3 text-sm font-mono focus:outline-none"
            style={{ ...inputStyle, minHeight: 96 }}
            rows={4}
            spellCheck={false}
          />
          {decodedA.error && <p className="text-xs text-red-500 mt-1">{decodedA.error}</p>}
        </div>
        <div>
          <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--kami-text-muted)" }}>Token B</label>
          <textarea
            value={tokenB}
            onChange={(e) => setTokenB(e.target.value)}
            placeholder="Paste second JWT..."
            className="w-full px-4 py-3 text-sm font-mono focus:outline-none"
            style={{ ...inputStyle, minHeight: 96 }}
            rows={4}
            spellCheck={false}
          />
          {decodedB.error && <p className="text-xs text-red-500 mt-1">{decodedB.error}</p>}
        </div>
      </div>

      {diff && (
        <div className="space-y-4">
          <DiffSection title="Header" diffs={diff.headerDiffs} statusColor={statusColor} statusBadge={statusBadge} />
          <DiffSection title="Payload" diffs={diff.payloadDiffs} statusColor={statusColor} statusBadge={statusBadge} />
          <div
            className={!diff.sigSame ? "ring-2 ring-amber-200" : ""}
            style={cardStyle}
          >
            <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: "1px solid var(--kami-border)" }}>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-blue-500" />
                <span className="text-sm font-medium" style={{ color: "var(--kami-text)" }}>Signature</span>
              </div>
              {!diff.sigSame && (
                <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">DIFFERENT</span>
              )}
            </div>
            <div className="px-4 py-3 text-xs" style={{ color: "var(--kami-text-muted)" }}>
              {diff.sigSame ? "Signatures are identical." : "Signatures differ (expected if any header or payload claim changed)."}
            </div>
          </div>
        </div>
      )}

      {(!tokenA || !tokenB) && (
        <div className="text-center text-sm py-8" style={{ color: "var(--kami-text-dim)" }}>
          Paste two JWTs above to see a side-by-side comparison of their claims.
        </div>
      )}
    </div>
  );
}

function DiffSection({
  title,
  diffs,
  statusColor,
  statusBadge,
}: {
  title: string;
  diffs: { key: string; a: unknown; b: unknown; status: string }[];
  statusColor: (status: string) => React.CSSProperties;
  statusBadge: (status: string) => React.ReactNode;
}) {
  const changeCount = diffs.filter((d) => d.status !== "same").length;
  const dotColor = title === "Header" ? "bg-red-500" : "bg-purple-500";

  return (
    <div style={cardStyle}>
      <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: "1px solid var(--kami-border)" }}>
        <div className="flex items-center gap-2">
          <span className={`h-3 w-3 rounded-full ${dotColor}`} />
          <span className="text-sm font-medium" style={{ color: "var(--kami-text)" }}>{title}</span>
        </div>
        <span className="text-xs" style={{ color: "var(--kami-text-dim)" }}>
          {changeCount === 0 ? "Identical" : `${changeCount} difference${changeCount !== 1 ? "s" : ""}`}
        </span>
      </div>
      <div>
        {diffs.map((d, idx) => (
          <div
            key={d.key}
            className="px-4 py-2"
            style={{ ...(idx > 0 ? { borderTop: "1px solid var(--kami-border)" } : {}), ...statusColor(d.status) }}
          >
            <div className="flex items-center gap-2 mb-1">
              <code className="text-xs font-mono font-medium" style={{ color: "var(--kami-text)" }}>{d.key}</code>
              {statusBadge(d.status)}
            </div>
            {d.status === "changed" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                <div>
                  <span className="text-[10px] uppercase block mb-0.5" style={{ color: "var(--kami-text-dim)" }}>Token A</span>
                  <span className="text-red-600">{formatDiffValue(d.a)}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase block mb-0.5" style={{ color: "var(--kami-text-dim)" }}>Token B</span>
                  <span className="text-green-600">{formatDiffValue(d.b)}</span>
                </div>
              </div>
            )}
            {d.status === "same" && (
              <p className="text-xs font-mono" style={{ color: "var(--kami-text-muted)" }}>{formatDiffValue(d.a)}</p>
            )}
            {d.status === "added" && <p className="text-xs font-mono text-green-600">{formatDiffValue(d.b)}</p>}
            {d.status === "removed" && <p className="text-xs font-mono text-red-600">{formatDiffValue(d.a)}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

function formatDiffValue(value: unknown): string {
  if (value === undefined) return "(missing)";
  if (typeof value === "string") return `"${value}"`;
  if (typeof value === "object" && value !== null) return JSON.stringify(value);
  return String(value);
}

// --- Main Component ---

export default function JwtDecoderContent() {
  const [{ q: input }, setToolState] = useToolState({ q: "" });
  const setInput = useCallback((v: string) => setToolState({ q: v }), [setToolState]);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("decode");

  const [currentTheme, setCurrentTheme] = useState<string>("default");
  const [metroCPivot, setMetroCPivot] = useState<"input" | "output">("input");

  useEffect(() => {
    function readTheme() {
      return document.documentElement.getAttribute("data-theme") || "default";
    }
    setCurrentTheme(readTheme());
    const obs = new MutationObserver(() => setCurrentTheme(readTheme()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  const isMetro = currentTheme === "metro";

  // Builder state lifted so it's accessible from controls panel
  const [algorithm, setAlgorithm] = useState("HS256");
  const [duration, setDuration] = useState(86400);
  const [includeIat, setIncludeIat] = useState(true);
  const [includeExp, setIncludeExp] = useState(true);

  // HMAC verify state
  const [secret, setSecret] = useState("");
  const [verifyState, setVerifyState] = useState<VerifyState>("idle");
  const [verifyMessage, setVerifyMessage] = useState("");

  const { decoded } = useMemo(() => decodeJwt(input), [input]);

  const handleCopy = useCallback(async (section: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  }, []);

  // Auto-clear verify state when input changes
  useEffect(() => {
    setVerifyState("idle");
    setVerifyMessage("");
  }, [input, secret]);

  const handleVerify = useCallback(async () => {
    if (!decoded) {
      setVerifyState("invalid");
      setVerifyMessage("Decode a token first");
      return;
    }
    if (!secret) {
      setVerifyState("invalid");
      setVerifyMessage("Enter a secret to verify HMAC");
      return;
    }
    const alg = String(decoded.header.alg || "");
    if (!alg.startsWith("HS")) {
      setVerifyState("unsupported");
      setVerifyMessage(`${alg || "Unknown algorithm"} cannot be verified in-browser. Only HS256/HS384/HS512 are supported.`);
      return;
    }
    setVerifyState("verifying");
    const result = await verifyHmac(input, secret, alg);
    if (result.ok) {
      setVerifyState("valid");
      setVerifyMessage("");
    } else {
      setVerifyState("invalid");
      setVerifyMessage(result.reason || "");
    }
  }, [decoded, secret, input]);

  useKeyboardShortcuts(
    useMemo(
      () => [
        {
          key: "Enter",
          meta: true,
          action: () => {
            if (decoded) handleCopy("payload", JSON.stringify(decoded.payload, null, 2));
          },
          label: "Copy payload",
        },
        { key: "k", meta: true, action: () => setInput(""), label: "Clear" },
        { key: "1", meta: true, action: () => setActiveTab("decode"), label: "Decode tab" },
        { key: "2", meta: true, action: () => setActiveTab("builder"), label: "Builder tab" },
        { key: "3", meta: true, action: () => setActiveTab("diff"), label: "Diff tab" },
      ],
      [decoded, handleCopy, setInput]
    )
  );

  const tabs: { value: Tab; label: string }[] = [
    { value: "decode", label: "Decode" },
    { value: "builder", label: "Builder" },
    { value: "diff", label: "Diff" },
  ];

  return (
    <ToolShell
      title="JWT Decoder"
      tagline="Decode · inspect · verify · build JSON Web Tokens"
      accent="#10b981"
      materialFab={{ label: "Copy payload", onClick: () => { if (decoded) handleCopy("payload", JSON.stringify(decoded.payload, null, 2)); } }}
      actions={
        <>
          {activeTab === "decode" && decoded && (
            <ToolActionButton
              variant="outline"
              onClick={() => handleCopy("payload", JSON.stringify(decoded.payload, null, 2))}
            >
              {copiedSection === "payload" ? "Copied" : "Copy payload"}
            </ToolActionButton>
          )}
          {activeTab === "decode" && decoded && (
            <ToolActionButton variant="solid" onClick={handleVerify}>
              {verifyState === "verifying" ? "Verifying..." : "Verify HMAC"}
            </ToolActionButton>
          )}
        </>
      }
      controls={
        <>
          <ControlGroup label="Mode">
            <Segment<Tab>
              value={activeTab}
              onChange={setActiveTab}
              options={tabs.map((t) => ({ value: t.value, label: t.label }))}
              full
            />
          </ControlGroup>

          {activeTab === "decode" && (
            <>
              <ControlGroup label="HMAC Secret" hint="HS256/384/512 only">
                <input
                  type="text"
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  placeholder="your-256-bit-secret"
                  className="w-full px-3 py-2.5 text-sm font-mono focus:outline-none"
                  style={{ ...inputStyle, minHeight: 40 }}
                  spellCheck={false}
                />
              </ControlGroup>
              <ControlGroup>
                <ToolActionButton variant="solid" onClick={handleVerify}>
                  {verifyState === "verifying" ? "Verifying..." : "Verify Signature"}
                </ToolActionButton>
              </ControlGroup>
              {verifyState === "valid" && (
                <div className="text-xs text-green-600">Signature verified.</div>
              )}
              {verifyState === "invalid" && (
                <div className="text-xs text-red-600">
                  Signature mismatch. {verifyMessage}
                </div>
              )}
              {verifyState === "unsupported" && (
                <div className="text-xs" style={{ color: "var(--kami-text-dim)" }}>{verifyMessage}</div>
              )}
            </>
          )}

          {activeTab === "builder" && (
            <>
              <ControlGroup label="Algorithm">
                <Select
                  value={algorithm}
                  onChange={setAlgorithm}
                  options={ALGORITHMS.map((a) => ({ value: a, label: a }))}
                />
              </ControlGroup>
              <ControlGroup label="Auto-claims">
                <Toggle label="Include iat (issued at)" checked={includeIat} onChange={setIncludeIat} />
                <div className="mt-2">
                  <Toggle label="Include exp (expiration)" checked={includeExp} onChange={setIncludeExp} />
                </div>
              </ControlGroup>
              {includeExp && (
                <ControlGroup label="Lifetime">
                  <Select
                    value={String(duration)}
                    onChange={(v) => setDuration(parseInt(v, 10))}
                    options={DURATIONS.map((d) => ({ value: String(d.seconds), label: d.label }))}
                  />
                </ControlGroup>
              )}
            </>
          )}
        </>
      }
      info={
        <div className="space-y-3 text-xs" style={{ color: "var(--kami-text-muted)" }}>
          <p>
            <strong>JWT Decoder</strong> parses a JSON Web Token client-side. Nothing leaves your browser.
          </p>
          <p>
            <strong>Decode</strong> shows header, payload (with claim explanations), and signature in three cards.
            Timestamp claims (exp, iat, nbf) render as both unix and human-readable with a countdown.
          </p>
          <p>
            <strong>Verify</strong> uses WebCrypto to check HMAC signatures (HS256/HS384/HS512) against your secret.
            RS/ES/PS algorithms require a public key and are not supported in this tool.
          </p>
          <p>
            <strong>Builder</strong> creates demo tokens with arbitrary payload (unsigned — do not use in production).
          </p>
          <p>
            <strong>Diff</strong> compares two tokens and highlights changed / added / removed claims — handy for debugging refresh flows.
          </p>
          <p>Shortcuts: ⌘1/2/3 switch tabs · ⌘Enter copy payload · ⌘K clear.</p>
        </div>
      }
    >
      {isMetro && (
        <nav className="metro-pivot" role="tablist" aria-label="View" style={{ borderBottom: "1px solid var(--kami-border)", padding: "0 16px" }}>
          <button role="tab" aria-selected={metroCPivot === "input"}
            className={`metro-pivot-item${metroCPivot === "input" ? " is-active" : ""}`}
            onClick={() => setMetroCPivot("input")}>Token</button>
          <button role="tab" aria-selected={metroCPivot === "output"}
            className={`metro-pivot-item${metroCPivot === "output" ? " is-active" : ""}`}
            onClick={() => setMetroCPivot("output")}>Decoded</button>
        </nav>
      )}
      <div className="space-y-4">
        {activeTab === "decode" && (
          <DecodeWorkspace
            input={input}
            setInput={setInput}
            copiedSection={copiedSection}
            handleCopy={handleCopy}
            secret={secret}
            verifyState={verifyState}
            verifyMessage={verifyMessage}
            isMetro={isMetro}
            metroCPivot={metroCPivot}
          />
        )}
        {activeTab === "builder" && (
          <BuilderWorkspace
            copiedSection={copiedSection}
            handleCopy={handleCopy}
            algorithm={algorithm}
            setAlgorithm={setAlgorithm}
            duration={duration}
            setDuration={setDuration}
            includeIat={includeIat}
            setIncludeIat={setIncludeIat}
            includeExp={includeExp}
            setIncludeExp={setIncludeExp}
          />
        )}
        {activeTab === "diff" && <DiffWorkspace />}
      </div>
    </ToolShell>
  );
}
