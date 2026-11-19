// Driver rating APIs (Settings -> Rate your Drivers, and the ratings shown on the Leaderboard). Read only: the
// tests never change the weightages (that would change every driver's rating and rank).
//
// WHAT IS CHECKED
//   TC-01 The rating weightages ("Rate your Drivers")       CHECK: 23 metrics that add up to 10 points
//   TC-02 The ratings report                                CHECK: each average = total rating / number of weeks
//   TC-03 The Leaderboard's Rating column                   CHECK: = the driver's rating of the latest week in the
//                                                                  ratings report
//   TC-04 The ratings report                                CHECK: matches the expected schema
//   TC-05 The weightages without login                      CHECK: 401

const { test, expect } = require('@playwright/test');
const endpoints = require('../../../api/endpoints');
const addToReport = require('../../../api/report');
const loginAsTestUser = require('../../../api/auth');
const getSchemaErrors = require('../../../api/schema');
const ratingsReportSchema = require('../../../schemas/ratings-report.schema');

test(
  'TC-01: Verify that the rating weightages add up to 10 points',
  { tag: ['@smoke', '@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.ratingWeightages, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
    });
    await addToReport(response);

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    const weightages = body.data.weightages.map((metric) =>
      Number(metric.weightage),
    );
    expect(weightages).toHaveLength(23);
    const total = weightages.reduce((sum, weightage) => sum + weightage, 0);
    // "0 points remaining" in the web app: the 10-point scale is fully used
    expect(total).toBeCloseTo(10, 5);
  },
);

test(
  'TC-02: Verify that each average rating is the total rating divided by the number of weeks',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.ratingsReport, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
    });
    await addToReport(response);

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.data.length).toBeGreaterThan(0);
    // Each driver: the average (2 decimals, e.g. "8.84") = total rating / number of weeks (26.51 / 3 = 8.8366...)
    for (const driver of body.data) {
      expect(
        Number(driver.average_rating),
        'average rating of driver ' + driver.driver_id,
      ).toBeCloseTo(driver.total_rating / driver.total_weeks, 2);
    }
  },
);

test(
  "TC-03: Verify that the Leaderboard rating is the driver's rating of the latest week",
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();
    const headers = {
      'x-access-token': user.token,
      'x-access-user': user.account_id,
    };

    const reportResponse = await request.get(endpoints.ratingsReport, {
      headers,
    });
    await addToReport(reportResponse);
    const report = await reportResponse.json();
    // The latest week, e.g. 202634 -> "Week 34"
    const latestWeek = 'Week ' + String(report.week_number).slice(4);

    const leaderboardResponse = await request.get(
      endpoints.leaderboardDashboard,
      { headers },
    );
    await addToReport(leaderboardResponse);
    const leaderboard = await leaderboardResponse.json();

    // The drivers on the Leaderboard that have ratings (the report also has drivers who are no longer active)
    const ratedDrivers = leaderboard.data.filter((row) =>
      report.data.some((driver) => driver.driver_id === row.id),
    );
    expect(ratedDrivers.length).toBeGreaterThan(0);
    // Each of them: Leaderboard rating = the rating of the latest week in the report
    for (const row of ratedDrivers) {
      const inReport = report.data.find(
        (driver) => driver.driver_id === row.id,
      );
      expect(Number(row.rating), 'Leaderboard rating of driver ' + row.id).toBe(
        Number(inReport[latestWeek]),
      );
    }
  },
);

test(
  'TC-04: Verify that the ratings report matches the expected schema',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.ratingsReport, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
    });
    await addToReport(response);

    const body = await response.json();
    expect(getSchemaErrors(body, ratingsReportSchema)).toBe('No errors');
  },
);

test(
  'TC-05: Verify that the rating weightages without x-access-token return 401',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.ratingWeightages, {
      headers: { 'x-access-user': user.account_id },
    });
    await addToReport(response);

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.message).toBe('Not Authorized, token or account_id missing');
  },
);
