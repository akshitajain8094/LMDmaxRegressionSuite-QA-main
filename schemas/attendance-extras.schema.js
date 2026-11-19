// Expected shape of the attendance_extras response: call-outs per driver (4 kinds) and a graph
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
      required: ['driver_data', 'graph_data', 'start', 'end'],
      properties: {
        driver_data: {
          type: 'array',
          items: {
            type: 'object',
            required: [
              'Name',
              'driver_id',
              'excused_callout',
              'unexcused_callout',
              'assigned_other_job',
              'sent_home',
            ],
            properties: {
              Name: { type: 'string' },
              driver_id: { type: 'number' },
              excused_callout: { type: 'number' },
              unexcused_callout: { type: 'number' },
              assigned_other_job: { type: 'number' },
              sent_home: { type: 'number' },
            },
          },
        },
        graph_data: {
          type: 'array',
          items: {
            type: 'object',
            required: ['label', 'value'],
            properties: {
              label: { type: 'string' },
              value: { type: 'number' },
              color: { type: 'string' }, // the Total item has no color
            },
          },
        },
        start: { type: 'string' },
        end: { type: 'string' },
      },
    },
  },
};
