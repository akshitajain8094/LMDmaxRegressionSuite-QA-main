// Expected shape of the call-out list (GET /lmd/prfsrv/call_out/v2/call_out): one item per call-out
module.exports = {
  type: 'object',
  required: ['success', 'status', 'message', 'data'],
  properties: {
    success: { type: 'boolean' },
    status: { type: 'number' },
    action: { type: ['string', 'null'] }, // null for the call-out APIs
    message: { type: 'string' },
    data: {
      type: 'array',
      items: {
        type: 'object',
        required: [
          '_id',
          'company_id',
          'date',
          'driver_id',
          'msg_sent',
          'created_by',
          'created_from_app_type',
          'created_at',
          'updated_at',
          'metrics',
        ],
        properties: {
          _id: { type: 'string' },
          company_id: { type: 'string' },
          date: { type: 'string' }, // the day, e.g. "2026-09-24T00:00:00.000Z"
          driver_id: { type: 'number' }, // a number here, text in the other driver APIs: BUG-API-005
          msg_sent: { type: 'boolean' }, // true after "Send Message"
          created_by: { type: 'string' }, // account_id of the manager
          created_from_app_type: { type: 'string' }, // "2" = the performance web app, "8" = Scheduler
          updated_by: { type: 'string' },
          updated_from_app_type: { type: 'string' },
          created_at: { type: 'string' },
          updated_at: { type: 'string' },
          metrics: {
            type: 'object',
            required: ['name', 'callout_time', 'status', 'excused'],
            properties: {
              name: { type: 'string' }, // the driver's name
              callout_time: { type: 'string' }, // the call-out type, e.g. "Sick" (the web app's "Callout Type")
              status: { type: 'string' }, // always "callout"
              excused: { enum: ['Yes', 'No'] },
              reason: { type: ['string', 'null'] },
            },
          },
        },
      },
    },
  },
};
