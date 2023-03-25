export default [
  {
    method: 'get',
    path: '/user',
    dao: {
      schema: 'User',
      operator: 'read',
      filter: 'req.query.filter',
      select: 'req.query.select',
      sort: 'req.query.sort',
      populate: 'req.query.populate',
      count: true,
      skip: 'req.query.skip',
      limit: 'req.query.limit'
    }
  },
  {
    method: 'get',
    path: '/user/:id',
    cache: {
      key: 'req.params.id',
      expires: 60 // seconds
    },
    dao: {
      schema: 'User',
      operator: 'read',
      filter: {
        id: 'req.params.id'
      },
      select: 'req.query.select',
      populate: 'req.query.populate',
      one: true
    }
  },
  {
    method: 'post',
    path: '/user',
    dao: {
      schema: 'User',
      operator: 'create',
      populate: 'req.query.populate',
      data: 'req.body'
    }
  },
  {
    method: 'put',
    path: '/user/:id',
    dao: {
      schema: 'User',
      operator: 'update',
      filter: {
        id: 'req.params.id'
      },
      select: 'req.query.select',
      populate: 'req.query.populate',
      upsert: false,
      data: 'req.body'
    }
  },
  {
    method: 'delete',
    path: '/user/:id',
    dao: {
      schema: 'User',
      operator: 'delete',
      filter: {
        id: 'req.params.id'
      },
      select: 'req.query.select',
      populate: 'req.query.populate'
    }
  }
];
