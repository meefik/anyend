import express from 'express';
import User from '../db/models/user.mjs';

const router = express.Router();

router.get('/', async function (req, res, next) {
  try {
    const { limit = 100, skip = 0 } = req.query;
    const total = await User.countDocuments({});
    const data = await User.find({}).limit(limit).skip(skip).exec();
    res.json({ total, limit, skip, data });
  } catch (err) {
    next(err);
  }
});

router.post('/', async function (req, res, next) {
  try {
    const user = new User(req.body);
    await user.save();
    res.json(user);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async function (req, res, next) {
  try {
    const user = await User.findOne({ _id: req.params.id }).exec();
    if (!user) throw Error('User not found');
    for (const k in req.body) {
      user[k] = req.body[k];
    }
    await user.save();
    res.json(user);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async function (req, res, next) {
  try {
    const user = await User.findOneAndDelete({ _id: req.params.id }).exec();
    res.json(user);
  } catch (err) {
    next(err);
  }
});

export default router;
