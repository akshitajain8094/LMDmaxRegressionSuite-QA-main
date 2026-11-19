// Expected shape of a driver's scorecard (GET /lmd/prfsrv/scorecard/v2/compare, Driver page -> Weekly -> ScoreCard):
// the "current" scorecard of the week, and the "trailing" one (no DYY1 driver has trailing data)
module.exports = {
  type: 'object',
  required: ['success', 'status', 'message', 'data', 'week_number'],
  properties: {
    success: { type: 'boolean' },
    status: { type: 'number' },
    message: { type: 'string' },
    // A number (202634) without week_number in the request, a text ("202634") with it: BUG-API-005
    week_number: { type: ['number', 'string'] },
    data: {
      type: 'object',
      required: ['current', 'trailing'],
      properties: {
        current: {
          type: 'array',
          items: {
            type: 'object',
            required: [
              '_id',
              'company_id',
              'week_number',
              'transporter_id',
              'metrics',
              'report_type',
            ],
            properties: {
              _id: { type: 'string' },
              company_id: { type: 'string' },
              week_number: { type: 'number' }, // e.g. 202634
              transporter_id: { type: 'string' },
              report_type: { const: 'current' },
              metrics: {
                type: 'object',
                required: [
                  's_no',
                  'transporter_id',
                  'delivered',
                  'pod',
                  'pod_opps',
                ],
                properties: {
                  s_no: { type: 'string' }, // "S No.": the driver's place in the scorecard
                  delivered: { type: 'string' },
                  pod: { type: 'string' }, // "Photo-On-Delivery", e.g. "99.9%"
                  pod_opps: { type: 'string' }, // "POD Opps."
                },
                // Every other metric is a text too, e.g. "0.0", "883" or "No Data"
                additionalProperties: { type: 'string' },
              },
            },
          },
        },
        trailing: { type: 'array' },
      },
    },
  },
};
