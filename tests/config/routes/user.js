export default [
  {
    method: 'get',
    path: '/user',
    dao: {
      schema: 'User',
      operator: 'read',
      filter: (data) => data.req.query.filter,
      select: (data) => data.req.query.select,
      sort: (data) => data.req.query.sort,
      populate: (data) => data.req.query.populate,
      count: true,
      skip: (data) => data.req.query.skip,
      limit: (data) => data.req.query.limit
    }
  },
  {
    method: 'get',
    path: '/user/:id',
    cache: {
      key: (data) => data.req.params.id,
      expires: 60 // seconds
    },
    dao: {
      schema: 'User',
      operator: 'read',
      filter: {
        id: (data) => data.req.params.id
      },
      select: (data) => data.req.query.select,
      populate: (data) => data.req.query.populate,
      one: true
    }
  },
  {
    method: 'post',
    path: '/user',
    dao: {
      schema: 'User',
      operator: 'create',
      populate: (data) => data.req.query.populate,
      data: (data) => data.req.body
    }
  },
  {
    method: 'put',
    path: '/user/:id',
    dao: {
      schema: 'User',
      operator: 'update',
      filter: {
        id: (data) => data.req.params.id
      },
      select: (data) => data.req.query.select,
      populate: (data) => data.req.query.populate,
      data: (data) => data.req.body,
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
        id: (data) => data.req.params.id
      },
      select: (data) => data.req.query.select,
      populate: (data) => data.req.query.populate
    }
  }
];
