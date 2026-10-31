# Masala Mischief

Indian and Hollywood film reviews with extra chilli. Hollywood films use `lang: "English"`, shown as
"Hollywood" on the site (see `LANG_LABELS` in `assets/data.js`). A plain HTML/CSS/JS site with no build step.

**Live:** reviews rated on the Masala Meter, mood/language/OTT-app suggestions, where to watch,
visitor ratings and watchlist, and Family Picks (`family.html`) with parent notes.
**Group Pick** (`group.html`): pick a vibe and languages to get a room of 10 films, share it on WhatsApp,
everyone swipes yes or no and posts their link back. There's no server: the link holds the films
(`?d=`) and everyone's votes (`?v=Name~1011…`), and each new share link includes all the votes so far.

## Files

| File | What it is |
|---|---|
| `index.html` | Home page |
| `reviews.html` | All reviews, with search, language filter and sort |
| `review.html?id=…` | A single review |
| `suggest.html` | "What should I watch?" (mood + language + dubs + OTT apps) |
| `family.html` | Family Picks with parent notes and an age filter |
| `assets/data.js` | **All films, reviews and moods. Edit this to add reviews.** |
| `assets/app.js` | Page rendering |
| `assets/style.css` | Styles (light and dark mode) |
| `functions/review.js` | Runs on Cloudflare: gives each review its own title, description and review text in the HTML, so WhatsApp previews and Google show the right film |
| `films.html` | Movies & series: the TMDB catalogue with search, filters and Top 50s |
| `film.html?id=<lang>-<tmdb id>` | A catalogue film we haven't reviewed (reviewed ones forward to their review) |
| `assets/catalog/` | The catalogue data, rebuilt every Sunday by `scripts/build-catalog.mjs` (`.github/workflows/weekly-catalog.yml`): 400 movies and 150 series per language (300 English series), plus 200 anime films and 300 anime series |
| `functions/film.js` | Runs on Cloudflare: per-film previews for catalogue pages |
| `functions/sitemap.xml.js` | Runs on Cloudflare: `/sitemap.xml`, listing every review automatically |
| `functions/api/` + `lib/community.js` | Audience ratings and reviews (Cloudflare D1 + Turnstile). New reviews wait for approval at `/admin`; set `REVIEWS_AUTOPUBLISH=1` in Cloudflare to publish without approval |
| `admin.html` | Private review admin (password = the `ADMIN_PASSWORD` setting in Cloudflare) |
| `privacy.html` | Privacy note and community rules |
| `robots.txt` | Points search engines at the sitemap |

The `functions/` files read the same `assets/data.js`, so there's nothing extra to update when you add a
review. They only run on Cloudflare; opening the site locally works as before.

## Run it locally

Double-click `index.html`. That's it.

## Add a review

Open `assets/data.js`, copy an existing film object, and change the fields. The `id` becomes the URL
(`review.html?id=your-id`), so use lowercase words joined by hyphens.

Other things you can edit in `assets/data.js`:

- `FEATURED_ID` – the film shown as "Pick of the week" on the home page.
- `NEW_ON_OTT` – the "New on OTT this week" strip. It updates itself: every morning GitHub runs
  `scripts/refresh-new-on-ott.mjs` (see `.github/workflows/refresh-new-on-ott.yml`), which adds the day's
  notable arrivals on Netflix, Prime Video, JioHotstar, ZEE5, SonyLIV, Sun NXT, aha and ManoramaMAX from
  JustWatch India, keeps 7 days, and commits only if something changed. You can still edit the list by
  hand, for example to write a better note; the script keeps existing items as they are. If the list is
  more than 10 days old, the heading changes to "Recently added" by itself.
- `WATCH` – where each film streams in India (from JustWatch India). Update `WATCH_CHECKED` when you re-check.
- `IMAGES` – posters and stills from TMDB, filled in automatically by the daily workflow
  (`scripts/fetch-images.mjs`, using the `TMDB_TOKEN` repository secret) for any film without one.
  Each entry's `match` says which TMDB film it picked; if one is wrong, edit it or delete it to retry.
- `PARENT_NOTES` – adding an entry puts a film into Family Picks. Levels are 0 none, 1 mild, 2 some, 3 strong.

Visitor ratings, the watchlist, chosen OTT apps and the light/dark choice are saved only in each
visitor's own browser. Nothing is sent to a server, and nothing is collected about children.
Visit counts come from Cloudflare Web Analytics (turned on in the Cloudflare dashboard): no cookies, no
personal profiles, just anonymous page-view totals.

After changing anything in `assets/`, bump the `?v=105` number on the `<link>`/`<script>` tags in every
`.html` file (e.g. to `?v=106`), otherwise returning visitors may keep seeing the old cached version.

The bundled reviews are starter copy in the house voice: rewrite them in your own words before
launch, and check the `audio` (dubbed languages) for each film, since that varies by platform.

## Publish: GitHub → Cloudflare Pages → GoDaddy domain

1. **Put the files on GitHub.** Install [GitHub Desktop](https://desktop.github.com/) (easiest) or Git,
   clone `rkumar1611/masalamischief`, copy these files into it, commit and push.
   Or, on github.com, open the repo → **Add file → Upload files** and drag everything in (keep the `assets` folder).
2. **Connect Cloudflare Pages.** Cloudflare dashboard → **Workers & Pages → Create → Pages →
   Connect to Git** → pick the repo. Settings:
   - Framework preset: **None**
   - Build command: *(leave empty)*
   - Build output directory: `/`

   Every push to `main` will redeploy automatically.
3. **Use your GoDaddy domain.** In the Pages project → **Custom domains → Set up a domain**.
   - Recommended: add the domain to Cloudflare (it gives you two nameservers), then in GoDaddy →
     **My Products → Domain → DNS → Nameservers → Change → "I'll use my own nameservers"** and paste
     Cloudflare's two. Takes from a few minutes to 24 hours.
   - Or keep DNS at GoDaddy and add a `CNAME` for `www` pointing to `<project>.pages.dev`.
     (Root-domain records are easier with Cloudflare nameservers.)
