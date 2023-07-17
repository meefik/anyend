let config = {};

export default {
  get (path, defaults) {
    if (!path) return config || defaults;
    const arr = path.split('.');
    const data = arr.reduce((obj, i) => {
      return obj ? obj[i] : obj;
    }, config);
    return typeof data === 'undefined' ? defaults : data;
  },
  set (path, value) {
    if (typeof path === 'object') {
      config = path;
    } else {
      const arr = path.split('.');
      return arr.reduce((o, k, i) => {
        if (i + 1 < arr.length) o[k] = {};
        else o[k] = value;
        return o[k];
      }, config);
    }
  }
};
