import fs from 'node:fs';

export default [
  {
    path: '/file',
    method: 'post',
    uploads: { multiples: true },
    async middleware (req, res, next) {
      for (const name in req.files) {
        const file = req.files[name];
        const data = fs.readFileSync(file.filepath, { encoding: 'utf8' });
        console.log(JSON.parse(data));
      }
      res.json(req.files);
    }
  },
  {
    path: '/storage',
    method: 'post',
    uploads: { multiples: true },
    async middleware (req, res, next) {
      if (!req.files) {
        res.status(401);
        next(new Error('Bad request'));
      }
      const file = req.files.upload;
      const { db, getMinioClient, defaultBucket } = global.context;
      const minio = getMinioClient();
      const Attach = db.model('Attach');
      const attach = new Attach({
        filename: file.originalFilename,
        mimetype: file.mimetype,
        size: file.size
      });
      let stream;
      try {
        stream = fs.createReadStream(file.filepath);
        await minio.putObject(defaultBucket, attach.id, stream);
        // await minio.setObjectTagging(minio.defaultBucket, attach.id, { attached: 0 });
        await attach.save();
        res.json(attach);
      } catch (err) {
        next(err);
      } finally {
        if (stream) stream.destroy();
        file.destroy();
      }
    }
  },
  {
    path: '/storage/:id',
    method: 'get',
    async middleware (req, res, next) {
      const { db, getMinioClient, defaultBucket } = global.context;
      const minio = getMinioClient();
      const attach = await db.model('Attach').findById(req.params.id);
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
            stream = await minio.getPartialObject(defaultBucket, attach.id, parseInt(firstBytePos), length);
            res.status(206);
          }
        } else {
          stream = await minio.getObject(defaultBucket, attach.id);
        }
        stream.pipe(res);
      } else {
        res.json(attach);
      }
    }
  }
];
