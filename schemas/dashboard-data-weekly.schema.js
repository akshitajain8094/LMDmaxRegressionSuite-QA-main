// Expected shape of the dashboard_data_weekly response for week_number=202634 (without compare_with)

// Every section is a list of metrics like { key: 'overall_standing', value: '76.80 | Fantastic' }
const metricList = {
  type: 'array',
  items: {
    type: 'object',
    required: ['key', 'value'],
    properties: {
      key: { type: 'string' },
      value: { type: 'string' },
    },
  },
};

module.exports = {
  type: 'object',
  required: ['success', 'status', 'action', 'message', 'week', 'data'],
  properties: {
    success: { type: 'boolean' },
    status: { type: 'number' },
    action: { type: 'string' },
    message: { type: 'string' },
    week: { type: 'string' }, // text here, but a number without week_number: BUG-API-005
    data: {
      type: 'object',
      required: ['safety_and_compliance', 'quality', 'service_reliability'],
      properties: {
        safety_and_compliance: metricList,
        quality: metricList,
        service_reliability: metricList,
      },
    },
  },
};
