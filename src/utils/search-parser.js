// Parse search string to MongoDB query.
// AND - &, OR - |, IN - [], GROUP - ()
// >, <, =, !=, >=, <=, ~, ~*
//
// Input:
// a.x1 > 0 & ( b >= 0 | (c > 0 & d ~ 'a + b & c = 0' & f <= -1 | a ~* "hello" )) & e != 10 | g = [1,2,"z"] & n = ""
// Output:
// {"$or":[
//   {"$and":[
//     {"a.x1":{"$gt":"0"}},
//     {"$or":[
//       {"b":{"$gte":"0"}},
//       {"$or":[
//         {"$and":[
//           {"c":{"$gt":"0"}},
//           {"d":{"$regex":"a + b & c = 0"}},
//           {"f":{"$lte":"-1"}}
//         ]},
//         {"a":{"$regex":"hello","$options":"i"}}
//       ]}
//     ]},
//     {"e":{"$ne":"10"}}
//   ]},
//   {"$and": [
//     {"g":["1","2","z"]},
//     {"n":{$in:["",null]}}
//   ]}
// ]}

const patterns = [
  /('[^']*')/,
  /("[^"]*")/,
  /\(([^()]+)\)/,
  /([^&|]+>=[^&|]+)/,
  /([^&|]+>[^&|]+)/,
  /([^&|]+<=[^&|]+)/,
  /([^&|]+<[^&|]+)/,
  /([^&|]+!=[^&|]+)/,
  /([^&|]+=[^&|]+)/,
  /([^&|]+~\*[^&|]+)/,
  /([^&|]+~[^&|]+)/,
  /([^|]*[&][^|]*)/
];

function parse (str, params = {}, opts = {}) {
  if (!opts.c) {
    opts.c = 0;
  }
  if (!opts.p) {
    do {
      opts.p = Math.random().toString(16).slice(2);
    } while (str.indexOf(opts.p) > -1);
  }
  for (let i = 0; i < patterns.length; i++) {
    const re = patterns[i];
    /* eslint-disable no-constant-condition */
    while (true) {
      const r = str.match(re);
      if (!r) break;
      const k = `x${++opts.c}_${opts.p}`;
      str = str.replace(r[0], k);
      const param = r[0] !== r[1] ? parse(r[1], params, opts) : r[1];
      params[k] = i < 2 ? param : param.replace(/\s/g, '');
    }
  }
  return str;
}

function compile (str, params = {}) {
  const val = params[str] || str;
  switch (true) {
  case /^'[^']*'$/.test(val): {
    const r = val.split(/^'([^']*)'$/);
    const value = r[1] || '';
    return value;
  }
  case /^"[^"]*"$/.test(val): {
    const r = val.split(/^"([^"]*)"$/);
    const value = r[1] || '';
    return value;
  }
  case /^\[[^[\]]*\]$/.test(val): {
    const arr = [];
    const r = val.slice(1, -1).split(/\s*,\s*/);
    for (let i = 0; i < r.length; i++) {
      const value = compile(r[i], params);
      arr.push(value);
    }
    return arr;
  }
  case />=/.test(val): {
    const r = val.split(/\s*>=\s*/);
    const field = compile(r[0], params);
    const value = compile(r[1], params);
    return { [field]: { $gte: value } };
  }
  case />/.test(val): {
    const r = val.split(/\s*>\s*/);
    const field = compile(r[0], params);
    const value = compile(r[1], params);
    return { [field]: { $gt: value } };
  }
  case /<=/.test(val): {
    const r = val.split(/\s*<=\s*/);
    const field = compile(r[0], params);
    const value = compile(r[1], params);
    return { [field]: { $lte: value } };
  }
  case /</.test(val): {
    const r = val.split(/\s*<\s*/);
    const field = compile(r[0], params);
    const value = compile(r[1], params);
    return { [field]: { $lt: value } };
  }
  case /!=/.test(val): {
    const r = val.split(/\s*!=\s*/);
    const field = compile(r[0], params);
    let value = compile(r[1], params);
    if (!value) value = ['', null];
    return { [field]: Array.isArray(value) ? { $nin: value } : { $ne: value } };
  }
  case /=/.test(val): {
    const r = val.split(/\s*=\s*/);
    const field = compile(r[0], params);
    let value = compile(r[1], params);
    if (!value) value = ['', null];
    return { [field]: Array.isArray(value) ? { $in: value } : value };
  }
  case /~\*/.test(val): {
    const r = val.split(/\s*~\*\s*/);
    const field = compile(r[0], params);
    const value = compile(r[1], params);
    return { [field]: { $regex: value, $options: 'i' } };
  }
  case /~/.test(val): {
    const r = val.split(/\s*~\s*/);
    const field = compile(r[0], params);
    const value = compile(r[1], params);
    return { [field]: { $regex: value } };
  }
  case /&/.test(val): {
    const arr = [];
    const r = val.split(/\s*&\s*/);
    for (let i = 0; i < r.length; i++) {
      const value = compile(r[i], params);
      arr.push(value);
    }
    return { $and: arr };
  }
  case /\|/.test(val): {
    const arr = [];
    const r = val.split(/\s*\|\s*/);
    for (let i = 0; i < r.length; i++) {
      const value = compile(r[i], params);
      arr.push(value);
    }
    return { $or: arr };
  }
  default: {
    let value = val;
    while (params[value]) {
      value = compile(params[value], params);
    }
    return value || null;
  }
  }
}

function convert (query) {
  const params = {};
  const p = parse(query, params);
  return compile(p, params);
}

export default function (query) {
  if (typeof query === 'string') {
    return convert(query);
  }
  if (Array.isArray(query)) {
    for (let i = 0; i < query.length; i++) {
      const item = query[i];
      if (typeof item === 'string') {
        query[i] = convert(item);
      }
    }
    return { $and: query };
  }
  return query;
};
