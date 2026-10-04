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
