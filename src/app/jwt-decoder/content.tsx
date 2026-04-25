"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import { useToolState } from "@/hooks/use-tool-state";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { ToolIntro } from "@/components/tools/tool-intro";

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

// --- Inline SVG Icons ---

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

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`transition-transform ${open ? "rotate-90" : ""}`}
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

// --- Sub-components ---

function CopyButton({ copied, onCopy, label = "Copy" }: { copied: boolean; onCopy: () => void; label?: string }) {
  return (
    <button
      onClick={onCopy}
      className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
    >
      {copied ? (
        <>
          <CheckIcon />
          Copied
        </>
      ) : (
        <>
          <CopyIcon />
          {label}
        </>
      )}
    </button>
  );
}

function TimestampValue({ unix, toggled, onToggle }: { unix: number; toggled: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="case-preserve inline text-left hover:bg-gray-100 rounded px-0.5 -mx-0.5 transition-colors cursor-pointer"
      title="Click to toggle between unix and human-readable"
    >
      {toggled ? (
        <span className="text-amber-700">
          {formatTimestamp(unix)}
          <span className="text-gray-400 text-xs ml-1">({relativeTime(unix)})</span>
        </span>
      ) : (
        <span className="text-gray-900">{unix}</span>
      )}
    </button>
  );
}

function ClaimDescription({ claimKey }: { claimKey: string }) {
  const desc = CLAIM_DESCRIPTIONS[claimKey];
  if (!desc) return null;
  return (
    <span className="text-gray-400 text-xs ml-2 font-sans italic">
      // {desc}
    </span>
  );
}

function PayloadValue({
  value,
  depth = 0,
}: {
  value: unknown;
  depth?: number;
}) {
  if (value === null) return <span className="text-gray-400">null</span>;
  if (value === undefined) return <span className="text-gray-400">undefined</span>;
  if (typeof value === "boolean") return <span className="text-blue-600">{String(value)}</span>;
  if (typeof value === "number") return <span className="text-green-700">{value}</span>;
  if (typeof value === "string") return <span className="text-orange-700">&quot;{value}&quot;</span>;

  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-gray-500">[]</span>;
    return (
      <span>
        <span className="text-gray-400">[</span>
        <span className="text-gray-400 text-xs ml-1">({value.length} items)</span>
        {value.map((item, i) => (
          <div key={i} className="pl-4">
            <PayloadValue value={item} depth={depth + 1} />
            {i < value.length - 1 && <span className="text-gray-400">,</span>}
          </div>
        ))}
        <span className="text-gray-400">]</span>
      </span>
    );
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return <span className="text-gray-500">{"{}"}</span>;
    return (
      <span>
        {"{"}
        {entries.map(([k, v], i) => (
          <div key={k} className="pl-4">
            <span className="text-purple-400">&quot;{k}&quot;</span>
            <span className="text-gray-400">: </span>
            <PayloadValue value={v} depth={depth + 1} />
            {i < entries.length - 1 && <span className="text-gray-400">,</span>}
          </div>
        ))}
        {"}"}
      </span>
    );
  }

  return <span className="text-gray-900">{String(value)}</span>;
}

function SecurityPanel({ issues }: { issues: SecurityIssue[] }) {
  if (issues.length === 0) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-4 flex items-center gap-3">
        <div className="flex-shrink-0 text-green-600"><ShieldIcon /></div>
        <div>
          <p className="text-sm font-medium text-green-800">No security issues detected</p>
          <p className="text-xs text-green-600 mt-0.5">Standard claims present, algorithm looks reasonable, token size is fine.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-2.5">
        <ShieldIcon />
        <span className="text-sm font-medium">Security Analysis</span>
        <span className="ml-auto text-xs text-gray-400">{issues.length} issue{issues.length !== 1 ? "s" : ""}</span>
      </div>
      <div className="divide-y divide-gray-100">
        {issues.map((issue, i) => (
          <div key={i} className="px-4 py-3 flex items-start gap-3">
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
              <p className="text-sm font-medium text-gray-900">{issue.title}</p>
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{issue.detail}</p>
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
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-2.5">
        <InfoIcon />
        <span className="text-sm font-medium">Claim Inspector</span>
        <span className="ml-auto text-xs text-gray-400">{entries.length} claim{entries.length !== 1 ? "s" : ""}</span>
      </div>
      <div className="divide-y divide-gray-50">
        {entries.map(([key, value]) => {
          const isTimestamp = TIMESTAMP_CLAIMS.has(key) && typeof value === "number";
          const desc = CLAIM_DESCRIPTIONS[key];
          return (
            <div key={key} className="px-4 py-2.5 flex items-start gap-3">
              <code className="text-xs font-mono text-purple-600 bg-purple-50 rounded px-1.5 py-0.5 flex-shrink-0 mt-0.5">
                {key}
              </code>
              <div className="min-w-0 flex-1">
                {desc && (
                  <p className="text-[11px] text-gray-400 mb-1">{desc}</p>
                )}
                <div className="text-sm font-mono text-gray-900 break-all">
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

// --- Decode Tab ---

function DecodeTab({
  input,
  setInput,
  copiedSection,
  handleCopy,
}: {
  input: string;
  setInput: (v: string) => void;
  copiedSection: string | null;
  handleCopy: (section: string, text: string) => void;
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

  const handleToggleAllTimestamps = useCallback(() => {
    if (!decoded) return;
    const timestampKeys = Object.keys(decoded.payload).filter(
      (k) => TIMESTAMP_CLAIMS.has(k) && typeof decoded.payload[k] === "number"
    );
    setToggledTimestamps((prev) => {
      const allToggled = timestampKeys.every((k) => prev.has(k));
      if (allToggled) return new Set();
      return new Set(timestampKeys);
    });
  }, [decoded]);

  const hasTimestamps = decoded
    ? Object.keys(decoded.payload).some(
        (k) => TIMESTAMP_CLAIMS.has(k) && typeof decoded.payload[k] === "number"
      )
    : false;

  return (
    <div className="space-y-4">
      {/* Token input */}
      <div>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste your JWT here... e.g. eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgN..."
          className={`w-full rounded-xl border bg-white px-4 py-3 text-base font-mono shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 ${
            input.trim() && error
              ? "border-red-300 focus:border-red-300 focus:ring-red-100"
              : "border-gray-200 focus:border-gray-300 focus:ring-gray-200"
          }`}
          rows={4}
          autoFocus
          spellCheck={false}
        />
        <div className="mt-1.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            {error && <span className="text-red-500">{error}</span>}
            {decoded && !error && (
              <span className="text-green-600">
                Valid JWT structure
                <span className="text-gray-400 ml-2">
                  {getTokenSizeKB(input).toFixed(1)} KB
                </span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSamples(!showSamples)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showSamples ? "Hide samples" : "Load sample"}
            </button>
            {input && (
              <button onClick={() => setInput("")} className="text-gray-400 hover:text-gray-600">
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Sample tokens */}
      {showSamples && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-500 mb-3">Sample Tokens</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {SAMPLE_TOKENS.map((sample) => (
              <button
                key={sample.name}
                onClick={() => {
                  setInput(sample.token);
                  setShowSamples(false);
                }}
                className="text-left rounded-lg border border-gray-100 p-3 hover:border-gray-300 hover:bg-gray-50 transition-colors"
              >
                <p className="text-sm font-medium text-gray-900">{sample.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{sample.description}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {decoded && (
        <>
          {/* Color-coded token preview */}
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm overflow-auto">
            <span className="text-xs font-medium text-gray-500 mb-2 block">Encoded Token</span>
            <p className="font-mono text-sm break-all leading-relaxed">
              <span className="text-red-500">{decoded.headerRaw}</span>
              <span className="text-gray-400">.</span>
              <span className="text-purple-600">{decoded.payloadRaw}</span>
              <span className="text-gray-400">.</span>
              <span className="text-blue-500">{decoded.signatureRaw}</span>
            </p>
          </div>

          {/* Expiration status */}
          {expStatus && (
            <div
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
                expStatus.status === "valid"
                  ? "border-green-200 bg-green-50"
                  : expStatus.status === "expired"
                  ? "border-red-200 bg-red-50"
                  : "border-gray-200"
              }`}
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
              <span className="text-sm text-gray-600">{expStatus.detail}</span>
            </div>
          )}

          {/* Security analysis */}
          <SecurityPanel issues={securityIssues} />

          {/* Header section */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-red-500" />
                <span className="text-sm font-medium">Header</span>
                <span className="text-xs text-gray-400">JOSE</span>
              </div>
              <CopyButton
                copied={copiedSection === "header"}
                onCopy={() => handleCopy("header", JSON.stringify(decoded.header, null, 2))}
              />
            </div>
            <pre className="overflow-auto px-4 py-3 text-sm font-mono max-h-[200px]">
              {"{"}
              {Object.entries(decoded.header).map(([key, value], i, arr) => (
                <div key={key} className="pl-4">
                  <span className="text-red-400">&quot;{key}&quot;</span>
                  <span className="text-gray-400">: </span>
                  <PayloadValue value={value} />
                  {i < arr.length - 1 && <span className="text-gray-400">,</span>}
                  {key === "alg" && (
                    <span className="text-gray-400 text-xs ml-2 font-sans italic">
                      // Algorithm
                    </span>
                  )}
                  {key === "typ" && (
                    <span className="text-gray-400 text-xs ml-2 font-sans italic">
                      // Token type
                    </span>
                  )}
                  {key === "kid" && (
                    <span className="text-gray-400 text-xs ml-2 font-sans italic">
                      // Key ID
                    </span>
                  )}
                </div>
              ))}
              {"}"}
            </pre>
          </div>

          {/* Payload section */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-purple-500" />
                <span className="text-sm font-medium">Payload</span>
                <span className="text-xs text-gray-400">{Object.keys(decoded.payload).length} claims</span>
              </div>
              <div className="flex items-center gap-3">
                {hasTimestamps && (
                  <button
                    onClick={handleToggleAllTimestamps}
                    className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    Toggle timestamps
                  </button>
                )}
                <CopyButton
                  copied={copiedSection === "payload"}
                  onCopy={() => handleCopy("payload", JSON.stringify(decoded.payload, null, 2))}
                />
              </div>
            </div>
            <pre className="overflow-auto px-4 py-3 text-sm font-mono max-h-[400px]">
              {"{"}
              {Object.entries(decoded.payload).map(([key, value], i, arr) => {
                const isTimestamp = TIMESTAMP_CLAIMS.has(key) && typeof value === "number";
                return (
                  <div key={key} className="pl-4">
                    <span className="text-purple-400">&quot;{key}&quot;</span>
                    <span className="text-gray-400">: </span>
                    {isTimestamp ? (
                      <TimestampValue
                        unix={value as number}
                        toggled={toggledTimestamps.has(key)}
                        onToggle={() => handleToggleTimestamp(key)}
                      />
                    ) : (
                      <PayloadValue value={value} />
                    )}
                    {i < arr.length - 1 && <span className="text-gray-400">,</span>}
                    <ClaimDescription claimKey={key} />
                  </div>
                );
              })}
              {"}"}
            </pre>
          </div>

          {/* Claim Inspector */}
          <ClaimInspector
            payload={decoded.payload}
            toggledTimestamps={toggledTimestamps}
            onToggleTimestamp={handleToggleTimestamp}
          />

          {/* Signature section */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-blue-500" />
                <span className="text-sm font-medium">Signature</span>
                {decoded.header.alg ? (
                  <span className="text-xs text-gray-400">
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
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// --- Builder Tab ---

function BuilderTab({
  copiedSection,
  handleCopy,
}: {
  copiedSection: string | null;
  handleCopy: (section: string, text: string) => void;
}) {
  const [algorithm, setAlgorithm] = useState("HS256");
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
  const [duration, setDuration] = useState(86400);
  const [includeIat, setIncludeIat] = useState(true);
  const [includeExp, setIncludeExp] = useState(true);
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
    {
      name: "User Identity",
      payload: { sub: "user_123", name: "Jane Doe", email: "jane@example.com", email_verified: true },
    },
    {
      name: "API Service",
      payload: { sub: "svc_billing", permissions: ["invoices:read", "invoices:write"], client_id: "client_abc" },
    },
    {
      name: "OAuth Token",
      payload: { sub: "user_456", iss: "https://auth.example.com", aud: "https://api.example.com", scope: "openid profile email", azp: "client_xyz" },
    },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <p className="text-xs text-amber-700">
          <span className="font-semibold">Demo tokens only.</span> The generated token has no cryptographic signature and must not be used for authentication. Use this to prototype payloads and test decoders.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Configuration */}
        <div className="space-y-4">
          {/* Algorithm */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <label className="text-xs font-medium text-gray-500 block mb-2">Algorithm (header display)</label>
            <div className="flex flex-wrap gap-1.5">
              {ALGORITHMS.map((alg) => (
                <button
                  key={alg}
                  onClick={() => setAlgorithm(alg)}
                  className={`rounded-md px-2.5 py-1 text-xs font-mono transition-colors ${
                    algorithm === alg
                      ? "bg-gray-900 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {alg}
                </button>
              ))}
            </div>
          </div>

          {/* Auto claims */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <label className="text-xs font-medium text-gray-500 block mb-3">Auto-generated Claims</label>
            <div className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeIat}
                  onChange={(e) => setIncludeIat(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">
                  <code className="text-xs font-mono bg-gray-100 px-1 py-0.5 rounded">iat</code> Issued At (current time)
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeExp}
                  onChange={(e) => setIncludeExp(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">
                  <code className="text-xs font-mono bg-gray-100 px-1 py-0.5 rounded">exp</code> Expiration
                </span>
              </label>
              {includeExp && (
                <div className="ml-6">
                  <label className="text-xs text-gray-500 block mb-1.5">Token lifetime</label>
                  <div className="flex flex-wrap gap-1.5">
                    {DURATIONS.map((d) => (
                      <button
                        key={d.seconds}
                        onClick={() => setDuration(d.seconds)}
                        className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
                          duration === d.seconds
                            ? "bg-gray-900 text-white"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Templates */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <label className="text-xs font-medium text-gray-500 block mb-2">Quick Templates</label>
            <div className="flex flex-wrap gap-1.5">
              {templates.map((t) => (
                <button
                  key={t.name}
                  onClick={() => setPayloadText(JSON.stringify(t.payload, null, 2))}
                  className="rounded-md bg-gray-100 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-200 transition-colors"
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Payload editor */}
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <label className="text-xs font-medium text-gray-500 block mb-2">Payload JSON</label>
            <textarea
              value={payloadText}
              onChange={(e) => setPayloadText(e.target.value)}
              className={`w-full rounded-lg border bg-gray-50 px-3 py-2.5 text-sm font-mono placeholder:text-gray-400 focus:outline-none focus:ring-2 ${
                jsonError
                  ? "border-red-300 focus:ring-red-100"
                  : "border-gray-200 focus:ring-gray-200"
              }`}
              rows={12}
              spellCheck={false}
            />
            {jsonError && (
              <p className="text-xs text-red-500 mt-1.5">{jsonError}</p>
            )}
          </div>
        </div>
      </div>

      {/* Generated token output */}
      {generatedToken && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Generated Token</span>
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 uppercase">Unsigned</span>
            </div>
            <CopyButton
              copied={copiedSection === "builder-token"}
              onCopy={() => handleCopy("builder-token", generatedToken)}
            />
          </div>
          <div className="px-4 py-3">
            <p className="font-mono text-sm break-all leading-relaxed text-gray-700">
              {generatedToken}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Diff Tab ---

function DiffTab() {
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

    const headerDiffs: {
      key: string;
      a: unknown;
      b: unknown;
      status: "same" | "changed" | "added" | "removed";
    }[] = [];
    const payloadDiffs: {
      key: string;
      a: unknown;
      b: unknown;
      status: "same" | "changed" | "added" | "removed";
    }[] = [];

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

  const statusColor = (status: string) => {
    switch (status) {
      case "changed": return "bg-amber-50 border-l-2 border-l-amber-400";
      case "added": return "bg-green-50 border-l-2 border-l-green-400";
      case "removed": return "bg-red-50 border-l-2 border-l-red-400";
      default: return "";
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1.5">Token A</label>
          <textarea
            value={tokenA}
            onChange={(e) => setTokenA(e.target.value)}
            placeholder="Paste first JWT..."
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-mono shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:border-gray-300 focus:ring-gray-200"
            rows={4}
            spellCheck={false}
          />
          {decodedA.error && <p className="text-xs text-red-500 mt-1">{decodedA.error}</p>}
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1.5">Token B</label>
          <textarea
            value={tokenB}
            onChange={(e) => setTokenB(e.target.value)}
            placeholder="Paste second JWT..."
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-mono shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:border-gray-300 focus:ring-gray-200"
            rows={4}
            spellCheck={false}
          />
          {decodedB.error && <p className="text-xs text-red-500 mt-1">{decodedB.error}</p>}
        </div>
      </div>

      {diff && (
        <div className="space-y-4">
          {/* Header diff */}
          <DiffSection title="Header" diffs={diff.headerDiffs} statusColor={statusColor} statusBadge={statusBadge} />

          {/* Payload diff */}
          <DiffSection title="Payload" diffs={diff.payloadDiffs} statusColor={statusColor} statusBadge={statusBadge} />

          {/* Signature */}
          <div className={`rounded-xl border border-gray-200 bg-white shadow-sm ${!diff.sigSame ? "ring-2 ring-amber-200" : ""}`}>
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-blue-500" />
                <span className="text-sm font-medium">Signature</span>
              </div>
              {!diff.sigSame && (
                <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">DIFFERENT</span>
              )}
            </div>
            <div className="px-4 py-3 text-xs text-gray-500">
              {diff.sigSame ? "Signatures are identical." : "Signatures differ (expected if any header or payload claim changed)."}
            </div>
          </div>
        </div>
      )}

      {!diff && tokenA && tokenB && !decodedA.error && !decodedB.error && (
        <div className="text-center text-sm text-gray-400 py-8">
          Enter two valid JWTs to compare them.
        </div>
      )}

      {(!tokenA || !tokenB) && (
        <div className="text-center text-sm text-gray-400 py-8">
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
  statusColor: (status: string) => string;
  statusBadge: (status: string) => React.ReactNode;
}) {
  const changeCount = diffs.filter((d) => d.status !== "same").length;
  const dotColor = title === "Header" ? "bg-red-500" : "bg-purple-500";

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className={`h-3 w-3 rounded-full ${dotColor}`} />
          <span className="text-sm font-medium">{title}</span>
        </div>
        <span className="text-xs text-gray-400">
          {changeCount === 0 ? "Identical" : `${changeCount} difference${changeCount !== 1 ? "s" : ""}`}
        </span>
      </div>
      <div className="divide-y divide-gray-50">
        {diffs.map((d) => (
          <div key={d.key} className={`px-4 py-2 ${statusColor(d.status)}`}>
            <div className="flex items-center gap-2 mb-1">
              <code className="text-xs font-mono font-medium text-gray-700">{d.key}</code>
              {statusBadge(d.status)}
            </div>
            {d.status === "changed" && (
              <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                <div>
                  <span className="text-gray-400 text-[10px] uppercase block mb-0.5">Token A</span>
                  <span className="text-red-600">{formatDiffValue(d.a)}</span>
                </div>
                <div>
                  <span className="text-gray-400 text-[10px] uppercase block mb-0.5">Token B</span>
                  <span className="text-green-600">{formatDiffValue(d.b)}</span>
                </div>
              </div>
            )}
            {d.status === "same" && (
              <p className="text-xs font-mono text-gray-500">{formatDiffValue(d.a)}</p>
            )}
            {d.status === "added" && (
              <p className="text-xs font-mono text-green-600">{formatDiffValue(d.b)}</p>
            )}
            {d.status === "removed" && (
              <p className="text-xs font-mono text-red-600">{formatDiffValue(d.a)}</p>
            )}
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

  const handleCopy = useCallback(async (section: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  }, []);

  const { decoded } = useMemo(() => decodeJwt(input), [input]);

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
        {
          key: "1",
          meta: true,
          action: () => setActiveTab("decode"),
          label: "Decode tab",
        },
        {
          key: "2",
          meta: true,
          action: () => setActiveTab("builder"),
          label: "Builder tab",
        },
        {
          key: "3",
          meta: true,
          action: () => setActiveTab("diff"),
          label: "Diff tab",
        },
      ],
      [decoded, handleCopy, setInput]
    )
  );

  const tabs: { id: Tab; label: string; description: string }[] = [
    { id: "decode", label: "Decode", description: "Inspect and analyze" },
    { id: "builder", label: "Builder", description: "Create demo tokens" },
    { id: "diff", label: "Diff", description: "Compare two tokens" },
  ];

  return (
    <div className="min-h-screen text-gray-900">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
        <ToolIntro
          title="JWT Decoder"
          tagline="Decode, inspect, build, and diff JSON Web Tokens - with claim explanations and expiry warnings."
          description="Paste a JWT to see its header, payload, and signature decoded. Every standard claim (iss, sub, exp, iat, nbf, aud, jti) is explained in plain English. Builder mode lets you assemble a token from scratch; diff mode shows exactly what changed between two tokens (useful for debugging refresh flows)."
          audience={["Developers", "Security engineers", "Support"]}
          whenToUse={[
            "Inspecting a token from a failing auth request",
            "Checking what a refresh endpoint actually changed",
            "Prototyping a JWT for a test harness",
          ]}
        />

        {/* Tab bar */}
        <div className="mb-6 flex items-center gap-1 rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-gray-900 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              {tab.label}
              <span
                className={`block text-[10px] font-normal mt-0.5 ${
                  activeTab === tab.id ? "text-gray-300" : "text-gray-400"
                }`}
              >
                {tab.description}
              </span>
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === "decode" && (
          <DecodeTab
            input={input}
            setInput={setInput}
            copiedSection={copiedSection}
            handleCopy={handleCopy}
          />
        )}
        {activeTab === "builder" && (
          <BuilderTab copiedSection={copiedSection} handleCopy={handleCopy} />
        )}
        {activeTab === "diff" && <DiffTab />}
      </div>
    </div>
  );
}
