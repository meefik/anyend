export default [
  {
    // Download file
    path: '/file/:id',
    method: 'get',
    storage: {
      bucket: 'neux',
      filename: (req) => req.params.id
    }
  },
  {
    // Upload file
    path: '/file',
    method: 'post',
    uploads: {},
    storage: {
      bucket: 'neux',
      filename: (req) => req.params.id,
      data: (req) => req.files.upload
    }
  }
];
