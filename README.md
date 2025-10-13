\# Solar Roof Analyzer



AI-powered solar roof analysis using Google Solar API and satellite imagery.



\## Features



\- 🏠 Automatic roof detection from address

\- 🛰️ Satellite imagery analysis

\- 📊 Roof segment efficiency ratings

\- 💡 Smart panel placement recommendations

\- 🗺️ Interactive 3D map visualization



\## Setup



1\. Install dependencies:

```bash

npm install

\## Additional documentation

- [Workspace export & local sync](docs/workspace-export.md)
- [Folder navigation tips](docs/folder-navigation.md)
- [Local navigation commands](docs/local-navigation.md)
- [Vercel deployment guide](docs/vercel-deployment.md)
- [Sample narrative report](docs/narrative-report-example.md)
- [Resolve `api/calculate-roi.js` merge conflicts](docs/merge-conflict-resolution.md)

\## Deploying to Vercel

1\. Push the repository to GitHub so Vercel can import it.
2\. Open https://vercel.com/new and select the repo (framework preset **Other** is fine).
3\. Add environment variables under *Settings → Environment Variables*:
   - `GOOGLE_SOLAR_API_KEY`
   - `OPENEI_API_KEY`
4\. Keep the default build settings (Install `npm install`, Build command empty, Output `public`).
5\. Deploy and test `/api/analyze-roof` and `/api/calculate-roi` from the live URL to confirm the keys are working.
6\. Future pushes to the linked branch will redeploy automatically.
