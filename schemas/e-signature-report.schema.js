// Expected shape of the manager's write-up report (e-signature get_report): one item per write-up
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
          'driver_id',
          'driver_name',
          'report_type',
          'report_date',
          'status',
          'violation',
          'notes',
          'channels',
          'link',
          'created_at',
          'updated_at',
        ],
        properties: {
          _id: { type: 'string' },
          company_id: { type: 'string' },
          driver_id: { type: 'string' },
          driver_name: { type: 'string' },
          created_by_name: { type: 'string' },
          title: { type: 'string' },
          message: { type: 'string' },
          report_type: { type: 'string' }, // "write-up" or "ack" (acknowledgement)
          report_date: { type: 'string' },
          status: { type: 'string' }, // "draft", "sent", "signed" or "refused_to_sign"
          refused_by: { type: 'string' },
          refused_reason: { type: 'string' },
          violation: { type: 'array', items: { type: 'string' } },
          notes: { type: 'string' },
          channels: { type: 'array', items: { type: 'string' } },
          driver_sign_url: { type: ['string', 'null'] },
          driver_sign_date: { type: ['string', 'null'] },
          link: { type: 'string' },
          created_at: { type: 'string' },
          updated_at: { type: 'string' },
        },
      },
    },
  },
};
