// Expected shape of the compare/v3/dashboard response (the Leaderboard table: one item per driver)
module.exports = {
  type: 'object',
  required: ['success', 'status', 'action', 'message', 'data'],
  properties: {
    success: { type: 'boolean' },
    status: { type: 'number' },
    action: { type: 'string' },
    message: { type: 'string' },
    data: {
      type: 'array',
      items: {
        type: 'object',
        required: [
          'id',
          'name',
          'status',
          'rank',
          'rating',
          'rating_scale',
          'overall_standing',
          'infraction',
          'writeup',
          'callout',
        ],
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          status: { type: 'string' },
          rank: { type: ['number', 'null'] }, // null = not ranked
          rating: { type: ['number', 'null'] }, // null = "N/A" in the table
          rating_scale: { type: 'number' },
          overall_standing: { type: 'string' },
          infraction: { type: 'number' },
          writeup: { type: 'number' },
          callout: { type: 'number' },
        },
      },
    },
  },
};
