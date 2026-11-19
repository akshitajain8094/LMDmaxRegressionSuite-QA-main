// Expected shape of the Scorecard thresholds (GET /lmd/prfsrv/threshold/v3/threshold/weekly): one item per metric
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
      required: ['_id', 'threshold', 'company_id', 'is_active', 'type'],
      properties: {
        _id: { type: 'string' },
        company_id: { type: 'string' },
        is_active: { type: 'boolean' },
        type: { type: 'string' }, // "weekly" = Scorecard
        scorecard_type: { type: 'string' }, // "Scorecard will be sent as" (link or image)
        template: { type: 'string' }, // the message sent with the scorecard
        threshold: {
          type: 'array',
          items: {
            type: 'object',
            required: ['field', 'enable', 'order', 'values'],
            properties: {
              field: { type: 'string' }, // the metric, e.g. "fico_score"
              enable: { type: 'boolean' }, // the metric's switch
              order: { enum: ['normal', 'reverse'] }, // reverse = lower is better
              values: {
                type: 'array',
                items: {
                  type: 'object',
                  required: ['value'],
                  properties: {
                    // text ("800") for most metrics, a number (0) for some: BUG-API-005
                    value: { type: ['string', 'number'] },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};
