import mongoose from 'mongoose';

export default async function (ctx) {
  const Schema = mongoose.Schema;
  for (const name in ctx.schemas) {
    const cfg = ctx.schemas[name];
    const schema = typeof cfg === 'function'
      ? await cfg()
      : new Schema(cfg);
    mongoose.model(name, schema);
  }
}
