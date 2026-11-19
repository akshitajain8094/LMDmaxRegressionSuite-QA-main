// Expected shape of the dsp_scorecard_graph response: one value per week
module.exports = {
  type: 'object',
  required: ['success', 'status', 'action', 'message', 'field', 'data'],
  properties: {
    success: { type: 'boolean' },
    status: { type: 'number' },
    action: { type: 'string' },
    message: { type: 'string' },
    field: { type: 'string' },
    data: {
      type: 'object',
      // Key = week (e.g. 202634); value = score text (e.g. "Fantastic"), or -0.01 when there is no data
      additionalProperties: { type: ['string', 'number'] },
    },
  },
};
