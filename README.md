# Publish GOK Balloon Puzzle Solver

This folder is the **entire website**. Drop it on a static host.

## Site name (this is why rename fails)

Hosts only accept a **URL slug**, not a display title.

Use something like:

- `gok-balloons`
- `gok-balloon-solver`

Rules: **lowercase letters, numbers, and hyphens only**.  
Do **not** use spaces, capitals, or `GOK Balloon Puzzle Solver`.

The app title on the page can stay “GOK Balloon Puzzle Solver”. Only the project/site name is restricted.

## Fastest: Netlify Drop (~30 seconds)

1. Open https://app.netlify.com/drop
2. Drag **this whole folder** onto the page
3. After deploy, Site configuration → Change site name → `gok-balloons` (or similar)
4. Share the `*.netlify.app` link

## Cloudflare Pages

1. Go to https://pages.cloudflare.com and sign in
2. Create project → **Upload assets**
3. Project name: `gok-balloons` (slug rules above)
4. Upload this folder. No build command.
5. Deploy → share the `*.pages.dev` link

## After it is live

- iPhone: Safari → Share → **Add to Home Screen**
- Android: Chrome menu → **Install app**
