import express from 'express';
import { vcr } from '@vonage/vcr-sdk';
import createError from 'http-errors';

const DB_TABLENAME_WHITELIST = 'DB_TABLENAME_WHITELIST';
const router = express.Router();
export default function Router() {
  router.post('/', async (req, res, next) => {
    try {
      req.body.number = `${Number(req.body.number)}`;
      const { number } = req.body;
      if (!number || isNaN(number) || number == 0) throw new Error('No number provided.');
      const db = vcr.getInstanceState();
      await db.mapSet(DB_TABLENAME_WHITELIST, { [number]: 'true' });

      return res.json({ success: true });
    } catch (e) {
      console.log('Whitelist addition error: ', e.message, e.response?.data);
      return next(new createError(500, `Failed to add to Whitelist. ${e.message}`));
    }
  });

  router.delete('/', async (req, res, next) => {
    try {
      req.body.number = `${Number(req.body.number)}`;
      const { number } = req.body;

      if (!number || isNaN(number) || number == 0) throw new Error('No number provided.');

      const db = vcr.getInstanceState();
      const response = await db.mapDelete(DB_TABLENAME_WHITELIST, [number]);
      return res.json({ success: response === '0' ? false : true });
    } catch (e) {
      console.log('Whitelist deletion error: ', e.message, e.response?.data);
      return next(new createError(500, `Failed to delete from Whitelist. ${e.message}`));
    }
  });

  router.get('/query(/:number)?', async (req, res, next) => {
    try {
      const { number } = req.params;

      const db = vcr.getInstanceState();
      if (number) {
        let isWhitelisted = await db.mapGetValue(DB_TABLENAME_WHITELIST, number.toString());
        return res.json({ [number]: isWhitelisted || false });
      } else {
        let data = await db.mapGetAll(DB_TABLENAME_WHITELIST);
        return res.json(data);
      }
    } catch (e) {
      console.log('Whitelist query error:', e.response?.status, e.response?.data?.error, e.message);
      return next(new createError(500, `Failed to query from Whitelist. ${e.message}`));
    }
  });

  router.get('/count/all', async (req, res, next) => {
    try {
      const db = vcr.getInstanceState();
      let data = await db.mapLength(DB_TABLENAME_WHITELIST);
      return res.json({ count: data });
    } catch (e) {
      console.log('Whitelist query error:', e.response?.status, e.response?.data?.error, e.message);
      return next(new createError(500, `Failed to query from Whitelist. ${e.message}`));
    }
  });

  return router;
}
