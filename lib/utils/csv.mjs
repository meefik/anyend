import readline from 'node:readline';

export async function readCsv (input, next) {
  return new Promise((resolve, reject) => {
    let error;
    const rl = readline.createInterface({
      input,
      crlfDelay: Infinity
    });
    let headers, delimiter, regex;
    rl.on('line', async function (line) {
      if (!line) return;
      try {
        if (!headers) {
          delimiter = (line.match(/[,;|]/g) || [])[0] || ',';
          headers = line.split(delimiter);
          for (let i = 0; i < headers.length; i++) {
            headers[i] = String(headers[i]).replace(/"([^"]+)"/, '$1').trim();
          }
          regex = new RegExp(`("[^"]+"|[^${delimiter}]+|${delimiter})(?=${delimiter}|$)`, 'g');
        } else {
          const data = line.match(regex);
          for (let i = 0; i < data.length; i++) {
            if (data[i] === delimiter) data[i] = '';
            data[i] = String(data[i])
              .replace(/\r/g, '')
              .replace(/\\n/g, '\n')
              .replace(/"(.*)"/, '$1')
              .replace(/""/g, '"')
              .trim();
          }
          const obj = {};
          for (let j = 0; j < headers.length; j++) {
            obj[headers[j]] = data[j];
          }
          rl.pause();
          await next(obj);
          rl.resume();
        }
      } catch (err) {
        error = err;
        rl.close();
      }
    });
    rl.on('close', function () {
      error ? reject(error) : resolve();
    });
  });
}

export async function writeCsv (cursor, select, delimiter = ',') {
  const headers = (select || 'id').split(',');
  const arr = [headers.join(delimiter)];
  let doc = true;
  while (doc) {
    doc = await cursor.next();
    if (!doc) break;
    const row = [];
    for (let i = 0; i < headers.length; i++) {
      const key = headers[i];
      let val = getValueFromObject(doc, key);
      if (val === null || typeof val === 'undefined') val = '';
      val = String(val)
        .replace(/\r/g, '')
        .replace(/\n/g, '\\n')
        .replace(/"/g, '""');
      if (val.indexOf(delimiter) !== -1) val = `"${val}"`;
      row.push(val);
    }
    arr.push(row.join(delimiter));
  }
  return arr.join('\n');
}

function getValueFromObject (obj, key) {
  const path = typeof key === 'string' ? key.split('.') : key;
  let val = path.reduce(function (o, k, i) {
    if (Array.isArray(o)) {
      const subPath = path.splice(i);
      return o
        .map(function (v) {
          if (typeof v !== 'object') return v;
          return getValueFromObject(v, subPath.slice());
        })
        .join(', ');
    }
    return (o || {})[k];
  }, obj);
  if (val && typeof val.toJSON === 'function') {
    val = val.toJSON();
  }
  return val;
}
