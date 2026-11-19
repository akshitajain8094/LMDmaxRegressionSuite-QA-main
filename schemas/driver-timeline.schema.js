// Expected shape of a driver's timeline (GET /lmd/prfsrv/driver_timeline/v3/get_timeline): one item per change
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
          'driver_id',
          'type',
          'action',
          'created_at',
        ],
        properties: {
          _id: { type: 'string' },
          company_id: { type: 'string' },
          driver_id: { type: 'string' },
          type: { type: 'string' }, // what changed, e.g. "driver_profile", "callout"
          action: { type: 'string' }, // "create", "edit" or "delete"
          previous_state: { type: ['object', 'null'] },
          current_state: { type: ['object', 'null'] },
          created_by_name: { type: ['string', 'null'] },
          upadated_by_name: { type: ['string', 'null'] }, // misspelled field name: BUG-API-014
          deleted_by_name: { type: ['string', 'null'] },
          created_at: { type: 'string' },
          updated_at: { type: 'string' },
        },
      },
    },
  },
};
