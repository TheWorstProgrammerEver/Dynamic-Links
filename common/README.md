# Common

Shared app contracts that need to be understood by both the React client and Supabase functions live here once Dynamic Links has persisted product features.

Keep this folder product-specific. General-purpose utilities that could reasonably become external packages belong in `lib`.

Custom Link Codes are URL path segment safe strings. The supported character set is letters, numbers, periods, hyphens, underscores, and tildes; slashes, spaces, percent escapes, query delimiters, fragments, and other characters are invalid. Custom codes are not bound to the random-code minimum length.
