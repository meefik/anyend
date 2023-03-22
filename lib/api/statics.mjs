import express from 'express';

export default async function ({ dir, expires }) {
  return express.static(
    dir,
    expires ? { maxAge: expires * 60 * 1000 } : {}
  );
}
