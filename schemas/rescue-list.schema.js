// Expected shape of the rescue list (GET /lmd/prfsrv/rescue/v2/rescue): one item per rescue
module.exports = {
  type: 'object',
  required: ['success', 'status', 'message', 'data'],
  properties: {
    success: { type: 'boolean' },
    status: { type: 'number' },
    action: { type: ['string', 'null'] }, // null for the rescue APIs
    message: { type: 'string' },
    data: {
      type: 'array',
      items: {
        type: 'object',
        required: [
          '_id',
          'company_id',
          'date',
          'caller_id',
          'rescuer_id',
          'created_at',
          'updated_at',
          'metrics',
        ],
        properties: {
          _id: { type: 'string' },
          company_id: { type: 'string' },
          date: { type: 'string' }, // the day, e.g. "2026-08-13T00:00:00.000Z"
          // Numbers here, text ("38267") when the web app saves a rescue: BUG-API-005
          caller_id: { type: 'number' }, // the receiver (the driver who was rescued)
          rescuer_id: { type: 'number' },
          msg_sent: { type: 'boolean' },
          created_at: { type: 'string' },
          updated_at: { type: 'string' },
          metrics: {
            type: 'object',
            required: ['caller_name', 'rescuer_name', 'status'],
            properties: {
              caller_name: { type: 'string' },
              rescuer_name: { type: 'string' },
              status: { enum: ['Completed', 'Refuse'] },
              number_of_packages: { type: ['number', 'null'] },
              number_of_stops: { type: ['number', 'null'] },
              reason: { type: ['string', 'null'] },
            },
          },
        },
      },
    },
  },
};
