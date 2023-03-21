import config from 'nconf';
import compression from 'compression';

export default async function () {
  return compression(config.get('compression'));
}
