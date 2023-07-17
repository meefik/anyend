/**
 * Rendering of all fields of the object by the template engine.
 *
 * @param {*} tpl Converted data (templates).
 * @param {Object} data Data for substitution in the template.
 */
async function deepRender (tpl, data) {
  if (data === null || typeof data !== 'object') data = {};
  if (typeof data.toJSON === 'function') data = data.toJSON();
  let out = tpl;
  if (tpl !== null && typeof tpl === 'object') {
    out = Array.isArray(tpl) ? [] : {};
    for (const key in tpl) {
      if (Object.prototype.hasOwnProperty.call(tpl, key)) {
        const val = await deepRender(tpl[key], data);
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
  }
  return out;
}

export default deepRender;
