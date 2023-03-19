import mongoose from 'mongoose';
import searchParser from '../utils/search-parser.mjs';

const dao = {
  /**
   * Создавить запись.
   *
   * @param {string} model Имя модели БД.
   * @param {Object} [query.populate] Связь с другими моделями.
   * @param {Object} data Данные для внесения в БД.
   * @returns {Promise}
   */
  async create (model, query, data) {
    const Model = mongoose.connection.models[model];
    if (!Model) throw new ModelError('Model not found');
    let { populate } = query;
    if (data.id) {
      data._id = data.id;
      delete data.id;
    }
    if (typeof populate === 'string') {
      populate = populate.split(/\s*,\s*/);
    }
    const doc = new Model(data);
    await doc.save();
    if (populate) {
      await doc.populate(populate);
    }
    return doc;
  },
  /**
   * Получить запись или список записей.
   *
   * @param {string} model Имя модели БД.
   * @param {Object|string} [query.filter] Запрос в формате MongoDB.
   * @param {Object} [query.sort] Параметры сортировки.
   * @param {number} [query.skip] Пропустить N-записей.
   * @param {number} [query.limit] Ограничить число записей в выборке.
   * @param {Object} [query.select] Включить или исключить поля документа.
   * @param {Object} [query.populate] Связь с другими моделями.
   * @param {boolean} [query.count] Подсчет числа найденных элементов.
   * @param {boolean} [query.one] Вернуть только одну запись.
   * @param {boolean} [query.cursor] Вернуть курсор.
   * @returns {Promise}
   */
  async read (model, query) {
    const Model = mongoose.connection.models[model];
    if (!Model) throw new ModelError('Model not found');
    let {
      filter,
      select,
      populate,
      sort,
      skip,
      limit,
      count,
      one,
      cursor
    } = query;
    let transaction;
    if (typeof filter === 'string') {
      filter = searchParser(filter);
    }
    if (typeof filter === 'object' && filter.id) {
      filter._id = Array.isArray(filter.id) ? { $in: filter.id } : filter.id;
      delete filter.id;
    }
    if (typeof populate === 'string') {
      populate = populate.split(/\s*,\s*/);
    }
    if (one) {
      transaction = Model.findOne(filter);
      if (select) transaction.select(select);
      if (populate) transaction.populate(populate);
      const data = await transaction.exec();
      return data;
    } else {
      transaction = Model.find(filter);
      if (sort) {
        if (sort.id) {
          sort._id = sort.id;
          delete sort.id;
        }
        for (const k in sort) {
          const order = sort[k];
          if (order === '1' || order === 'asc') sort[k] = 1;
          if (order === '-1' || order === 'desc') sort[k] = -1;
        }
        transaction.sort(sort);
      }
      if (skip) transaction.skip(parseInt(skip));
      if (limit) transaction.limit(parseInt(limit));
      if (select) transaction.select(select);
      if (populate) transaction.populate(populate);
      if (count) {
        const total = await Model.countDocuments(filter);
        if (total > 0) {
          const data = await transaction.exec();
          return { total, skip, limit, data };
        } else {
          return { total: 0, skip, limit, data: [] };
        }
      } else {
        if (cursor) return transaction.cursor();
        const data = await transaction.exec();
        return data;
      }
    }
  },
  /**
   * Изменить запись.
   *
   * @param {string} model Имя модели БД.
   * @param {string} [query.filter] Запрос в формате MongoDB.
   * @param {boolean} [query.upsert] Добавить запись, если не существует.
   * @param {Object} [query.select] Включить или исключить поля документа.
   * @param {Object} [query.populate] Связь с другими моделями.
   * @param {Object} data Данные для внесения в БД.
   * @returns {Promise}
   */
  async update (model, query, data) {
    const Model = mongoose.connection.models[model];
    if (!Model) throw new ModelError('Model not found');
    let { filter, upsert, select, populate } = query;
    if (typeof filter === 'string') {
      filter = searchParser(filter);
    }
    if (typeof filter === 'object' && filter.id) {
      filter._id = filter.id;
      delete filter.id;
    }
    if (typeof populate === 'string') {
      populate = populate.split(/\s*,\s*/);
    }
    const transaction = Model.findOne(filter);
    if (select) transaction.select(select);
    if (populate) transaction.populate(populate);
    let doc = await transaction.exec();
    if (doc) {
      for (const p in data) {
        const val = data[p];
        if (typeof val !== 'undefined') {
          setValue(p, val, doc);
        }
      }
      await doc.save();
      return doc;
    }
    if (upsert) {
      if (data.id) {
        data._id = data.id;
        delete data.id;
      }
      doc = new Model(data);
      await doc.save();
      if (populate) {
        await doc.populate(populate);
      }
      return doc;
    }
    return doc;
  },
  /**
   * Удалить запись.
   *
   * @param {string} model Имя модели БД.
   * @param {string} [query.filter] Запрос в формате MongoDB.
   * @param {Object} [query.select] Включить или исключить поля документа.
   * @param {Object} [query.populate] Связь с другими моделями.
   * @returns {Promise}
   */
  async delete (model, query) {
    const Model = mongoose.connection.models[model];
    if (!Model) throw new ModelError('Model not found');
    let { filter, select, populate } = query;
    if (typeof filter === 'string') {
      filter = searchParser(filter);
    }
    if (typeof filter === 'object' && filter.id) {
      filter._id = filter.id;
      delete filter.id;
    }
    if (typeof populate === 'string') {
      populate = populate.split(/\s*,\s*/);
    }
    const transaction = Model.findOne(filter);
    if (select) transaction.select(select);
    if (populate) transaction.populate(populate);
    const doc = await transaction.exec();
    await doc?.remove();
    return doc;
  }
};

function setValue (path, val, doc) {
  if (!path || !doc) return doc;
  const arr = path.split('.');
  arr.reduce((o, k, i) => {
    if (i === arr.length - 1) {
      if (o[k] !== val) o[k] = val;
    } else {
      if (typeof o[k] !== 'object') o[k] = {};
      const p = arr.slice(0, i + 1).join('.');
      doc.markModified(p);
    }
    return o[k];
  }, doc);
}

class ModelError extends Error {
  constructor (message) {
    super(message);
    this.message = message;
    this.name = 'ModelError';
  }
}

export default dao;