// Expected shape of the dashboard_drivers response for report_name=writeupReport (a list of write-ups)
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
          'title',
          'report_date',
          'report_type',
          'status',
        ],
        properties: {
          _id: { type: 'string' },
          driver_id: { type: 'string' },
          driver_name: { type: 'string' },
          title: { type: 'string' },
          report_date: { type: 'string' },
          report_type: { type: 'string' },
          status: { type: 'string' },
        },
      },
    },
  },
};
