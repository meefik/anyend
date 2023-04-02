export default [
  {
    // Download file
    path: '/file/:id',
    method: 'get',
    storage: {
      bucket: 'anyend',
      filename: 'req.params.id'
    }
  },
  {
    // Upload file
    path: '/file',
    method: 'post',
    uploads: {},
    storage: {
      bucket: 'anyend',
      filename: 'req.params.id',
      data: 'req.files.upload'
    }
  }
];
