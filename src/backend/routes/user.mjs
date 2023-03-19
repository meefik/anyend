export default [
  {
    method: 'post',
    path: '/:id',
    roles: ['admin'],
    cache: {
      key: 'req.params.id',
      expires: 60
    },
    middleware: [{
      schema: 'User',
      operator: 'read',
      filter: 'req.query.filter',
      select: 'req.query.select',
      sort: 'req.query.sort',
      populate: 'req.query.populate',
      one: false,
      count: true,
      skip: 0,
      limit: 10
    }]
  }
];
