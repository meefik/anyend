export default [
  {
    // Upload documents from csv
    path: '/csv',
    method: 'post',
    dao: {
      schema: 'User',
      operator: 'create',
      format: 'csv',
      data: 'req.body'
    }
  },
  {
    // Download documents as CSV
    path: '/csv',
    method: 'get',
    dao: {
      schema: 'User',
      operator: 'read',
      format: 'csv',
      filter: 'req.query.filter',
      select: 'req.query.select'
      // one: true
    }
  }
];
