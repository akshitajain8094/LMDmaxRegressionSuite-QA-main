// Driver scorecard APIs one by one (Driver page -> Weekly tab, and Driver page -> Driver Rating History). Read only:
// nothing is saved. The checks across screens are in driver-scorecard-journeys.spec.js.
//
// WHAT IS CHECKED
// The scorecard of a week (Weekly tab -> ScoreCard)
//   TC-01 Week 34                                        CHECK: 1134 delivered, POD 99.9%, 770 POD opportunities,
//                                                               place 15 (S No.)
//   TC-02 Week 34                                        CHECK: matches the expected schema
//   TC-03 No week (the page opens with the latest week)  CHECK: the scorecard of week 34, the latest week
//   TC-04 A week without a scorecard (week 33)           CHECK: empty ("No Data Found" on the page)
//   TC-05 A driver who does not exist                    CHECK: empty
//   TC-06, TC-07 Known bugs: week 99, week "abc"         CHECK: 400 (without internal error text)
//   TC-08 No login                                       CHECK: 401
// The rating of a week (Weekly tab -> "Rating: Week 34")
//   TC-09 Week 34                                        CHECK: 8.89
//   TC-10 A week without a rating (week 33)              CHECK: no rating
//   TC-11 to TC-13 Known bugs: no week, no driver,       CHECK: 400 (without internal error text)
//         week "abc"
//   TC-14 No login                                       CHECK: 401
// All week's ratings (Weekly tab -> "View all week's ratings")
//   TC-15 6 weeks up to week 34 (the window's default)   CHECK: 8.81 in weeks 31 and 32, 8.89 in week 34, "no
//                                                               rating" (-0.01) in weeks 29, 30 and 33
//   TC-16 10 weeks                                       CHECK: weeks 25 to 34
//   TC-17 No driver                                      CHECK: 400 "params missing"
//   TC-18, TC-19 Known bugs: 0 or "abc" weeks, week 99   CHECK: 400
//   TC-20 No login                                       CHECK: 401
// Driver Rating History (Driver page -> Driver Rating History)
//   TC-21 Driver 36363                                   CHECK: week 34 = 8.89, weeks 31 and 32 = 8.81, week 33 = N/A
//   TC-22 No driver                                      CHECK: 400 "params missing"
//   TC-23 No login                                       CHECK: 401
// The POD report (Weekly tab -> POD - Quality Report)
//   TC-24 Week 34                                        CHECK: 770 opportunities, 769 success, 0 bypass, 1 reject
//                                                               (a blurry photo), POD 99.9%
//   TC-25 A week without a POD report (week 33)          CHECK: empty
//   TC-26 Known bug: week "abc"                          CHECK: 400 without internal error text
//   TC-27 No login                                       CHECK: 401
// The other reports of the Weekly tab
//   TC-28 PPS, WHC, DA Weekly Overview, customer         CHECK: 200 and a list (empty on DYY1 today, ENV-003)
//         feedback of week 34
//
// Driver: 36363 (transporter ID A3D7TKWA5X4ZCT), a staging driver of station DYY1 with scorecards in weeks 31, 32 and
// 34 of 2026 and a POD report in week 34.

const { test, expect } = require('@playwright/test');
const endpoints = require('../../../api/endpoints');
const addToReport = require('../../../api/report');
const loginAsTestUser = require('../../../api/auth');
const getSchemaErrors = require('../../../api/schema');
const driverScorecardSchema = require('../../../schemas/driver-scorecard.schema');

// The driver of these tests: the driver page uses the driver id, the scorecard the transporter ID
const driverId = '36363';
const transporterId = 'A3D7TKWA5X4ZCT';

// ---------- The scorecard of a week ----------

test(
  "TC-01: Verify that the scorecard of week 34 shows the driver's numbers of that week",
  { tag: ['@smoke', '@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.driverScorecard, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { transporter_id: transporterId, week_number: '202634' },
    });
    await addToReport(response);

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.current).toHaveLength(1);
    const scorecard = body.data.current[0];
    expect(scorecard.week_number).toBe(202634);
    expect(scorecard.transporter_id).toBe(transporterId);
    expect(scorecard.metrics.s_no).toBe('15'); // S No.
    expect(scorecard.metrics.delivered).toBe('1134');
    expect(scorecard.metrics.pod).toBe('99.9%'); // Photo-On-Delivery
    expect(scorecard.metrics.pod_opps).toBe('770'); // POD Opps.
  },
);

test(
  'TC-02: Verify that the scorecard matches the expected schema',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.driverScorecard, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { transporter_id: transporterId, week_number: '202634' },
    });
    await addToReport(response);

    const body = await response.json();
    expect(getSchemaErrors(body, driverScorecardSchema)).toBe('No errors');
  },
);

test(
  'TC-03: Verify that the scorecard without a week is the scorecard of the latest week',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();
    const headers = {
      'x-access-token': user.token,
      'x-access-user': user.account_id,
    };

    // The web app asks this first, when the Weekly tab opens
    const response = await request.get(endpoints.driverScorecard, {
      headers,
      params: { transporter_id: transporterId },
    });
    await addToReport(response);

    // The latest week of the ratings report (202634)
    const reportResponse = await request.get(endpoints.ratingsReport, {
      headers,
    });
    await addToReport(reportResponse);
    const report = await reportResponse.json();

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.data.current[0].week_number).toBe(202634);
    expect(body.data.current[0].week_number).toBe(report.week_number);
  },
);

test(
  'TC-04: Verify that a week without a scorecard returns an empty scorecard',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    // Week 33: the driver has no scorecard ("No Data Found" on the Weekly tab)
    const response = await request.get(endpoints.driverScorecard, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { transporter_id: transporterId, week_number: '202633' },
    });
    await addToReport(response);

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.data.current).toHaveLength(0);
    expect(body.data.trailing).toHaveLength(0);
  },
);

test(
  'TC-05: Verify that a driver who does not exist has no scorecard',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.driverScorecard, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { transporter_id: 'XYZ123', week_number: '202634' },
    });
    await addToReport(response);

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.data.current).toHaveLength(0);
  },
);

test(
  'TC-06: Verify that the scorecard of a week that does not exist (week 99) is rejected (BUG-API-001)',
  { tag: ['@regression', '@knownbug'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.driverScorecard, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { transporter_id: transporterId, week_number: '202699' },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
  },
);

test(
  'TC-07: Verify that the scorecard of week "abc" returns a clear error message (BUG-API-003)',
  { tag: ['@regression', '@knownbug'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.driverScorecard, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { transporter_id: transporterId, week_number: 'abc' },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.message).not.toContain('Cast to Number failed');
  },
);

test(
  'TC-08: Verify that the scorecard without x-access-token returns 401',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.driverScorecard, {
      headers: { 'x-access-user': user.account_id },
      params: { transporter_id: transporterId, week_number: '202634' },
    });
    await addToReport(response);

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.message).toBe('Not Authorized, token or account_id missing');
  },
);

// ---------- The rating of a week ----------

test(
  'TC-09: Verify that the rating of week 34 is 8.89',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.driverRating, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { driver_id: driverId, week_number: '202634' },
    });
    await addToReport(response);

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.rating).toBe('8.89');
  },
);

test(
  'TC-10: Verify that a week without a rating returns no rating',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    // Week 33: no rating ("N/A" in the web app)
    const response = await request.get(endpoints.driverRating, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { driver_id: driverId, week_number: '202633' },
    });
    await addToReport(response);

    expect(response.status()).toBe(200);
    const body = await response.json();
    // Today null. Other screens say -0.01 or "N/A" for the same thing: BUG-API-005. Update this check if it changes.
    expect(body.data.rating).toBeNull();
  },
);

test(
  'TC-11: Verify that the rating without a week is rejected (BUG-API-001)',
  { tag: ['@regression', '@knownbug'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    // The web app always sends the week
    const response = await request.get(endpoints.driverRating, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { driver_id: driverId },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
  },
);

test(
  'TC-12: Verify that the rating without a driver is rejected (BUG-API-001)',
  { tag: ['@regression', '@knownbug'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    // "View all week's ratings" and the Driver Rating History already answer 400 "params missing" here
    const response = await request.get(endpoints.driverRating, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { week_number: '202634' },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
  },
);

test(
  'TC-13: Verify that the rating of week "abc" returns a clear error message (BUG-API-003)',
  { tag: ['@regression', '@knownbug'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.driverRating, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { driver_id: driverId, week_number: 'abc' },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.message).not.toContain('Cast to Number failed');
  },
);

test(
  'TC-14: Verify that the rating without x-access-token returns 401',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.driverRating, {
      headers: { 'x-access-user': user.account_id },
      params: { driver_id: driverId, week_number: '202634' },
    });
    await addToReport(response);

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.message).toBe('Not Authorized, token or account_id missing');
  },
);

// ---------- All week's ratings ----------

test(
  "TC-15: Verify that all week's ratings show the ratings of the last 6 weeks",
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    // "View all week's ratings" opens with 6 weeks, up to the week of the Weekly tab
    const response = await request.get(endpoints.driverRatingGraph, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { driver_id: driverId, range: '6', week_number: '202634' },
    });
    await addToReport(response);

    expect(response.status()).toBe(200);
    const body = await response.json();
    // -0.01 = no rating ("N/A" in the web app)
    expect(body.data).toEqual({
      202629: -0.01,
      202630: -0.01,
      202631: '8.81',
      202632: '8.81',
      202633: -0.01,
      202634: '8.89',
    });
  },
);

test(
  "TC-16: Verify that all week's ratings for 10 weeks show weeks 25 to 34",
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.driverRatingGraph, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { driver_id: driverId, range: '10', week_number: '202634' },
    });
    await addToReport(response);

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(Object.keys(body.data)).toEqual([
      '202625',
      '202626',
      '202627',
      '202628',
      '202629',
      '202630',
      '202631',
      '202632',
      '202633',
      '202634',
    ]);
    expect(body.data['202634']).toBe('8.89');
  },
);

test(
  'TC-17: Verify that all week\'s ratings without a driver return "params missing"',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.driverRatingGraph, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { range: '6', week_number: '202634' },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.message).toBe('params missing');
  },
);

test(
  'TC-18: Verify that all week\'s ratings for 0 or "abc" weeks are rejected (BUG-API-001)',
  { tag: ['@regression', '@knownbug'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    // The window offers only 10, 8, 6 and 4 weeks
    for (const range of ['0', 'abc']) {
      const response = await request.get(endpoints.driverRatingGraph, {
        headers: {
          'x-access-token': user.token,
          'x-access-user': user.account_id,
        },
        params: { driver_id: driverId, range, week_number: '202634' },
      });
      await addToReport(response);

      expect(response.status(), 'range ' + range).toBe(400);
    }
  },
);

test(
  "TC-19: Verify that all week's ratings up to a week that does not exist (week 99) are rejected (BUG-API-001)",
  { tag: ['@regression', '@knownbug'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.driverRatingGraph, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { driver_id: driverId, range: '6', week_number: '202699' },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
  },
);

test(
  "TC-20: Verify that all week's ratings without x-access-token return 401",
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.driverRatingGraph, {
      headers: { 'x-access-user': user.account_id },
      params: { driver_id: driverId, range: '6', week_number: '202634' },
    });
    await addToReport(response);

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.message).toBe('Not Authorized, token or account_id missing');
  },
);

// ---------- Driver Rating History ----------

test(
  'TC-21: Verify that the Driver Rating History shows the rating of each week',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.driverRatingHistory, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { driver_id: driverId },
    });
    await addToReport(response);

    expect(response.status()).toBe(200);
    const body = await response.json();
    // One item per week, e.g. { year: '2026', week: '34', rating: '8.89' }
    const weeksOf2026 = body.data.filter((item) => item.year === '2026');
    const week = (number) => weeksOf2026.find((item) => item.week === number);
    expect(week('34').rating).toBe('8.89');
    expect(week('33').rating).toBe('N/A');
    expect(week('32').rating).toBe('8.81');
    expect(week('31').rating).toBe('8.81');
  },
);

test(
  'TC-22: Verify that the Driver Rating History without a driver returns "params missing"',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.driverRatingHistory, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.message).toBe('params missing');
  },
);

test(
  'TC-23: Verify that the Driver Rating History without x-access-token returns 401',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.driverRatingHistory, {
      headers: { 'x-access-user': user.account_id },
      params: { driver_id: driverId },
    });
    await addToReport(response);

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.message).toBe('Not Authorized, token or account_id missing');
  },
);

// ---------- The POD report ----------

test(
  'TC-24: Verify that the POD report of week 34 shows the photo-on-delivery numbers of the driver',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.podReport, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { week_number: '202634', transporter_id: transporterId },
    });
    await addToReport(response);

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.data).toHaveLength(1);
    const pod = body.data[0].metrics;
    expect(pod.opportunities).toBe('770');
    expect(pod.success).toBe('769');
    expect(pod.bypass).toBe('0');
    expect(pod.rejects).toBe('1');
    expect(pod.blurry_photo).toBe('1'); // the reason of the reject
    expect(pod.pod).toBe('99.9%');
  },
);

test(
  'TC-25: Verify that a week without a POD report returns an empty list',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.podReport, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { week_number: '202633', transporter_id: transporterId },
    });
    await addToReport(response);

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.data).toHaveLength(0);
  },
);

test(
  'TC-26: Verify that the POD report of week "abc" returns a clear error message (BUG-API-003)',
  { tag: ['@regression', '@knownbug'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.podReport, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { week_number: 'abc', transporter_id: transporterId },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.message).not.toContain('Cast to Number failed');
  },
);

test(
  'TC-27: Verify that the POD report without x-access-token returns 401',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.podReport, {
      headers: { 'x-access-user': user.account_id },
      params: { week_number: '202634', transporter_id: transporterId },
    });
    await addToReport(response);

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.message).toBe('Not Authorized, token or account_id missing');
  },
);

// ---------- The other reports of the Weekly tab ----------

test(
  'TC-28: Verify that the other reports of the Weekly tab answer with a list',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    // PPS, WHC, DA Weekly Overview and customer feedback, with the details the web app sends
    const reports = [
      { address: endpoints.ppsReport, params: {} },
      { address: endpoints.whcReport, params: {} },
      { address: endpoints.daWeeklyOverview, params: {} },
      {
        address: endpoints.customerFeedbackReport,
        params: { report_type: 'summary' },
      },
    ];
    for (const report of reports) {
      const response = await request.get(report.address, {
        headers: {
          'x-access-token': user.token,
          'x-access-user': user.account_id,
        },
        params: {
          ...report.params,
          week_number: '202634',
          transporter_id: transporterId,
        },
      });
      await addToReport(response);

      expect(response.status(), report.address).toBe(200);
      const body = await response.json();
      // Empty on DYY1 today: there is no such report for this station yet (ENV-003)
      expect(Array.isArray(body.data), report.address).toBe(true);
    }
  },
);
