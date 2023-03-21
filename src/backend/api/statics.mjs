import express from 'express';
import config from 'nconf';

export default async function () {
  return express.static(
    config.get('statics:dir'),
    config.get('statics:expires')
      ? { maxAge: config.get('statics:expires') * 60 * 1000 }
      : {}
  );
}
