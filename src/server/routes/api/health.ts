import { defineEventHandler, getRequestIP } from 'h3';

/**
 * Scaffold-phase readiness surface. Returns the resolved client IP via the
 * `X-Forwarded-For` chain (see `getRequestIP(event, { xForwardedFor: true })`)
 * so the preship contract can confirm the app trusts the L7 balancer's
 * forwarded headers with a plain curl -H check, without needing a browser.
 */
export default defineEventHandler((event) => ({
  status: 'ok',
  clientIp: getRequestIP(event, { xForwardedFor: true }) ?? null,
}));
