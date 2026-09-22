// When adding a new tag, if the user's input case-insensitively matches a
// tag already used on another book, use that existing tag's casing - so
// the same concept ("Favori" vs "favori") always collects under one string
// across books. Returns the user's input as-is if there's no match.
export function resolveTagCasing(value, existingTags) {
  const match = existingTags.find((tag) => tag.toLowerCase() === value.toLowerCase());
  return match || value;
}
