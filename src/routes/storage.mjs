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
  }
];
