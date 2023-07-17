/**
 * Parses an address
 * @param addresses The address(es) to process
 */
function parseAddress (addresses) {
  return addresses.split(',').map(address => {
    const i = address.indexOf(':');
    return i >= 0
      ? {
        host: decodeURIComponent(address.substring(0, i)),
        port: +address.substring(i + 1)
      }
      : { host: decodeURIComponent(address) };
  });
}

/**
 * Parses options
 * @param options The options to process
 */
function parseOptions (options) {
  const result = {};
  options.split('&').forEach(option => {
    const i = option.indexOf('=');
    if (i >= 0) {
      result[decodeURIComponent(option.substring(0, i))] = decodeURIComponent(
        option.substring(i + 1)
      );
    }
  });
  return result;
}

/**
 * Takes a connection string URI of form:
 *
 *   scheme://[username[:password]@]host1[:port1][,host2[:port2],...[,hostN[:portN]]][/[endpoint]][?options]
 *
 * and returns an object of form:
 *
 *   {
 *     scheme: string,
 *     username?: string,
 *     password?: string,
 *     hosts: [ { host: string, port?: number }, ... ],
 *     endpoint?: string,
 *     options?: object
 *   }
 *
 * @param uri The connection string URI
 */
function parseUri (uri) {
  if (!uri) return;
  const connectionStringParser = new RegExp(
    '^\\s*' + // Optional whitespace padding at the beginning of the line
    '([^:]+)://' + // Scheme (Group 1)
    '(?:([^:@,/?&]+)(?::([^:@,/?&]+))?@)?' + // User (Group 2) and Password (Group 3)
    '([^@/?&]+)' + // Host address(es) (Group 4)
    '(?:/([^:@,/?&]+)?)?' + // Endpoint (Group 5)
    '(?:\\?([^:@,/?]+)?)?' + // Options (Group 6)
      '\\s*$', // Optional whitespace padding at the end of the line
    'gi'
  );
  const connectionStringObject = {};
  const tokens = connectionStringParser.exec(uri);
  if (Array.isArray(tokens)) {
    connectionStringObject.scheme = tokens[1];
    connectionStringObject.username = tokens[2]
      ? decodeURIComponent(tokens[2])
      : tokens[2];
    connectionStringObject.password = tokens[3]
      ? decodeURIComponent(tokens[3])
      : tokens[3];
    connectionStringObject.hosts = parseAddress(tokens[4]);
    connectionStringObject.endpoint = tokens[5]
      ? decodeURIComponent(tokens[5])
      : tokens[5];
    connectionStringObject.options = tokens[6]
      ? parseOptions(tokens[6])
      : tokens[6];
  }
  return connectionStringObject;
}

export default parseUri;
