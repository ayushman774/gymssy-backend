# Authentication rate limiting

Gymssy applies separate IP-based limits to login, public customer/provider
registration, and authenticated Admin creation. Production Netlify requests are
keyed by Netlify's `x-nf-client-connection-ip` header; other environments use
Express's socket-derived `req.ip`. Client-supplied forwarding headers are not
trusted.

The limiter uses `express-rate-limit`'s bounded in-memory store. This protects a
single warm process and is suitable as a best-effort control, but Netlify
Functions can scale to multiple ephemeral instances. Counts are therefore not
globally coordinated and can reset when an instance is recycled. Globally
consistent enforcement would require a shared external store or a Netlify
platform-level rule that can target only the authentication paths.
