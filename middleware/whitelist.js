import { isNumberWhitelisted } from '../filters/isWhitelisted.js';
export const checkWhitelistMiddleware = async (req, res, next) => {
  try {
    const number = req.body.workflow[0].to;

    if (!number || isNaN(number) || number == 0) {
      return res.status(400).json({ error: 'Invalid number provided.' });
    }

    const whitelisted = await isNumberWhitelisted(number);

    if (!whitelisted) {
      const token = Buffer.from(`${process.env.SECONDARY_KEY}:${process.env.SECONDARY_SECRET}`).toString('base64');
      req.headers['authorization'] = `Basic ${token}`;
      console.log('replacing token');
      // return next();
      // return res.status(403).json({ error: 'Number is not whitelisted.' });
    }

    next(); // Continue to the next middleware or route handler
  } catch (error) {
    console.error(`Whitelist check error: ${error.message}`);
    // return next(new createError(500, `Failed to check whitelist status. ${error.message}`));
  }
};
