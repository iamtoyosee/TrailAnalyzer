# Backend

The analyzer lives here: CloudTrail events in, `report.json` out.

The only requirement from the UI's side: the output must validate against [`../schema/report.schema.json`](../schema/report.schema.json). Field-by-field notes are in [`../docs/report-contract.md`](../docs/report-contract.md).

To see your output in the UI, run `npm run dev` in `frontend/`, click **Open report** and pick your `report.json`. You can also open the live site with `?report=<url>`.
