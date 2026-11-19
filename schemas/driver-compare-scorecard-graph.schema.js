// Expected shape of the driver_compare_scorecard_graph response: current and trailing value per week
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
      required: ['field'],
      properties: {
        field: { type: 'string' },
      },
      // Every other key is a week (e.g. 202634); values are text (e.g. "1132"), or -0.01 when there is no data
      additionalProperties: {
        type: 'object',
        required: ['current', 'trailing'],
        properties: {
          current: { type: ['string', 'number'] },
          trailing: { type: ['string', 'number'] },
        },
      },
    },
  },
};
