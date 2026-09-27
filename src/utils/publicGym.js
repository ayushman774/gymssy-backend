const PUBLIC_GYM_FIELDS = [
  "_id", "name", "slug", "verified", "category", "tags", "location",
  "coordinates", "distance", "phone", "email", "website", "description",
  "highlights", "rating", "reviewCount", "priceFrom", "openNow", "images",
  "facilities", "memberships", "trainers", "classes", "timings", "reviews",
  "ratingBreakdown", "featured", "city", "createdAt", "updatedAt",
];

export function toPublicGym(value) {
  if (!value) return value;
  const gym = value.toObject?.() || value;
  return Object.fromEntries(
    PUBLIC_GYM_FIELDS
      .filter((field) => gym[field] !== undefined)
      .map((field) => [field, gym[field]]),
  );
}

export function toPublicGyms(values = []) {
  return values.map(toPublicGym);
}
