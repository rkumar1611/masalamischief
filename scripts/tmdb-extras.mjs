// Trailer, cast, director and Wikipedia link for one TMDB title, in the compact shape the site reads.
// Shared by build-catalog.mjs (catalogue titles) and fetch-extras.mjs (our reviewed films).
// The TMDB request must append "videos,credits,external_ids" and pass VIDEO_LANGS as include_video_language.

export const EXTRA_APPEND = "videos,credits,external_ids";
// Trailers are often tagged with the film's own language rather than English, so ask for all of ours.
export const VIDEO_LANGS = "en,hi,ta,te,ml,kn,mr,bn,pa,ko,ja,null";
const CAST = 6;

// Best YouTube trailer: official trailers first, then any trailer, then teasers; bigger video wins a tie.
function trailerOf(d) {
  const rank = (v) => (v.type === "Trailer" ? 0 : 2) + (v.official ? 0 : 1);
  const best = (d.videos?.results || [])
    .filter((v) => v.site === "YouTube" && v.key && (v.type === "Trailer" || v.type === "Teaser"))
    .sort((a, b) => rank(a) - rank(b) || (b.size || 0) - (a.size || 0))[0];
  return best ? best.key : "";
}

// cast: [[person id, name, character, photo path]], dir: [[person id, name, photo path]] (series: creators).
export function extrasOf(d, kind) {
  const cast = (d.credits?.cast || []).slice(0, CAST)
    .map((c) => [c.id, c.name, (c.character || "").split(" / ")[0].slice(0, 32), c.profile_path || ""]);
  const dir = (kind === "tv" ? d.created_by || [] : (d.credits?.crew || []).filter((c) => c.job === "Director"))
    .slice(0, 2).map((c) => [c.id, c.name, c.profile_path || ""]);
  const tr = trailerOf(d);
  const wd = d.external_ids?.wikidata_id || "";
  return {
    ...(tr ? { tr } : {}),
    ...(cast.length ? { cast } : {}),
    ...(dir.length ? { dir } : {}),
    ...(wd ? { wd } : {}),
  };
}
