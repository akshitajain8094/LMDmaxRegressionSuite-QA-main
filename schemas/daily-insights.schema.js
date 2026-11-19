// Expected shape of the daily_insights response for type=dsp (a list of insights)
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
          'type',
          'title',
          'description',
          'color',
          'ids',
          'report_name',
          'key',
        ],
        properties: {
          type: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
          color: { type: 'string' },
          ids: { type: 'array', items: { type: 'number' } }, // text for type=drivers: BUG-API-005
          report_name: { type: 'string' },
          key: { type: 'number' },
        },
      },
    },
  },
};
