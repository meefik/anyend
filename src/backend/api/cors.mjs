import config from 'nconf';
import cors from 'cors';

export default async function () {
  return cors(config.get('cors'));
}
