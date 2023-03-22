export default [
  {
    method: 'post',
    path: '/user/:id',
    schema: 'User',
    operator: 'read',
    cache: {
      key: 'req.params.id',
      expires: 60 * 60
    },
    filter: 'req.query.filter',
    select: 'req.query.select',
    sort: 'req.query.sort',
    populate: 'req.query.populate',
    one: false,
    count: true,
    skip: 0,
    limit: 10
  }
];
