// Expected shape of the quality_dashboard response: quality per driver and a graph
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
        // Station DYY1 has no quality reports yet, so the fields of a driver row are unknown (ENV-003)
        driver_data: { type: 'array' },
        graph_data: {
          type: 'array',
          items: {
            type: 'object',
            required: ['label', 'value', 'color'],
            properties: {
              label: { type: 'string' },
              value: { type: 'number' },
              color: { type: 'string' },
            },
          },
        },
        start: { type: 'string' },
        end: { type: 'string' },
      },
    },
  },
};
