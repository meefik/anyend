export default async function (timeout) {
  return function (req, res, next) {
    req.setTimeout(timeout * 1000);
    next();
  };
}
