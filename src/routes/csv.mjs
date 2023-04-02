export default [
  {
    // Upload documents from csv
    path: '/csv',
    method: 'post',
    uploads: {},
    dao: {
      schema: 'User',
      operator: 'create',
      format: 'csv',
      data: 'req.files.upload'
    }
  },
  {
    // Download document as CSV
    path: '/csv/:id',
    method: 'get',
    dao: {
      schema: 'User',
      operator: 'read',
      format: 'csv',
      filter: {
        id: 'req.params.id'
      },
      select: 'req.query.select',
      one: true
    }
  }
];
