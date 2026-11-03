# Ihsan's Shop

A lightweight storefront for Ihsan's handmade products. It includes:

- A responsive storefront with placeholder product imagery
- Shopping bag with quantities and local browser persistence
- Phone-only checkout flow for calling `512-429-8551` during business hours CST
- Protected admin dashboard for products, prices, inventory, storefront copy, contact details, and accent color
- Dark mode toggle and optional background music with mute/unmute controls
- JSON-backed persistence in `data/store.json`

## Run locally

```bash
npm start
```

Then open [http://localhost:3000](http://localhost:3000).

For development with automatic restarts:

```bash
npm run dev
```

## Admin access

Open [http://localhost:3000/login.html](http://localhost:3000/login.html).

- Admin name: `Ihsan Khan`
- Password: `Ihsankhan2011!`

Change the password from the Account tab after signing in. For a deployment, set `SHOP_ADMIN_USERNAME` and `SHOP_ADMIN_PASSWORD` before the first run and use HTTPS.

## Deploy the full app

GitHub Pages can only serve static files, so the full storefront and protected admin dashboard need a Node host. This repository includes `render.yaml` for Render. In Render, choose **New → Blueprint**, connect this GitHub repository, and set `SHOP_ADMIN_PASSWORD` when prompted. Render will run the app using the included configuration and provide a public HTTPS URL.

## Notes

This is intentionally a phone-order checkout rather than a payment processor. The shop does not collect payment online. Product imagery is represented by designed placeholders until real photos are added.
