// Expected shape of the netradyne_dashboard response: safety violations per driver and a graph
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
              'netradyne_id',
              'Sign/Signal Violations',
              'Driver Distraction',
              'Following Distance',
              'Speeding Violations',
              'Seatbelt Compliance',
            ],
            properties: {
              Name: { type: 'string' },
              netradyne_id: { type: 'string' },
              'Sign/Signal Violations': { type: 'number' },
              'Driver Distraction': { type: 'number' },
              'Following Distance': { type: 'number' },
              'Speeding Violations': { type: 'number' },
              'Seatbelt Compliance': { type: 'number' },
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
