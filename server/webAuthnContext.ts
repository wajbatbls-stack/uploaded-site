import { TRPCError } from "@trpc/server";

type RequestHeaders = Record<string, string | string[] | undefined>;

function firstHeader(headers: RequestHeaders, name: string) {
  const value = headers[name];
  return Array.isArray(value) ? value[0] : value;
}

function requestedHostname(host: string) {
  return host.trim().split(",")[0].trim().replace(/^\[/, "").replace(/\]$/, "").replace(/:\d+$/, "").toLowerCase();
}

/**
 * Android Chrome may omit Origin on same-origin tRPC GET requests. In that case,
 * the reverse proxy's trusted host/protocol headers still identify the currently
 * opened HTTPS site, so we can issue a challenge bound to that exact site.
 */
export function getWebAuthnContext(headers: RequestHeaders) {
  const declaredOrigin = firstHeader(headers, "origin");
  const proxyHost = firstHeader(headers, "x-forwarded-host") || firstHeader(headers, "host");
  const protocol = (firstHeader(headers, "x-forwarded-proto") || "https").split(",")[0].trim().toLowerCase();
  const rawOrigin = declaredOrigin || (proxyHost ? `${protocol}://${proxyHost.trim().split(",")[0].trim()}` : undefined);
  if (!rawOrigin) throw new TRPCError({ code: "BAD_REQUEST", message: "تعذر التحقق من موقع شاشة الدخول لطلب Passkey" });

  let origin: URL;
  try {
    origin = new URL(rawOrigin);
  } catch {
    throw new TRPCError({ code: "BAD_REQUEST", message: "مصدر طلب Passkey غير صالح" });
  }
  if (origin.protocol !== "https:" && origin.hostname !== "localhost") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "يتطلب Passkey اتصالاً آمناً" });
  }

  const host = proxyHost ? requestedHostname(proxyHost) : origin.hostname.toLowerCase();
  if (declaredOrigin && host && origin.hostname.toLowerCase() !== host) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "مصدر طلب Passkey لا يطابق نطاق لوحة المالك" });
  }
  return { origin: origin.origin, rpId: host || origin.hostname };
}
