export default async function () {
  const {
    HOST,
    PORT = 3000,
    SESSION_SECRET = 'secret',
    SESSION_EXPIRES = 60,
    MONGO_URI = 'mongodb://admin:secret@127.0.0.1:27017/anyend?authSource=admin',
    MINIO_URI = 'http://minioadmin:minioadmin@127.0.0.1:9000/anyend'
  } = process.env;
  return {
    mongo: {
      uri: MONGO_URI
    },
    minio: {
      uri: MINIO_URI
    },
    api: {
      host: HOST,
      port: PORT,
      timeout: 10,
      session: {
        secret: SESSION_SECRET,
        expires: SESSION_EXPIRES,
        sources: [
          { field: 'token', type: 'cookies' },
          { field: 'authorization', type: 'headers' },
          { field: 'token', type: 'query' }
        ]
      },
      cors: {
        origin: true
      },
      compression: {}
    }
  };
}
