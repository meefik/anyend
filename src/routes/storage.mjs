export default [
  {
    path: '/storage',
    method: 'post',
    uploads: { multiples: true },
    async middleware (req, res, next) {
      const file = req.files.upload;
      const { mongo, minio } = global;
      const Attach = mongo.model('Attach');
      const attach = new Attach({
        filename: file.originalFilename,
        mimetype: file.mimetype,
        size: file.size
      });
      try {
        await minio.fPutObject(minio.defaultBucket, attach.id, file.filepath);
        // await minio.setObjectTagging(minio.defaultBucket, attach.id, { attached: 0 });
        await attach.save();
        res.json({
          attach
        });
      } finally {
        file.destroy();
      }
    }
  },
  {
    path: '/storage/:id',
    method: 'get',
    async middleware (req, res, next) {
      const { mongo, minio } = global;
      const attach = await mongo.model('Attach').findById(req.params.id);
      if (req.query.download) {
        res.header(
          'Content-Disposition',
          `attachment; filename="${attach.filename}"`
        );
        res.header('Content-Type', attach.mimetype);
        res.header('Content-Length', attach.size);
        res.header('Accept-Ranges', 'bytes');
        let stream;
        if (req.headers.range) {
          const {
            1: bytesUnit,
            2: firstBytePos = 0,
            3: lastBytePos = attach.size - 1
          } = String(req.headers.range).match(/(bytes)=([0-9]+)?-([0-9]+)?/) || [];
          if (bytesUnit === 'bytes') {
            const length = parseInt(lastBytePos) - parseInt(firstBytePos) + 1;
            res.header('Content-Length', length);
            res.header('Content-Range', `bytes ${firstBytePos}-${lastBytePos}/${attach.size}`);
            res.status(206);
            stream = await minio.getPartialObject(minio.defaultBucket, attach.id, parseInt(firstBytePos), length);
          }
        } else {
          stream = await minio.getObject(minio.defaultBucket, attach.id);
        }
        stream.pipe(res);
      } else {
        res.json(attach);
      }
    }
  }
];
