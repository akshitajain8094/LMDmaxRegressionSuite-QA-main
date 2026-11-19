// SCENARIOS: the manager looks at a driver's weekly scorecard (Driver page -> Weekly tab) and the other screens that
// show the same numbers. API only, no browser: each step sends the same request as the web app. Read only: nothing is
// saved, so these tests can run at any time.
//
// TC-01 The rating of week 34 is the same on every screen
//   1. Weekly tab: "Rating: Week 34"                              CHECK: 8.89
//   2. "View all week's ratings" (6 weeks)                        CHECK: week 34 = 8.89
//   3. Driver Rating History                                      CHECK: week 34 of 2026 = 8.89
//   4. The ratings report of all drivers                          CHECK: "Week 34" = 8.89
//   5. Leaderboard                                                CHECK: Rating = 8.89
// TC-02 The manager chooses week 32 in the week picker
//   1. The ScoreCard of week 32                                   CHECK: week 32, 461 delivered, POD 99.7%
//   2. "Rating: Week 32"                                          CHECK: 8.81
//   3. The Weekly Scorecard Trend (weeks 27 to 32)                CHECK: its week 32 shows the ScoreCard's S No. (18)
// TC-03 Every rated driver (the 7 drivers of the ratings report)
//   1. The rating of each week in the ratings report, in "View    CHECK: the same everywhere
//      all week's ratings" (10 weeks) and in the Driver Rating
//      History
//   2. The ratings report's total and number of weeks             CHECK: = the week ratings added up and counted
// TC-04 The POD numbers agree
//   1. ScoreCard of week 34: Photo-On-Delivery and POD Opps.      CHECK: = the POD report's POD % and opportunities
//   2. The POD report of week 34 of every rated driver            CHECK: success + bypass + rejects = opportunities;
//                                                                        rejects = its reasons added up;
//                                                                        POD % = success / opportunities
// TC-05 The Weekly Scorecard Trend shows the ScoreCard's numbers
//   For S No., Delivered and Photo-On-Delivery, in weeks 31, 32   CHECK: the trend = the ScoreCard of that week
//   and 34
// Known bug: it fails until the bug is fixed.
// TC-06 BUG-API-005: "no rating" (week 33) has the same form on the Weekly tab, in "View all week's ratings" and in
//       the Driver Rating History                                 CHECK: the same (today null, -0.01 and "N/A")
//
// Driver: 36363 (transporter ID A3D7TKWA5X4ZCT), a staging driver of station DYY1 with scorecards in weeks 31, 32 and
// 34 of 2026, a POD report in week 34, and ratings 8.81 (weeks 31 and 32) and 8.89 (week 34).

const { test, expect } = require('@playwright/test');
const endpoints = require('../../../api/endpoints');
const addToReport = require('../../../api/report');
const loginAsTestUser = require('../../../api/auth');

const driverId = '36363';
const transporterId = 'A3D7TKWA5X4ZCT';

// ---------- Journeys ----------

test(
  'TC-01: Verify that the rating of week 34 is the same on every screen',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();
    // The manager's login, sent with every request
    const headers = {
      'x-access-token': user.token,
      'x-access-user': user.account_id,
    };

    // 1. Weekly tab: "Rating: Week 34"
    const ratingResponse = await request.get(endpoints.driverRating, {
      headers,
      params: { driver_id: driverId, week_number: '202634' },
    });
    await addToReport(ratingResponse);
    const rating = await ratingResponse.json();

    // 2. "View all week's ratings" (6 weeks)
    const graphResponse = await request.get(endpoints.driverRatingGraph, {
      headers,
      params: { driver_id: driverId, range: '6', week_number: '202634' },
    });
    await addToReport(graphResponse);
    const graph = await graphResponse.json();

    // 3. Driver Rating History
    const historyResponse = await request.get(endpoints.driverRatingHistory, {
      headers,
      params: { driver_id: driverId },
    });
    await addToReport(historyResponse);
    const history = await historyResponse.json();
    const week34 = history.data.find(
      (item) => item.year === '2026' && item.week === '34',
    );

    // 4. The ratings report of all drivers
    const reportResponse = await request.get(endpoints.ratingsReport, {
      headers,
    });
    await addToReport(reportResponse);
    const report = await reportResponse.json();
    const inReport = report.data.find(
      (driver) => driver.driver_id === driverId,
    );

    // 5. Leaderboard
    const leaderboardResponse = await request.get(
      endpoints.leaderboardDashboard,
      { headers },
    );
    await addToReport(leaderboardResponse);
    const leaderboard = await leaderboardResponse.json();
    const onLeaderboard = leaderboard.data.find((row) => row.id === driverId);

    expect(rating.data.rating).toBe('8.89');
    expect(graph.data['202634']).toBe('8.89');
    expect(week34.rating).toBe('8.89');
    expect(inReport['Week 34']).toBe('8.89');
    expect(Number(onLeaderboard.rating)).toBe(8.89);
  },
);

test(
  'TC-02: Verify that choosing week 32 shows the scorecard, the rating and the trend of week 32',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();
    const headers = {
      'x-access-token': user.token,
      'x-access-user': user.account_id,
    };

    // The web app sends these requests when the manager chooses week 32 in the week picker
    // 1. The ScoreCard of week 32
    const scorecardResponse = await request.get(endpoints.driverScorecard, {
      headers,
      params: { transporter_id: transporterId, week_number: '202632' },
    });
    await addToReport(scorecardResponse);
    const scorecard = await scorecardResponse.json();
    const week32 = scorecard.data.current[0];
    expect(week32.week_number).toBe(202632);
    expect(week32.metrics.delivered).toBe('461');
    expect(week32.metrics.pod).toBe('99.7%');

    // 2. "Rating: Week 32"
    const ratingResponse = await request.get(endpoints.driverRating, {
      headers,
      params: { driver_id: driverId, week_number: '202632' },
    });
    await addToReport(ratingResponse);
    const rating = await ratingResponse.json();
    expect(rating.data.rating).toBe('8.81');

    // 3. The Weekly Scorecard Trend of S No. (6 weeks up to week 32)
    const trendResponse = await request.get(
      endpoints.driverCompareScorecardGraph,
      {
        headers,
        params: {
          transporter_id: transporterId,
          field: 's_no',
          range: '6',
          week_number: '202632',
        },
      },
    );
    await addToReport(trendResponse);
    const trend = await trendResponse.json();
    expect(Object.keys(trend.data)).toContain('202627');
    expect(trend.data['202632'].current).toBe(week32.metrics.s_no);
  },
);

test(
  'TC-03: Verify that each rated driver has the same week ratings on every screen, and that the totals add up',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();
    const headers = {
      'x-access-token': user.token,
      'x-access-user': user.account_id,
    };

    // The ratings report: the rated drivers, with the rating of each of the last 10 weeks ("Week 34": "8.89")
    const reportResponse = await request.get(endpoints.ratingsReport, {
      headers,
    });
    await addToReport(reportResponse);
    const report = await reportResponse.json();
    expect(report.data.length).toBeGreaterThan(0);

    for (const driver of report.data) {
      // "View all week's ratings" for 10 weeks, and the Driver Rating History of this driver
      const graphResponse = await request.get(endpoints.driverRatingGraph, {
        headers,
        params: {
          driver_id: driver.driver_id,
          range: '10',
          week_number: String(report.week_number),
        },
      });
      await addToReport(graphResponse);
      const graph = await graphResponse.json();
      const historyResponse = await request.get(endpoints.driverRatingHistory, {
        headers,
        params: { driver_id: driver.driver_id },
      });
      await addToReport(historyResponse);
      const history = await historyResponse.json();

      // The 10 weeks of "View all week's ratings": -0.01 there means no rating, "N/A" in the report and the history
      const weeks = Object.keys(graph.data).map((week) => ({
        year: week.slice(0, 4), // 202634 -> "2026"
        number: week.slice(4), // 202634 -> "34"
        rating: graph.data[week] === -0.01 ? 'N/A' : graph.data[week],
      }));
      // Each week: the same rating in the ratings report and in the Driver Rating History
      for (const week of weeks) {
        const label = 'driver ' + driver.driver_id + ', week ' + week.number;
        expect(driver['Week ' + week.number], 'ratings report, ' + label).toBe(
          week.rating,
        );
        const inHistory = history.data.find(
          (item) => item.year === week.year && item.week === week.number,
        );
        expect(inHistory.rating, 'rating history, ' + label).toBe(week.rating);
      }
      // The report's total = the week ratings added up; its number of weeks = the weeks with a rating
      const ratedWeeks = weeks.filter((week) => week.rating !== 'N/A');
      const total = ratedWeeks.reduce(
        (sum, week) => sum + Number(week.rating),
        0,
      );
      expect(
        driver.total_rating,
        'total rating of driver ' + driver.driver_id,
      ).toBeCloseTo(total, 2);
      expect(
        driver.total_weeks,
        'number of weeks of driver ' + driver.driver_id,
      ).toBe(ratedWeeks.length);
    }
  },
);

test(
  'TC-04: Verify that the POD numbers of the ScoreCard and of the POD report agree and add up',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();
    const headers = {
      'x-access-token': user.token,
      'x-access-user': user.account_id,
    };

    // 1. The ScoreCard and the POD report of week 34 of driver 36363
    const scorecardResponse = await request.get(endpoints.driverScorecard, {
      headers,
      params: { transporter_id: transporterId, week_number: '202634' },
    });
    await addToReport(scorecardResponse);
    const scorecard = await scorecardResponse.json();
    const metrics = scorecard.data.current[0].metrics;
    const podResponse = await request.get(endpoints.podReport, {
      headers,
      params: { week_number: '202634', transporter_id: transporterId },
    });
    await addToReport(podResponse);
    const pod = await podResponse.json();
    expect(metrics.pod).toBe(pod.data[0].metrics.pod); // Photo-On-Delivery 99.9%
    expect(metrics.pod_opps).toBe(pod.data[0].metrics.opportunities); // 770

    // 2. The POD report of week 34 of every rated driver: its numbers add up
    const reportResponse = await request.get(endpoints.ratingsReport, {
      headers,
    });
    await addToReport(reportResponse);
    const report = await reportResponse.json();
    // The reasons why a photo was rejected
    const rejectReasons = [
      'blurry_photo',
      'human_in_the_picture',
      'no_package_detected',
      'package_in_car',
      'package_in_hand',
      'package_not_clearly_visible',
      'package_too_close',
      'photo_too_dark',
      'other',
    ];
    let checkedDrivers = 0;
    for (const driver of report.data) {
      const response = await request.get(endpoints.podReport, {
        headers,
        params: {
          week_number: '202634',
          transporter_id: driver.transporter_id,
        },
      });
      await addToReport(response);
      const body = await response.json();
      // Drivers without a POD report this week have an empty list, so nothing is checked for them
      for (const row of body.data) {
        const numbers = row.metrics;
        const label = 'POD report of driver ' + driver.driver_id + ': ';
        const opportunities = Number(numbers.opportunities);
        expect(
          Number(numbers.success) +
            Number(numbers.bypass) +
            Number(numbers.rejects),
          label + 'success + bypass + rejects',
        ).toBe(opportunities);
        const reasons = rejectReasons.reduce(
          (sum, reason) => sum + Number(numbers[reason]),
          0,
        );
        expect(reasons, label + 'the reject reasons added up').toBe(
          Number(numbers.rejects),
        );
        // POD % = success / opportunities, with 1 decimal (769 / 770 = 99.87 -> "99.9%")
        const percent =
          (
            Math.round((Number(numbers.success) / opportunities) * 1000) / 10
          ).toFixed(1) + '%';
        expect(numbers.pod, label + 'POD %').toBe(percent);
        checkedDrivers++;
      }
    }
    expect(checkedDrivers).toBeGreaterThan(0);
  },
);

test(
  'TC-05: Verify that the Weekly Scorecard Trend shows the numbers of the ScoreCard of each week',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();
    const headers = {
      'x-access-token': user.token,
      'x-access-user': user.account_id,
    };

    // The ScoreCards of the weeks with a scorecard
    const scorecards = {};
    for (const week of ['202631', '202632', '202634']) {
      const response = await request.get(endpoints.driverScorecard, {
        headers,
        params: { transporter_id: transporterId, week_number: week },
      });
      await addToReport(response);
      const body = await response.json();
      scorecards[week] = body.data.current[0].metrics;
    }

    // The trend of 6 weeks up to week 34, for S No., Delivered and Photo-On-Delivery
    for (const field of ['s_no', 'delivered', 'pod']) {
      const response = await request.get(
        endpoints.driverCompareScorecardGraph,
        {
          headers,
          params: {
            transporter_id: transporterId,
            field,
            range: '6',
            week_number: '202634',
          },
        },
      );
      await addToReport(response);
      const trend = await response.json();
      for (const week of Object.keys(scorecards)) {
        expect(trend.data[week].current, field + ', week ' + week).toBe(
          scorecards[week][field],
        );
      }
    }
  },
);

// ---------- Known bug: this fails until the bug is fixed (docs/known-bugs/api-bugs.md) ----------

test(
  'TC-06: Verify that "no rating" has the same form on the Weekly tab, in all week\'s ratings and in the history (BUG-API-005)',
  { tag: ['@regression', '@knownbug'] },
  async ({ request }) => {
    const user = await loginAsTestUser();
    const headers = {
      'x-access-token': user.token,
      'x-access-user': user.account_id,
    };

    // Week 33: the driver has no rating
    const ratingResponse = await request.get(endpoints.driverRating, {
      headers,
      params: { driver_id: driverId, week_number: '202633' },
    });
    await addToReport(ratingResponse);
    const rating = await ratingResponse.json();

    const graphResponse = await request.get(endpoints.driverRatingGraph, {
      headers,
      params: { driver_id: driverId, range: '6', week_number: '202634' },
    });
    await addToReport(graphResponse);
    const graph = await graphResponse.json();

    const historyResponse = await request.get(endpoints.driverRatingHistory, {
      headers,
      params: { driver_id: driverId },
    });
    await addToReport(historyResponse);
    const history = await historyResponse.json();
    const week33 = history.data.find(
      (item) => item.year === '2026' && item.week === '33',
    );

    // Today: null on the Weekly tab, -0.01 in all week's ratings, "N/A" in the history
    expect(rating.data.rating).toBe(graph.data['202633']);
    expect(graph.data['202633']).toBe(week33.rating);
  },
);
