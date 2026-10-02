const PUBLIC_PROFESSIONAL_FIELDS = [
  "_id",
  "id",
  "name",
  "slug",
  "category",
  "role",
  "specialty",
  "experience",
  "sessions",
  "rating",
  "reviews",
  "clients",
  "certifications",
  "specializations",
  "bio",
  "available",
  "featured",
  "image",
  "social",
  "href",
  "isVerified",
  "createdAt",
  "updatedAt",
];

function toPublicProfessional(value, { includeCategory }) {
  if (!value) return value;
  const professional = value.toObject?.() || value;

  return Object.fromEntries(
    PUBLIC_PROFESSIONAL_FIELDS
      .filter((field) => includeCategory || field !== "category")
      .filter((field) => professional[field] !== undefined)
      .map((field) => [field, professional[field]]),
  );
}

export function toPublicTrainer(value) {
  return toPublicProfessional(value, { includeCategory: true });
}

export function toPublicTrainers(values = []) {
  return values.map(toPublicTrainer);
}

export function toPublicNutritionist(value) {
  return toPublicProfessional(value, { includeCategory: false });
}

export function toPublicNutritionists(values = []) {
  return values.map(toPublicNutritionist);
}
