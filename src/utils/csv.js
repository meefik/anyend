import readline from 'node:readline';
import { PassThrough } from 'node:stream';

export async function readCsv (text) {
  return new Promise((resolve, reject) => {
    let error;
    const arr = [];
    const buf = Buffer.from(text, 'utf8');
    const input = new PassThrough();
    input.end(buf);
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
          arr.push(obj);
        }
      } catch (err) {
        error = err;
        rl.close();
      }
    });
    rl.on('close', function () {
      error ? reject(error) : resolve(arr);
    });
  });
}

export function writeCsv (data, select, delimiter = ',') {
  return new Promise((resolve, reject) => {
    try {
      const headers = (select || 'id').split(',');
      const arr = [headers.join(delimiter)];
      const readRow = (obj) => {
        const row = [];
        for (let i = 0; i < headers.length; i++) {
          const key = headers[i];
          let val = getValueFromObject(obj, key);
          if (val === null || typeof val === 'undefined') val = '';
          val = String(val)
            .replace(/\r/g, '')
            .replace(/\n/g, '\\n')
            .replace(/"/g, '""');
          if (val.indexOf(delimiter) !== -1) val = `"${val}"`;
          row.push(val);
        }
        return row.join(delimiter);
      };
      if (Array.isArray(data)) {
        for (const obj of data) {
          arr.push(readRow(obj));
        }
      } else {
        arr.push(readRow(data));
      }
      resolve(arr.join('\n'));
    } catch (err) {
      reject(err);
    }
  });
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
