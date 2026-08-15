# G31 Audit

## Scope

- Changed `index.html` only on the public site.
- Updated `copy/home.en.md` from the resulting visible homepage copy.
- Did not change CSS, component classes, images, stage-panel copy, social image alt text, or route mirrors.

## CSS Preconditions

The only `.home-rest` rule in `assets/home.css` and `assets/base.css` is:

```css
.home-rest {
  min-height: 0;
}
```

The text is not clipped because the shared homepage band retains these vertical paddings:

```css
.home-page .rest-band {
  margin-block: initial;
  margin-inline: calc(50% - 50vw);
  padding-block: var(--space-section);
  padding-inline: clamp(1.25rem, 6vw, 8rem);
}
```

The existing stacked-hero breakpoint is:

```css
@media (max-width: 1079px) {
  .hero__grid {
    grid-template-columns: minmax(0, 1fr);
    gap: 48px;
  }
}
```

## Text Counts

```text
Post arrives in two piles                            1
sorts their post by hand                             1
built for those two seconds                          1
cannot be judged flat                                1
Nobody can tell what is inside this envelope         1
The address on it was checked by hand                1
Notifications disappear                              3
nobody can tell what is inside                       1
A key is an obvious object                           0
You are buying a campaign                            0
aria-hidden="true"></div>                            2
—                                                    0
–                                                    0
→                                                    0
```

The supplied case-sensitive expectation for `nobody can tell what is inside` is inconsistent with its own COPY: the new sentence starts with uppercase `Nobody`. Case-insensitive counting returns `2`; the exact lowercase command returns `1`. The supplied text was not altered.

No listed American spelling form was added to the G31 copy.

## Browser Checks

| Viewport | H1 lines | Last line | Orphan | Overflow | Actions in viewport |
| --- | ---: | ---: | --- | --- | --- |
| 375 x 812 | 3 | 232 px | false | false | false |
| 768 x 1024 | 3 | 260 px | false | false | true |
| 1024 x 768 | 3 | 346 px | false | false | true |
| 1440 x 1000 | 3 | 486 px | false | false | true |
| 1920 x 1080 | 3 | 486 px | false | false | true |

- `h1` count: `1`.
- Hero lead paragraph count: `3`.
- `home-hero[aria-labelledby]` still resolves to `hero-title`.
- `#object-one[aria-labelledby]` still resolves to `object-one-label`.
- `.rest-band.home-rest` no longer has `aria-hidden`.
- At 1024 x 768, the actions end at 729 px; the panel starts at 817 px as expected from the existing breakpoint.
- From 375 through 895 in 20 px steps, line count remains `3` and orphan remains `false`; the explicit 900 px check is also `3` and `false`. There are no line-count or orphan transition widths in that interval.
- At 1440 the supplied maximum of two lines is not met: the exact COPY renders in three lines under the existing CSS. G31 forbids CSS, font-size, and markup changes, so this is reported without a self-directed style change.
- Browser console warnings and errors: `0`.

## Lighthouse

- Performance: `94`
- Accessibility: `96`
- Best Practices: `100`
- SEO: `100`

## Screenshots

For each of `375`, `768`, `1024`, `1440`, and `1920`, local screenshots are stored in `qa-screens/g31/` as:

- `<width>-hero.png`
- `<width>-plate.png`
- `<width>-rest.png`

## Deployment

- VPS release: `/var/www/coin.im/releases/20260815T113449Z`.
- Clean static release file count: `81`.
- Local and active `index.html` SHA-256: `a2926adadd5a65b748fc0b48b3782a2edaf53dea547ca6d76a58264f080f15d2`.
- `nginx -t` passed and Nginx is active.
- Required public routes returned HTTP 200, including `/`, `/ru`, `/es`, `/ms`, `/handling`, `/open`, `/api/open/health`, CSS assets, `robots.txt`, `sitemap.xml`, and `www.coin.im`.
- Production overflow checks passed at 375, 430, 768, 1024, 1440, and 1920 with no console warnings or errors.
- The `coin.im` certificate remains valid through 2026-11-13.
- No backend, DNS, mail, Cloudflare Worker, or Worker-route change was made.
