import http from './http';

export function listTransactions({
  page = 1,
  limit = 10,
  search = '',
  range = '30d',
  user = '',
  model = '',
  tokenType = '',
} = {}) {
  return http.get('/api/transactions', {
    params: {
      page,
      limit,
      search: search || undefined,
      range,
      user: user || undefined,
      model: model || undefined,
      tokenType: tokenType || undefined,
    },
  });
}

export function getTransactionsSummary({ range = '30d', user = '' } = {}) {
  return http.get('/api/transactions/summary', {
    params: {
      range,
      user: user || undefined,
    },
  });
}
