# Masala Mischief

Indian and Hollywood film reviews with extra chilli. Hollywood films use `lang: "English"`, shown as
"Hollywood" on the site (see `LANG_LABELS` in `assets/data.js`). A plain HTML/CSS/JS site with no build step.

**Phase 1 (live):** reviews rated on the Masala Meter, and mood- and language-based suggestions.
**Coming soon:** Group Pick (`group.html`) and Family Picks (`family.html`) are teaser pages for now.

## Files

| File | What it is |
|---|---|
| `index.html` | Home page |
| `reviews.html` | All reviews, with search, language filter and sort |
| `review.html?id=…` | A single review |
| `suggest.html` | "What should I watch?" (mood + language + dubs) |
| `assets/data.js` | **All films, reviews and moods. Edit this to add reviews.** |
| `assets/app.js` | Page rendering |
| `assets/style.css` | Styles (light and dark mode) |

## Run it locally

Double-click `index.html`. That's it.

## Add a review

Open `assets/data.js`, copy an existing film object, and change the fields. The `id` becomes the URL
(`review.html?id=your-id`), so use lowercase words joined by hyphens.

After changing anything in `assets/`, bump the `?v=2` number on the `<link>`/`<script>` tags in every
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
