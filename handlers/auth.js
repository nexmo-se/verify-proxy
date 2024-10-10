import createError from 'http-errors';

const API_ACCOUNT_ID = process.env.API_ACCOUNT_ID;
const API_ACCOUNT_SECRET = process.env.API_ACCOUNT_SECRET;

/**
 * verify requests from external
 * */
export const handleAuth = async function (req, res, next) {
  try {
    console.log(`[${req.url}] handleAuth`, JSON.stringify(req.body));

    if (!req.headers['authorization'] && !(req.body?.api_key && req.body?.api_secret)) {
      console.log(
        `[${req.url}] no authorization`,
        req.headers['x-request-id'],
        req.headers['x-vgai-session-id'],
        JSON.stringify([req.body])
      );
      throw new Error('no credentials provided');
    }

    // basic or in req.body
    if (req.headers['authorization']?.toLowerCase().startsWith('basic')) {
      let token = req.headers['authorization'].split(' ')[1];
      let [apiKey, apiSecret] = Buffer.from(token, 'base64').toString('utf8').split(':');
      if (!apiKey || !apiSecret || apiKey !== API_ACCOUNT_ID || apiSecret !== API_ACCOUNT_SECRET) {
        throw new Error('verify API Key API Secret failed');
      }
    }
    // in req.body
    else if (req.body.api_key !== API_ACCOUNT_ID || req.body.api_secret !== API_ACCOUNT_SECRET) {
      throw new Error('verify API Key API Secret: failed');
    }
    next();
  } catch (error) {
    console.log('[handleAuth] Error', JSON.stringify([req.body, req.headers]), error.message);
    next(new createError(401, 'Unauthorized: ' + error.message));
  }
};
