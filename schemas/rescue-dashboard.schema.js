// Expected shape of the rescue_dashboard response: rescues per driver and a graph
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
            required: ['Name', 'driver_id', 'Completed', 'Refused', 'Received'],
            properties: {
              Name: { type: 'string' },
              driver_id: { type: 'number' },
              Completed: { type: 'number' },
              Refused: { type: 'number' },
              Received: { type: 'number' },
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
