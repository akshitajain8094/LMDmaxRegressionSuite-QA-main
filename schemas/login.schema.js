// Expected shape of a successful login response (required = must be there, type = kind of value)
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
      required: [
        'token',
        'account_id',
        'user_id',
        'email',
        'name',
        'role',
        'phone',
        'primary_company_id',
        'accessible_company_ids',
        'company',
      ],
      properties: {
        token: { type: 'string', minLength: 1 },
        account_id: { type: 'string', minLength: 1 },
        user_id: { type: 'string' },
        email: { type: 'string' },
        name: { type: 'string' },
        role: { type: 'string' },
        phone: { type: 'string' },
        primary_company_id: { type: 'string' },
        accessible_company_ids: { type: 'array', items: { type: 'string' } },
        company: {
          type: 'object',
          required: ['company_id', 'company_name'],
          properties: {
            company_id: { type: 'string' },
            company_name: { type: 'string' },
          },
        },
      },
    },
  },
};
