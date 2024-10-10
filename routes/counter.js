import express from 'express';

const router = express.Router();

export default function Router(dbState) {
  router.get('/', async (req, res) => {
    try {
      const token = req.headers['authorization'];

      const counter = await dbState.get('rejected-counter');

      res.status(200).json({ counter: counter });
    } catch (e) {
      if (e.response && e.response.data) {
        res.status(e.status).send(e.response.data);
      } else {
        res.status(500).send('something went wrong');
      }
    }
  });
  return router;
}
