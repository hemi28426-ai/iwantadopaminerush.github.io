# Deal Finder

Windows app that finds deals near a ZIP code and tells you what to bid.

- **Sources:** Facebook Marketplace, eBay auctions, K-BID auctions, Facebook group comment-auctions
- **Pricing:** eBay 6-month sold average (Terapeak, needs eBay sign-in), eBay sold/Buy It Now, Mercari sold, OfferUp, Amazon (new-price ceiling)
- **Advice:** worth, max bid / offer (~70% of resale value, minus shipping and buyer's premium), profit after eBay fees
- **Extras:** "Scan for deals" sweep, watched searches with Windows notifications, past-sales low/avg/high

Download the built app from the [Deal Finder page](https://hemi28426-ai.github.io/iwantadopaminerush.github.io/dealfinder/).

## How it works

An Electron app. `main.js` runs a small local web server (`http://127.0.0.1:47125`) that serves the UI in `ui/`,
and loads each site in hidden browser windows that share the user's signed-in session (`scrapers.js`, `groups.js`).
`pricing.js` matches comparable sales to each listing and works out the value and advice.

## Build

```bash
npm install --save-dev electron@33 electron-builder@25
npx electron .                                   # run it
npx electron . --dev                             # separate profile, port 47126
npx electron . --selftest "ps5" --zip 57223      # print a full search in the terminal
npx electron-builder --win portable              # -> release/DealFinder.exe
```
