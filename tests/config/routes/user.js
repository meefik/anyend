export default [
  {
    method: 'get',
    path: '/user',
    dao: {
      schema: 'User',
      operator: 'read',
      filter: (req) => req.query.filter,
      select: (req) => req.query.select,
      sort: (req) => req.query.sort,
      populate: (req) => req.query.populate,
      count: true,
      skip: (req) => req.query.skip,
      limit: (req) => req.query.limit
    }
  },
  {
    method: 'get',
    path: '/user/:id',
    cache: {
      key: (req) => req.params.id,
      expires: 60 // seconds
    },
    dao: {
      schema: 'User',
      operator: 'read',
      filter: {
        id: (req) => req.params.id
      },
      select: (req) => req.query.select,
      populate: (req) => req.query.populate,
      one: true
    }
  },
  {
    method: 'post',
    path: '/user',
    dao: {
      schema: 'User',
      operator: 'create',
      populate: (req) => req.query.populate,
      data: (req) => req.body
    }
  },
  {
    method: 'put',
    path: '/user/:id',
    dao: {
      schema: 'User',
      operator: 'update',
      filter: {
        id: (req) => req.params.id
      },
      select: (req) => req.query.select,
      populate: (req) => req.query.populate,
      data: (req) => req.body,
      upsert: false
    }
  },
  {
    method: 'delete',
    path: '/user/:id',
    dao: {
      schema: 'User',
      operator: 'delete',
      filter: {
        id: (req) => req.params.id
      },
      select: (req) => req.query.select,
      populate: (req) => req.query.populate
    }
  }
];
