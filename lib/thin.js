// Which pages are too thin to offer to search engines. They stay on the site for visitors (cast links, search, lists);
// they only carry "noindex" and are left out of the sitemaps, so Google judges the site by the pages that have something
// to say. Used by functions/film.js, functions/person.js and scripts/build-catalog.mjs (the sitemaps): keep to this one place.

// A film or series: on no app in India, not from this year or last (so nothing in cinemas or just out), and hardly
// known (under 5 votes on TMDB). Such a page can only say "not streaming anywhere".
export const thinTitle = (f, year = new Date().getFullYear()) =>
  !(f.w || []).length && !((f.y || 0) >= year - 1) && (f.n || 0) < 5;

// An actor or director: three titles or fewer and no biography, so the page is little more than a short list.
export const thinPerson = (titleCount, hasBio) => titleCount <= 3 && !hasBio;
