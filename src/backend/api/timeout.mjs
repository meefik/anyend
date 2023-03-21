import config from 'nconf';

export default async function () {
  return function (req, res, next) {
    req.setTimeout(config.get('timeout') * 1000);
    next();
  };
}
