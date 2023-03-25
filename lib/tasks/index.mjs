import db from 'mongoose';

export async function init (options) {
  const createTask = async function ({ unique, single, repeat }) {
    await db.model('Task').create();
  };
}

export async function destroy () {

};

export function state () {
  return {};
}

export default {
  init,
  destroy,
  state
};
