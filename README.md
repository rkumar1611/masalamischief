# Masala Mischief

Indian and Hollywood film reviews with extra chilli. Hollywood films use `lang: "English"`, shown as
"Hollywood" on the site (see `LANG_LABELS` in `assets/data.js`). A plain HTML/CSS/JS site with no build step.

**Live:** reviews rated on the Masala Meter, mood/language/OTT-app suggestions, where to watch,
visitor ratings and watchlist, and Family Picks (`family.html`) with parent notes.
**Coming soon:** Group Pick (`group.html`) is a teaser page for now.

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

## Run it locally

Double-click `index.html`. That's it.

## Add a review

Open `assets/data.js`, copy an existing film object, and change the fields. The `id` becomes the URL
(`review.html?id=your-id`), so use lowercase words joined by hyphens.

Other things you can edit in `assets/data.js`:

- `FEATURED_ID` – the film shown as "Pick of the week" on the home page.
- `WATCH` – where each film streams in India (from JustWatch India). Update `WATCH_CHECKED` when you re-check.
- `PARENT_NOTES` – adding an entry puts a film into Family Picks. Levels are 0 none, 1 mild, 2 some, 3 strong.

Visitor ratings, the watchlist, chosen OTT apps and the light/dark choice are saved only in each
visitor's own browser. Nothing is sent to a server, and nothing is collected about children.

After changing anything in `assets/`, bump the `?v=3` number on the `<link>`/`<script>` tags in every
`.html` file (e.g. to `?v=3`), otherwise returning visitors may keep seeing the old cached version.

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
