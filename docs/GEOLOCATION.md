# Gymssy geospatial foundation

## Domain model

Physical marketplace venues use the `Gym` model. This includes gyms, fitness centres,
wellness centres, sports academies, and studios. Trainers, coaches, and nutritionists do
not currently have an independent physical-location contract and are intentionally
excluded from nearby discovery.

Human-readable `location` and the canonical `city` relationship remain the source for
addresses, labels, browsing, and SEO. The optional `geoLocation` field is a dedicated
GeoJSON Point used only for geographic querying. Its coordinate order is always
`[longitude, latitude]`, and it has a `2dsphere` index.

Legacy `coordinates.lat` and `coordinates.lng` remain supported. Provider and Admin
clients may write either:

```json
{ "coordinates": { "lat": 12.9784, "lng": 77.6408 } }
```

or the preferred explicit aliases:

```json
{ "coordinates": { "latitude": 12.9784, "longitude": 77.6408 } }
```

The server validates ranges and converts the pair to both the legacy representation and
canonical GeoJSON. Numeric strings normalize safely. Zero is valid. New records require
a complete pair; updates may change one numeric legacy component when the other valid
component already exists. Clearing requires both values to be `null`. Clients cannot
submit raw GeoJSON.

## Nearby discovery API

`GET /api/discover?lat=12.9784&lng=77.6408&radius=5`

- `lat` and `lng` are required together.
- `radius` is in kilometres, defaults to `10`, and must be from `0.1` through `100`.
- Nearby discovery searches only physical `Gym`-model venues through MongoDB `$geoNear`.
- Existing category, subcategory, type, entity, city, publication, page, and limit filters
  continue to apply.
- Results default to nearest first. An explicitly supplied supported `sort` retains its
  existing meaning.
- Distance is returned as `{ "value": 2.4, "unit": "km" }`, rounded to one decimal.
- The response envelope and pagination fields are unchanged.
- Listings without canonical `geoLocation` are safely absent from nearby results and
  remain available through all non-geospatial APIs.

Public visibility still requires `isActive: true` and excludes pending/rejected
moderation states. Verification is not publication authorization. Public responses do
not expose `geoLocation` or raw geospatial query fields.

## Backfill

`npm run backfill:gym-geolocation` is dry-run by default. It reports eligible and skipped
Gym records and performs no writes. `-- --apply` writes only records missing
`geoLocation` whose legacy coordinate pair is valid, so reruns are idempotent.
Production apply mode is additionally blocked unless an explicitly reviewed invocation
includes `--allow-production`. This tool must not be used as an automatic deployment
migration.

All nine current Gym seed fixtures contain valid legacy coordinate pairs and seed both
representations. Production data was not mutated or assumed to be complete.

## Future integration boundary

Geoapify will later resolve typed places to coordinates, and browser geolocation may
provide a customer's current coordinates. Both are clients of this backend contract;
neither supplies Gymssy marketplace inventory. Autocomplete, maps, directions, and UI
distance badges are outside this phase.

## Location resolution service

Geoapify resolves human-entered Indian places and addresses. It does not provide
Gymssy's businesses or marketplace inventory. Once a result supplies coordinates,
`/api/discover` searches Gymssy's own MongoDB inventory through the geospatial contract
described above.

Configure the backend-only environment variable:

```text
GEOAPIFY_API_KEY=
```

The value must be configured in the backend deployment environment. It must never be
placed in frontend source, API responses, logs, or committed files. Missing configuration
returns a sanitized `503` only from location-resolution endpoints; it does not prevent the
rest of the API from starting.

### Autocomplete

```http
GET /api/locations/autocomplete?q=Indiranagar&limit=5
GET /api/locations/autocomplete?q=Indira&lat=12.97&lng=77.64
```

- Public endpoint intended for customer search inputs.
- `q` is trimmed, whitespace-normalized, and must contain 2–120 characters.
- `limit` defaults to 5 and must be an integer from 1 through 10.
- Optional `lat` and `lng` must be supplied together and form a valid coordinate pair.
- All upstream requests use the hard country filter `countrycode:in`.
- Optional coordinates add Geoapify proximity bias in `longitude,latitude` order; they do
  not remove the India restriction.
- No arbitrary query parameters are forwarded.

### Forward geocoding

```http
GET /api/locations/geocode?q=100%20Feet%20Road%2C%20Indiranagar
Authorization: Bearer <business-or-admin-token>
```

Forward geocoding is limited to authenticated Admin and business users. Customer
autocomplete selections already provide coordinates, so exposing a second public paid
lookup is unnecessary. Its `q` is 3–250 characters and `limit` defaults to 1 with a
maximum of 5.

Both endpoints return normalized Gymssy results rather than raw Geoapify objects:

```json
{
  "success": true,
  "data": [{
    "id": "provider-owned-place-id",
    "label": "Indiranagar, Bengaluru, Karnataka, India",
    "name": "Indiranagar",
    "area": "Indiranagar",
    "city": "Bengaluru",
    "state": "Karnataka",
    "country": "India",
    "postcode": "560038",
    "latitude": 12.9784,
    "longitude": 77.6408,
    "type": "suburb"
  }]
}
```

Optional address fields are `null` when Geoapify omits them. `id` comes from Geoapify's
`place_id`; treat it as a provider-owned lookup identifier, not a permanent Gymssy ID.

### Availability, quota protection, and caching

Requests use native server-side `fetch` with a 5-second timeout. Missing configuration,
timeouts, network failures, and provider quota exhaustion return sanitized `503`
responses. Other invalid provider responses return `502`. Upstream response bodies,
authenticated URLs, and API keys are never returned or logged.

Location routes use a separate 60-requests-per-minute IP policy. This is intentionally
less restrictive than authentication throttling because autocomplete generates several
legitimate requests while typing. The current `express-rate-limit` memory store is
instance-local in Netlify Functions and therefore best-effort, not a globally coordinated
quota guarantee. Frontend debouncing remains required.

Successful responses use a bounded 200-entry in-memory cache. Autocomplete entries live
for 5 minutes and geocoding entries for 30 minutes. Cache keys contain normalized query
inputs but no secret. Netlify instances are ephemeral, so this cache reduces repeated
requests within warm instances only; it is not distributed or durable.

### Attribution and official references

The future UI displaying Geoapify-derived information must always show OpenStreetMap
attribution. When Gymssy uses Geoapify's Free plan it must also show a follow-link such as
`Powered by Geoapify` near the supplied information. Plan quotas and rate limits must be
monitored; autocomplete and geocoding currently cost one credit per request.

- [Geoapify Address Autocomplete API](https://apidocs.geoapify.com/docs/geocoding/address-autocomplete/)
- [Geoapify Forward Geocoding API](https://apidocs.geoapify.com/docs/geocoding/forward-geocoding/)
- [Geoapify country restriction guidance](https://apidocs.geoapify.com/how-to/addresses/restrict-address-search-country/)
- [Geoapify pricing and rate limits](https://www.geoapify.com/pricing/)
- [Geoapify terms and attribution](https://www.geoapify.com/terms-and-conditions/)
