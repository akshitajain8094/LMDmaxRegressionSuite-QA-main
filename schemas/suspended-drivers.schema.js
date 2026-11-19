// Expected shape of the suspended drivers report (GET /lmd/prfsrv/suspended/v3/get_suspended_drivers): one item
// per suspension
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
          '_id',
          'company_id',
          'id',
          'start',
          'end',
          'notes',
          'status',
          'is_suspended',
        ],
        properties: {
          _id: { type: 'string' }, // the suspension
          company_ownership_id: { type: 'string' },
          company_id: { type: 'string' },
          id: { type: 'string' }, // the driver
          start: { type: 'string' },
          end: { type: 'string' },
          notes: { type: 'string' }, // "Add Details" in the Suspend window
          status: { type: 'string' }, // always "suspended"
          is_suspended: { type: 'boolean' }, // true until the driver is resumed
          write_ups: { type: 'number' },
        },
      },
    },
  },
};
