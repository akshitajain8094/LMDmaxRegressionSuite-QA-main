// Expected shape of the weekly_insights response for type=dsp (a list of insights)
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
          'report_name',
          'field',
          'ids',
          'key',
        ],
        properties: {
          type: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
          color: { type: 'string' },
          report_name: { type: 'string' },
          field: { type: 'string' },
          ids: { type: 'array', items: { type: 'string' } }, // Amazon transporter IDs
          key: { type: 'number' },
        },
      },
    },
  },
};
