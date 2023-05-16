import fs from 'node:fs';
import http from 'node:http';
import ACME from '@root/acme';
import Keypairs from '@root/keypairs';
import CSR from '@root/csr';
import PEM from '@root/pem';
import logger from '../utils/logger.mjs';

let httpServer;

const _memdb = {};

function http01 (config) {
  const memdb = config.cache || _memdb;
  return {
    init (opts) {
      // request = opts.request;
      return Promise.resolve(null);
    },
    set (data) {
      return Promise.resolve().then(function () {
        // console.log('Add Key Auth URL', data);
        const ch = data.challenge;
        const key = ch.identifier.value + '#' + ch.token;
        memdb[key] = ch.keyAuthorization;
        return null;
      });
    },
    get (data) {
      return Promise.resolve().then(function () {
        // console.log('List Key Auth URL', data);
        const ch = data.challenge;
        const key = ch.identifier.value + '#' + ch.token;
        if (memdb[key]) {
          return { keyAuthorization: memdb[key] };
        }
        return null;
      });
    },
    remove (data) {
      return Promise.resolve().then(function () {
        // console.log('Remove Key Auth URL', data);
        const ch = data.challenge;
        const key = ch.identifier.value + '#' + ch.token;
        delete memdb[key];
        return null;
      });
    }
  };
}

function createHttpServer ({ port, host, timeout }) {
  const server = http.createServer(async function (req, res) {
    // Response timeout
    if (timeout) req.setTimeout(timeout * 1000);
    // Only GET method
    if (req.method !== 'GET') {
      return res.writeHead(404).end();
    }
    // ACME HTTP validation
    const re = /^\/\.well-known\/acme-challenge\/(.+)/;
    if (re.test(req.url)) {
      const arr = req.url.match(re) || [];
      const acmeFilename = arr[1];
      const acmeContent = 'text';
      console.log(acmeFilename, acmeContent);
      // TODO: read acmeContent from DB
      return res.writeHead(200, {
        'Content-Length': Buffer.byteLength(acmeContent),
        'Content-Type': 'text/plain'
      }).end(acmeContent);
    }
    // Redirect from http to https
    res.writeHead(301, {
      Location: `https://${req.headers.host}${req.url}`
    }).end();
  });
  server.listen(port, host, function () {
    const address = this.address();
    logger.log({
      level: 'info',
      label: 'acme',
      message: `Listening on ${address.address}:${address.port}`
    });
  });
  return server;
}

export async function init (options) {
  const {
    host,
    port = 80,
    timeout = 60,
    directoryUrl = 'https://acme-v02.api.letsencrypt.org/directory',
    maintainerEmail,
    subscriberEmail,
    domains
  } = options || {};

  httpServer = createHttpServer({ host, port, timeout });

  // https://git.rootprojects.org/root/acme.js/src/branch/master/examples/README.md

  // In many cases all three of these are the same (your email)
  // However, this is what they may look like when different:

  const pkg = { name: 'anyend', version: '0.1.0' };
  const packageAgent = 'test-' + pkg.name + '/' + pkg.version;

  // This is intended to get at important messages without
  // having to use even lower-level APIs in the code

  const errors = [];

  function notify (ev, msg) {
    if (ev === 'error' || ev === 'warning') {
      errors.push(ev.toUpperCase() + ' ' + msg.message);
      return;
    }
    // be brief on all others
    console.log(ev, msg.altname || '', msg.status || '');
  }

  const acme = ACME.create({ maintainerEmail, packageAgent, notify });

  console.log(acme);

  // Choose either the production or staging URL

  await acme.init(directoryUrl);

  // You only need ONE account key, ever, in most cases
  // save this and keep it safe. ECDSA is preferred.

  // const accountKeypair = await Keypairs.generate({ kty: 'EC', format: 'jwk' });
  const accountKeypair = {
    private: {
      kty: 'EC',
      crv: 'P-256',
      d: 'v_WwMvNtYXDlJMOIH-_MMvIasLXZezzRPz-_G4Mfud8',
      x: 'd3OMoMMDCoIwwmOY9C1fCj55viilBSuSQF7G6fZYVeo',
      y: '9ULsBNhimst-s0Y4Cj61jpxo0Bq9Lnb3BAxkxf3F3yc',
      kid: '0rOlJG0pU9LGSUOENNWAGPUBz7dDE_x6XrIzk3Sdv28'
    },
    public: {
      kty: 'EC',
      crv: 'P-256',
      x: 'd3OMoMMDCoIwwmOY9C1fCj55viilBSuSQF7G6fZYVeo',
      y: '9ULsBNhimst-s0Y4Cj61jpxo0Bq9Lnb3BAxkxf3F3yc',
      kid: '0rOlJG0pU9LGSUOENNWAGPUBz7dDE_x6XrIzk3Sdv28'
    }
  };
  const accountKey = accountKeypair.private;

  console.log(accountKeypair);

  // This can be `true` or an async function which presents the terms of use
  const agreeToTerms = true;

  console.info('registering new ACME account...');

  const account = await acme.accounts.create({
    subscriberEmail,
    agreeToTerms,
    accountKey
  });
  console.info('created account with id', account.key.kid);

  // This is the key used by your WEBSERVER, typically named `privkey.pem`,
  // `key.crt`, or `bundle.pem`. RSA may be preferrable for legacy compatibility.

  // You can generate it fresh
  const serverKeypair = await Keypairs.generate({ kty: 'RSA', format: 'jwk' });
  const serverKey = serverKeypair.private;
  const serverPem = await Keypairs.export({ jwk: serverKey });
  await fs.promises.writeFile('./privkey.pem', serverPem, 'ascii');

  // Or you can load it from a file
  // const serverPem = await fs.promises.readFile('./privkey.pem', 'ascii');
  // console.info('wrote ./privkey.pem');

  // const serverKey = await Keypairs.import({ pem: serverPem });

  const encoding = 'der';
  const typ = 'CERTIFICATE REQUEST';

  const csrDer = await CSR.csr({ jwk: serverKey, domains, encoding });
  const csr = PEM.packBlock({ type: typ, bytes: csrDer });

  const challenges = {
    'http-01': http01({})
  };

  console.info('validating domain authorization for ' + domains.join(' '));
  const pems = await acme.certificates.create({
    account,
    accountKey,
    csr,
    domains,
    challenges
  });

  const fullchain = pems.cert + '\n' + pems.chain + '\n';

  await fs.promises.writeFile('fullchain.pem', fullchain, 'ascii');
  console.info('wrote ./fullchain.pem');
}

export function destroy () {
  return new Promise(resolve => httpServer
    ? httpServer.close(resolve)
    : resolve());
}

export default {
  init
};

init({
  port: 8080,
  directoryUrl: 'https://acme-staging-v02.api.letsencrypt.org/directory',
  maintainerEmail: 'meefik@gmail.com',
  subscriberEmail: 'meefik@gmail.com',
  domains: ['meefik.ru', 'www.meefik.ru']
});
