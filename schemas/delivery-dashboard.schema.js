// Expected shape of the delivery_dashboard response: deliveries per driver and a graph
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
        // Station DYY1 has no delivery reports yet, so the fields of a driver row are unknown (ENV-003)
        driver_data: { type: 'array' },
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
