// Expected shape of the dashboard_data response (required = must be there, type = kind of value)

// Every safety metric (Braking, Speeding, ...) has this shape
const safetyMetric = {
  type: 'object',
  required: ['total', 'change', 'color', 'label', 'baseColor', 'drivers'],
  properties: {
    total: { type: 'number' },
    change: { type: 'number' },
    color: { type: 'string' },
    label: { type: 'string' },
    baseColor: { type: 'string' },
    drivers: { type: 'array' },
  },
};

// packages_delivered, dcr and pod have this shape
const trendMetric = {
  type: 'object',
  required: ['total', 'change', 'color'],
  properties: {
    total: { type: 'number' },
    change: { type: 'number' },
    color: { type: 'string' },
  },
};

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
      required: ['safety', 'quality', 'team'],
      properties: {
        safety: {
          type: 'object',
          required: [
            'Sign/Signal Violations',
            'Driver Distraction',
            'Following Distance',
            'Speeding Violations',
            'Seatbelt Compliance',
            'Acceleration',
            'Braking',
            'Cornering',
            'Speeding',
            'Distraction',
            'Seatbelt',
            'Total',
            'drivers',
          ],
          properties: {
            'Sign/Signal Violations': safetyMetric,
            'Driver Distraction': safetyMetric,
            'Following Distance': safetyMetric,
            'Speeding Violations': safetyMetric,
            'Seatbelt Compliance': safetyMetric,
            Acceleration: safetyMetric,
            Braking: safetyMetric,
            Cornering: safetyMetric,
            Speeding: safetyMetric,
            Distraction: safetyMetric,
            Seatbelt: safetyMetric,
            Total: {
              type: 'object',
              required: ['total', 'change', 'color', 'label'],
              properties: {
                total: { type: 'number' },
                change: { type: 'number' },
                color: { type: 'string' },
                label: { type: 'string' },
              },
            },
            drivers: { type: 'array' },
          },
        },
        quality: {
          type: 'object',
          required: [
            'DSB DNR',
            'packages_delivered',
            'dcr',
            'pod',
            'customer_negative_feedback',
          ],
          properties: {
            'DSB DNR': {
              type: 'object',
              required: ['total', 'drivers_with_more_than_1_dsb_dnr'],
              properties: {
                total: { type: 'number' },
                drivers_with_more_than_1_dsb_dnr: { type: 'number' },
              },
            },
            packages_delivered: trendMetric,
            dcr: trendMetric,
            pod: trendMetric,
            customer_negative_feedback: {
              type: 'object',
              required: [
                'total',
                'change',
                'color',
                'feedback_counts',
                'top_drivers',
              ],
              properties: {
                total: { type: 'number' },
                change: { type: 'number' },
                color: { type: 'string' },
                feedback_counts: {
                  type: 'object',
                  additionalProperties: { type: 'number' }, // any field names, every value a number
                },
                top_drivers: { type: 'array' },
              },
            },
          },
        },
        team: {
          type: 'object',
          required: [
            'writeup',
            'working_devices',
            'callouts',
            'rescue',
            'acknowledgement',
          ],
          properties: {
            writeup: {
              type: 'object',
              required: ['total', 'unsigned'],
              properties: {
                total: { type: 'number' },
                unsigned: { type: 'number' },
              },
            },
            working_devices: {
              type: 'object',
              required: ['total', 'expected'],
              properties: {
                total: { type: 'number' },
                expected: { type: 'number' },
              },
            },
            callouts: {
              type: 'object',
              required: ['total', 'excused', 'unexcused', 'change'],
              properties: {
                total: { type: 'number' },
                excused: { type: 'number' },
                unexcused: { type: 'number' },
                change: { type: 'string' }, // text, not a number: BUG-API-005
              },
            },
            rescue: {
              type: 'object',
              required: ['completed', 'refused'],
              properties: {
                completed: { type: 'number' },
                refused: { type: 'number' },
              },
            },
            acknowledgement: {
              type: 'object',
              required: ['total', 'unsigned'],
              properties: {
                total: { type: 'number' },
                unsigned: { type: 'number' },
              },
            },
          },
        },
      },
    },
  },
};
