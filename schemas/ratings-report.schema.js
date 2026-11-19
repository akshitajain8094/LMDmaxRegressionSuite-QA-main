// Expected shape of the driver ratings report (GET /lmd/prfsrv/driver_rating/v2/get_ratings_report): one item per
// driver, with the rating of each week ("Week 34": "8.89") and the average
module.exports = {
  type: 'object',
  required: ['success', 'status', 'message', 'data', 'week_number'],
  properties: {
    success: { type: 'boolean' },
    status: { type: 'number' },
    message: { type: 'string' },
    week_number: { type: 'number' }, // the latest week, e.g. 202634
    data: {
      type: 'array',
      items: {
        type: 'object',
        required: [
          'driver_id',
          'transporter_id',
          'total_rating',
          'total_weeks',
          'average_rating',
        ],
        properties: {
          driver_id: { type: 'string' },
          transporter_id: { type: 'string' },
          total_rating: { type: 'number' },
          total_weeks: { type: 'number' },
          average_rating: { type: 'string' }, // e.g. "8.84"
        },
      },
    },
  },
};
