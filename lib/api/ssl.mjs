import fs from 'node:fs';
import ACME from '@root/acme';
import Keypairs from '@root/keypairs';

export default async function run () {
// https://git.rootprojects.org/root/acme.js/src/branch/master/examples/README.md

  // In many cases all three of these are the same (your email)
  // However, this is what they may look like when different:

  const maintainerEmail = 'meefik@gmail.com';
  const subscriberEmail = 'meefik@gmail.com';

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

  const directoryUrl = 'https://acme-staging-v02.api.letsencrypt.org/directory';
  // const directoryUrl = 'https://acme-v02.api.letsencrypt.org/directory'

  await acme.init(directoryUrl);

  // You only need ONE account key, ever, in most cases
  // save this and keep it safe. ECDSA is preferred.

  const accountKeypair = await Keypairs.generate({ kty: 'EC', format: 'jwk' });
  const accountKey = accountKeypair.private;

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

  const CSR = require('@root/csr');
  const PEM = require('@root/pem');

  const encoding = 'der';
  const typ = 'CERTIFICATE REQUEST';

  const domains = ['example.com', '*.example.com'];
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

const _memdb = {};

function http01 (config) {
  const memdb = config.cache || _memdb;

  return {
    init: function (opts) {
      // request = opts.request;
      return Promise.resolve(null);
    },

    set: function (data) {
      return Promise.resolve().then(function () {
        // console.log('Add Key Auth URL', data);
        const ch = data.challenge;
        const key = ch.identifier.value + '#' + ch.token;
        memdb[key] = ch.keyAuthorization;

        return null;
      });
    },

    get: function (data) {
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

    remove: function (data) {
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

run();
