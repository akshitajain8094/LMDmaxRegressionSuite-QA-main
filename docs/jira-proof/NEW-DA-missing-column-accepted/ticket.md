# DA Weekly Overview: a CSV without the "Transporter ID" column is accepted and empties the week for every driver

| Field | Value |
|---|---|
| Issue type | Bug |
| Priority | **High** |
| Severity | High |
| Screen | Workflow → Weekly → DA Weekly Overview (upload); Driver page → Weekly → DA Weekly Overview |
| Environment | Staging, web app + API https://staging-api.fleet.lmdmax.com |
| Found on | 2026-11-17 (staging, station AQWA 578, week 42 of 2026) |
| Confirmed | 2026-11-17 with the developers: the upload should refuse the file |
| QA reference | DA-08 (Report_Upload_Extraction_Test_Cases_v2) |
| Attach | video-missing-column-accepted.webm, 2-broken-file-success.png, 3-after-driver-page.png, api-proof.png, api-proof.txt, the test CSV |

**Summary:** the server accepts a DA Weekly Overview CSV with the "Transporter ID" column missing. It answers
"success", and replaces the whole week with rows that have no transporter ID. No driver gets their DA Weekly data
for that week any more. The admin sees "File Uploaded Successfully" and gets no warning. The same happens when the
"Overall Standing" column is missing.

**Before you start:** log in to the web app as a manager and choose station AQWA. Week 42 of 2026 must have DA
Weekly data. Make the test file: open Amazon's export `DSP_Overview_Dashboard_PAYA_DYY6_2026-W42.csv`, delete
the "Transporter ID" column, and save it as CSV with **the same file name**. The attached CSV is this file; rename it
back to `DSP_Overview_Dashboard_PAYA_DYY6_2026-W42.csv` before you use it.

**Steps to replicate**

1. Open Chad Elnahal's driver page (`/driver/weekly/33256`), choose Week 42, and look at **DA Weekly Overview**:
   it is filled.
2. Go to **Workflow → Weekly → DA Weekly Overview** and select **Week 42**.
3. Choose the test file and click **Upload File**. Click **Continue Anyway** on the DSP / station code warnings.
4. On "Data of this week already Exist… Do you want to update it?" click **Yes**.
5. Open Chad Elnahal's driver page again, Week 42, **DA Weekly Overview**.

**After the test:** upload the original export for week 42 again (steps 2–4) to restore the data.

**Expected result:** the upload is refused with a clear message naming the missing column, for example
"Transporter ID column is missing". The data already saved for week 42 does not change.

**Actual result:** "File Uploaded Successfully". All 140 rows of week 42 are replaced by rows without a
transporter ID, and every driver's page shows **"No Data Found"** under DA Weekly Overview for that week.
Uploading the file without the "Overall Standing" column is also accepted, and replaces the week.

**Business impact:** a wrong or edited export silently wipes a whole week of DA Weekly data for every driver. The
admin is told the upload worked. Overall Standing is then missing on the driver page, and in the places that use
DA Weekly data, until someone notices and uploads the correct file again.

**Technical details (for developers)**

- `POST /lmd/prfsrv/extract/v3/weekly` (multipart): `file` = the CSV without the "Transporter ID" column,
  `week_number=202642`, `report_name=da_weekly_overview_report`, `replace=true`.

| Step | Request | Result |
|---|---|---|
| Before | `GET /da_weekly_overview/v2/da_weekly_overview_report?week_number=202642` | 140 rows, 140 with a transporter_id |
| Upload | `POST /extract/v3/weekly` (file without "Transporter ID") | **200** `"success": true`, rows returned with `transporter_id: null` |
| After | same GET | 140 rows, **0** with a transporter_id |
| Driver lookup | same GET `&transporter_id=A3D7TKWA5X4ZCT` (Chad) | `data: []` |
| Restore | `POST /extract/v3/weekly` (original file) | 200, 140 rows with a transporter_id again |

- The same happens with the "Overall Standing" column removed: 200, and the week is replaced.
- The web app checks only the file name (`dsp_overview_dashboard`, week, DSP and station code), so it cannot catch
  this. The check of the required columns has to be done by the server, before the existing week is replaced.
