const NON_PUBLIC_MODERATION_STATUSES = ["pending", "rejected"];

/**
 * Adds the marketplace publication boundary to a model-specific query.
 *
 * Missing moderationStatus is intentionally public for legacy documents that
 * predate moderation. Explicit pending/rejected records are never public.
 * Verification and featured state are deliberately not publication gates.
 */
export function withPublicListingVisibility(filter = {}) {
  return {
    ...filter,
    isActive: true,
    moderationStatus: { $nin: NON_PUBLIC_MODERATION_STATUSES },
  };
}

export function isPubliclyVisibleListing(listing) {
  return Boolean(
    listing?.isActive === true &&
      !NON_PUBLIC_MODERATION_STATUSES.includes(listing?.moderationStatus),
  );
}

export { NON_PUBLIC_MODERATION_STATUSES };
