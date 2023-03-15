import express from 'express';
import dao from '../db/dao.mjs';

const router = express.Router();

router.get('/:model', async function (req, res, next) {
  try {
    const { model } = req.params;
    const modelName = model.charAt(0).toUpperCase() + model.slice(1);
    const data = await dao.read(modelName, req.query);
    res.json(data);
  } catch (err) {
    if (err.name === 'ModelError') {
      res.status(404);
    }
    next(err);
  }
});

router.post('/:model', async function (req, res, next) {
  try {
    const { model } = req.params;
    const modelName = model.charAt(0).toUpperCase() + model.slice(1);
    const data = await dao.create(modelName, req.query, req.body);
    res.json(data);
  } catch (err) {
    if (err.name === 'ModelError') {
      res.status(404);
    }
    next(err);
  }
});

router.put('/:model', async function (req, res, next) {
  try {
    const { model } = req.params;
    const modelName = model.charAt(0).toUpperCase() + model.slice(1);
    const data = await dao.update(modelName, req.query, req.body);
    res.json(data);
  } catch (err) {
    if (err.name === 'ModelError') {
      res.status(404);
    }
    next(err);
  }
});

router.delete('/:model', async function (req, res, next) {
  try {
    const { model } = req.params;
    const modelName = model.charAt(0).toUpperCase() + model.slice(1);
    const data = await dao.delete(modelName, req.query);
    res.json(data);
  } catch (err) {
    if (err.name === 'ModelError') {
      res.status(404);
    }
    next(err);
  }
});

export default router;
