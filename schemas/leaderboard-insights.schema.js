// Expected shape of the compare/v3/insights response (the 3 Smart Insights on the Leaderboard tab)

// Each insight is a rank change of one driver, or null when there is none
const rankChange = {
  type: ['object', 'null'],
  required: ['driver_id', 'from', 'to', 'diff'],
  properties: {
    driver_id: { type: 'string' },
    from: { type: 'number' },
    to: { type: 'number' },
    diff: { type: 'number' },
  },
};

module.exports = {
  type: 'object',
  required: ['success', 'status', 'action', 'message', 'data'],
  properties: {
    success: { type: 'boolean' },
    status: { type: 'number' },
    action: { type: 'string' },
    message: { type: 'string' },
    data: {
      type: 'object',
      required: ['performance_spike', 'huge_rank_drop', 'consistent_topper'],
      properties: {
        performance_spike: rankChange,
        huge_rank_drop: rankChange,
        consistent_topper: { type: ['object', 'null'] },
      },
    },
  },
};
