/**
 * Рендринг всех полей объекта шаблонизатором.
 *
 * @param {*} tpl - Преобразуемые данные (шаблоны).
 * @param {Object} data - Данные для подстановки в шаблон.
 */
async function deepRender (tpl, data, args) {
  if (data === null || typeof data !== 'object') data = {};
  if (typeof data.toJSON === 'function') data = data.toJSON();
  if (!args) args = '{' + Object.keys(data).join(',') + '}';
  let out;
  if (tpl !== null && typeof tpl === 'object') {
    out = Array.isArray(tpl) ? [] : {};
    for (const key in tpl) {
      if (Object.prototype.hasOwnProperty.call(tpl, key)) {
        const val = await deepRender(tpl[key], data, args);
        if (typeof val !== 'undefined') {
          out[key] = val;
        }
      }
    }
  } else if (typeof tpl === 'function') {
    try {
      out = await tpl.call(tpl, data);
    } catch (e) {
      // ignore
    }
  } else {
    try {
      // eslint-disable-next-line no-new-func
      const AsyncFunction = async function () {}.constructor;
      const fn = new AsyncFunction(args, 'return (' + tpl + ');');
      out = await fn.call(fn, data);
    } catch (e) {
      // ignore
    }
  }
  return out;
}

export default deepRender;
