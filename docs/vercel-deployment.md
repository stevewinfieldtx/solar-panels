# Deploying to Vercel

Follow these steps to get the Solar Roof Analyzer running on Vercel.

## 1. Connect the repository
1. Push your latest code to GitHub (the repo URL is typically `https://github.com/<user>/solar-panels`).
2. Visit [https://vercel.com/new](https://vercel.com/new) and import the repository.
3. Accept the defaults for the project root (the repo root) and keep the framework preset as **Other**.

## 2. Configure environment variables
Add the same secrets you use locally under **Settings → Environment Variables**:

| Name | Description |
| ---- | ----------- |
| `GOOGLE_SOLAR_API_KEY` | Required for the Google Solar API requests. |
| `OPENEI_API_KEY` | Used to fetch local utility rates. |

Add any other custom keys you rely on in development. Apply the variables to the Production (and Preview/Development if you plan to use those) environments.

## 3. Confirm build settings
Vercel automatically detects npm projects. Make sure the settings match the following:

- **Install Command:** `npm install`
- **Build Command:** leave blank unless you introduce a build step (static assets in `public/` do not need one)
- **Output Directory:** `public`

The existing `vercel.json` in the repository routes requests under `/api/*` to the Node serverless functions (for example `/api/calculate-roi`).

## 4. Deploy
Click **Deploy**. Vercel will install dependencies and upload the static assets plus serverless functions. When the build completes you will receive a production URL.

## 5. Validate the deployment
Open the production URL and verify:

1. Enter an address on the landing page and confirm roof analysis works.
2. Launch the ROI calculator from the results page, complete the inputs, and ensure `/api/calculate-roi` returns numbers (no errors about missing API keys).
3. Review the Vercel **Functions** tab to confirm the serverless endpoints are healthy.

## 6. Ongoing updates
Each push to the connected GitHub branch triggers a new deployment. Use the Vercel dashboard to:

- Promote preview deployments to production.
- Re-run failed builds.
- Rotate environment variables without redeploying code.

With these steps the application should mirror the local experience on Vercel, including the richer ROI analysis and shading-aware calculations.
