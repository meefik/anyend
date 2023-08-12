import fs from 'node:fs';

export const MAX_FILES = 3;

export default [
  {
    // Download file
    path: '/file/:id',
    method: 'get',
    storage: {
      bucket: 'neux',
      filename: (req) => req.req.params.id
    }
  },
  {
    // Upload file and save locally
    path: '/file/local',
    method: 'post',
    uploads: {
      allowEmptyFiles: true,
      maxFiles: MAX_FILES,
      maxFileSize: 50 * 1024 * 1024
    },
    async middleware(req, res, next) {
      const dirPath = 'neux-api/tests/uploads';
      try {
        for (const file of req.files['upload']) {
          const fileContent = fs.readFileSync(file.filepath);
          const data = fileContent.toString('utf-8');
          fs.writeFileSync(dirPath + '/' + file.originalFilename, data);
        }
      } catch (err) {
        console.log(err.message);
        res.status(500).json({ error: 'Error occured while saving files' });
      }
      res.status(200).json({ fileSaved: req.files['upload'].length });
    }
  },
  {
    // Upload file and save on cloud
    path: '/file/:id',
    method: 'post',
    uploads: {},
    storage: {
      bucket: 'neux',
      filename: (req) => req.req.params.id,
      data: (req) => req.req.files.upload
    }
  }
];
