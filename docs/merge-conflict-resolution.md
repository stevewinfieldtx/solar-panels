# Resolving the `api/calculate-roi.js` merge conflict

If you run into the merge markers shown below when working with `api/calculate-roi.js`,
you need to keep the enhanced ROI logic that lives on the `codex/optimize-google-solar-api-usage`
branch. The `<<<<<<< main` block is the older implementation and should be discarded.

```
<<<<<<< main
// older block ...
=======
// enhanced logic ...
>>>>>>> codex/optimize-google-solar-api-usage
```

To fix the file:

1. Remove every line that begins with `<<<<<<<`, `=======`, or `>>>>>>>`.
2. Keep the helper functions (`normalizeCityName`, `filterProgramsForLocation`,
   `estimateProgramValue`, etc.) that were introduced on the Codex branch. They are required for
   incentive detection.
3. Retain the extended configuration fields (`shadeLossPercent`, `shadeImpactLevel`,
   `shadePeakHours`, and `shadeRecommendations`) and the incentive/shading summaries in the
   JSON response. They ensure the ROI endpoint continues to surface tree-loss and rebate details.
4. Save the file and re-run `npm test` or your preferred smoke checks.

Once the conflict is resolved you can stage and continue the merge:

```bash
git add api/calculate-roi.js
git merge --continue
```

If you accidentally kept the wrong side, reset the file and restart the merge step:

```bash
git checkout -- api/calculate-roi.js
```

Then follow the steps above again.
