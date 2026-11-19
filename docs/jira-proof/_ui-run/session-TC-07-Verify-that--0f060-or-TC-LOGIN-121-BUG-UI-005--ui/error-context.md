# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ..\..\..\..\..\..\..\..\Softsensor\Downloads\LMDmaxRegressionSuite-QA-main\tests\ui\session.spec.js >> TC-07: Verify that after login the user lands on the page they asked for (TC_LOGIN_121) (BUG-UI-005)
- Location: tests\ui\session.spec.js:108:1

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected pattern: /your-scorecard/
Received string:  "https://staging.performance.lmdmax.com/v2/dashboard/daily-highlights"
Timeout: 30000ms

Call log:
  - Expect "toHaveURL" with timeout 30000ms
    7 × locator resolved to <html lang="en">…</html>
      - unexpected value "https://staging.performance.lmdmax.com/signIn"
    53 × locator resolved to <html lang="en">…</html>
       - unexpected value "https://staging.performance.lmdmax.com/v2/dashboard/daily-highlights"

```

```yaml
- img
- separator
- link "0":
  - /url: /v2/dashboard/daily-highlights
- img
- text: "0"
- img
- text: "0"
- link "0":
  - /url: /templates
- link "99+":
  - /url: /management/callouts
- link "0":
  - /url: /report
  - img
  - text: "0"
- link "0":
  - /url: /inventory
  - img
  - text: "0"
- link "0":
  - /url: /lmd_cloud
  - img
  - text: "0"
- img
- text: "0"
- heading "Welcome Chat Account0" [level=6]
- 'heading "LMDmax Chat #: 908-975-1721" [level=6]'
- combobox "Search Driver"
- button "Notes":
  - img
- button "Workflow"
- button "Notifications": "50"
- button "Settings"
- button "DYY1"
- button "Profile": CA
- tablist:
  - tab "Daily Highlights" [selected]
  - tab "Your Scorecard"
  - tab "Leaderboard"
- button "Nov 10, 2026 - Nov 16, 2026"
- heading "Safety" [level=4]
- separator
- paragraph: Netradyne
- button "The total count of unsafe driving events detected by Netradyne cameras for the selected date range. This includes Speeding, Seatbelt Off, Stop Sign, Traffic Light, Distractions, Following Distance, U-Turn violations, and Ementor.":
  - img
- heading "00 Violations" [level=6]
- img
- paragraph: 00 vs last 7 days
- img: 0 Violations
- heading "No Data Found" [level=6]
- heading "Team" [level=4]
- separator
- paragraph: Working Device
- button "The number of trips taken with a non-functional or disconnected Netradyne camera. A lower number indicates better device health across the fleet.":
  - img
- heading "00 Defects per 100 Trips" [level=6]
- img
- paragraph: Compliant
- paragraph: Callouts
- button "The total number of unscheduled absences, such as a \"No Call / No Show.":
  - img
- heading "00" [level=6]
- img
- paragraph: 00 vs last 7 days
- paragraph: E-Signature
- button "Total number of corrective action write-ups and acknowledgement forms issued to employees yet to be confirmed.":
  - img
- heading "43 Write Up" [level=6]
- heading "10 Acknowledgement Form" [level=6]
- separator
- paragraph: 04 writeups are not signed
- button
- paragraph: Rescue Activity
- button "The count of drivers who completed or declined assistance or a \"rescue\" from a teammate while on their route.":
  - img
- heading "00 Completed" [level=6]
- heading "00 Refused" [level=6]
- heading "Quality" [level=4]
- separator
- paragraph: DSB DNR Events
- button "The count of packages customers reported as \"Delivered Not Received\" (DNR) where the issue was linked to a controllable driver action, such as leaving a package in an unsecure location.":
  - img
- heading "00 Total" [level=6]
- img
- paragraph: 00 Drivers > 1 event
- paragraph: POD
- button "The percentage of delivery photos that meet quality standards and are usable for the customer. High-quality photos are clear, well-lit, and show the package in its final delivery location.":
  - img
- heading "00%" [level=6]
- img
- paragraph: 00% vs last 7 days
- paragraph: Delivery
- button:
  - img
- heading "00% DCR" [level=6]
- img
- paragraph: 00% vs last 7 days
- heading "00 Packages" [level=6]
- img
- paragraph: 00 vs last 7 days
- heading "Customer Negative Feedback" [level=6]
- button "The total count of negative ratings received directly from customers regarding the delivery experience. This can include issues like instructions not being followed or unprofessional service.":
  - img
- heading "00 Negative Feedbacks" [level=6]
- img
- paragraph: 00 vs last 7 days
- paragraph: Customer Complaints by Metric
- paragraph: No Data Available
- button "Smart Insights":
  - img
- img "PAPAYA LMD"
- heading "PAPAYA LMD" [level=6]
- heading "rtyrytrygfhf hfdhytry" [level=6]
- paragraph: Smart Insights
- 'heading "Unsigned Writeups: 1 drivers had more than 5 write-ups pending acknowledgment; immediate follow-up needed." [level=6]'
- button "LMDmax CoPilot":
  - img
  - text: LMDmax CoPilot
```

# Test source

```ts
  19  |   'TC-01: Verify that a page of the app without login opens the login page (TC_LOGIN_060)',
  20  |   { tag: ['@smoke', '@regression', '@pr'] },
  21  |   async ({ page }) => {
  22  |     await page.goto(dashboardUrl);
  23  | 
  24  |     await expect(page).toHaveURL(/signIn/);
  25  |     await expect(new LoginPage(page).signInButton).toBeVisible();
  26  |   },
  27  | );
  28  | 
  29  | test(
  30  |   'TC-02: Verify that the login page opens the dashboard when already logged in (TC_LOGIN_118)',
  31  |   { tag: ['@regression'] },
  32  |   async ({ page }) => {
  33  |     await logIn(page);
  34  | 
  35  |     await page.goto('/signIn');
  36  | 
  37  |     await expect(page).toHaveURL(/dashboard/);
  38  |   },
  39  | );
  40  | 
  41  | test(
  42  |   'TC-03: Verify that Back after login does not show the login page (TC_LOGIN_119)',
  43  |   { tag: ['@regression'] },
  44  |   async ({ page }) => {
  45  |     await logIn(page);
  46  | 
  47  |     await page.goBack();
  48  | 
  49  |     await expect(page).not.toHaveURL(/signIn/);
  50  |     await expect(new LoginPage(page).signInButton).toBeHidden();
  51  |   },
  52  | );
  53  | 
  54  | test(
  55  |   'TC-04: Verify that Log Out opens the login page, and Back does not show the dashboard again (TC_LOGIN_132, TC_LOGIN_120)',
  56  |   { tag: ['@smoke', '@regression', '@pr'] },
  57  |   async ({ page }) => {
  58  |     await logIn(page);
  59  | 
  60  |     const logoutRequest = page.waitForRequest(/user\/logout/);
  61  |     await new ProfileMenu(page).logOut();
  62  |     await logoutRequest;
  63  |     await expect(page).toHaveURL(/signIn/);
  64  | 
  65  |     await page.goBack();
  66  |     await expect(page).toHaveURL(/signIn/);
  67  |   },
  68  | );
  69  | 
  70  | test(
  71  |   'TC-05: Verify that Log Out in one tab logs out the other tab (TC_LOGIN_123)',
  72  |   { tag: ['@regression'] },
  73  |   async ({ page, context }) => {
  74  |     await logIn(page);
  75  |     const secondTab = await context.newPage();
  76  |     await secondTab.goto(dashboardUrl);
  77  |     await expect(secondTab).toHaveURL(/dashboard/);
  78  | 
  79  |     await new ProfileMenu(page).logOut();
  80  |     await expect(page).toHaveURL(/signIn/);
  81  | 
  82  |     // The user opens a page on the second tab. The tab may already be on its way to the login page by
  83  |     // itself, which stops the click; so try again until the login page shows
  84  |     await expect(async () => {
  85  |       await secondTab.goto(dashboardUrl);
  86  |       await expect(secondTab).toHaveURL(/signIn/, { timeout: 5000 });
  87  |     }).toPass({ timeout: 30000 });
  88  |   },
  89  | );
  90  | 
  91  | test(
  92  |   'TC-06: Verify that clearing cookies and stored data opens the login page (TC_LOGIN_127)',
  93  |   { tag: ['@regression'] },
  94  |   async ({ page, context }) => {
  95  |     await logIn(page);
  96  | 
  97  |     await context.clearCookies();
  98  |     await page.evaluate(() => {
  99  |       localStorage.clear();
  100 |       sessionStorage.clear();
  101 |     });
  102 |     await page.reload();
  103 | 
  104 |     await expect(page).toHaveURL(/signIn/);
  105 |   },
  106 | );
  107 | 
  108 | test(
  109 |   'TC-07: Verify that after login the user lands on the page they asked for (TC_LOGIN_121) (BUG-UI-005)',
  110 |   { tag: ['@regression', '@knownbug'] },
  111 |   async ({ page }) => {
  112 |     await page.goto('/v2/dashboard/your-scorecard');
  113 |     await expect(page).toHaveURL(/signIn/);
  114 | 
  115 |     const loginPage = new LoginPage(page);
  116 |     await loginPage.login(process.env.LOGIN_EMAIL, process.env.LOGIN_PASSWORD);
  117 | 
  118 |     // Today: Daily Highlights
> 119 |     await expect(page).toHaveURL(/your-scorecard/, { timeout: 30000 });
      |                        ^ Error: expect(page).toHaveURL(expected) failed
  120 |   },
  121 | );
  122 | 
```