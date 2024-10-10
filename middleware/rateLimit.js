import { vcr } from '@vonage/vcr-sdk';
import { isNumberWhitelisted } from '../filters/isWhitelisted.js';
// import { checkWhitelistMiddleware } from './whitelist';
const dbState = vcr.getInstanceState();

// Middleware to enforce rate limits

export const rateLimit = async (req, res, next) => {
  try {
    // const { to, rateLimits } = req.body;

    const { rateLimits, ...verifyBody } = req.body;
    const [{ to }] = verifyBody.workflow;

    if (!to) {
      return res.status(400).json({ error: 'Phone number is required' });
    }
    if (!rateLimits) {
      return next();
    }

    // Iterate over each profile ID in rateLimits
    const keys = Object.keys(rateLimits);
    let isRateLimited = false;

    for (const name of keys) {
      const key = rateLimits[name];

      // Fetch the profile using the profile ID
      // Fetch the profile from Redis using the profileId
      const profileId = await dbState.get(`profileName:${name}`);
      const profileData = await dbState.get(`rateLimitProfile:${profileId}`);

      if (!profileData || JSON.parse(profileData).rateLimits.length === 0) {
        return res.status(404).json({ error: `Rate limit profile not found or rate limit not applied to profile` });
      }

      const profile = JSON.parse(profileData);

      // Fetch rate limiter data from Redis for this key

      let keyProfiles = await dbState.get(`rateLimiter:${key}`);

      if (!keyProfiles || JSON.parse(keyProfiles)?.length === 0) {
        keyProfiles = profile.rateLimits.map((rateLimit) => ({
          count: 0,
          maxRequests: rateLimit.maxRequests,
          windowMs: rateLimit.interval * 1000,
          expiresAt: Date.now() + rateLimit.interval * 1000, // Expiration timestamp
        }));

        await dbState.set(`rateLimiter:${key}`, JSON.stringify(keyProfiles));
        const maxExp = Math.max(...profile.rateLimits.map((rl) => rl.interval));
        await dbState.expire(`rateLimiter:${key}`, maxExp); // Set expiration
      } else {
        keyProfiles = JSON.parse(keyProfiles);
      }

      const now = Date.now();

      keyProfiles.forEach((currentProfile) => {
        if (now > currentProfile.expiresAt) {
          // Reset count and expiration if the time window has passed
          currentProfile.count = 0;
          currentProfile.expiresAt = now + currentProfile.windowMs;
        }
        if (currentProfile.count >= currentProfile.maxRequests) {
          isRateLimited = true;
        }
      });

      if (isRateLimited) {
        dbState.increment('rejected-counter', 1);
        // dbState.set('re')
        return res.status(429).json({ error: 'Too many requests. Please try again later.' });
      }

      // Increment the count for each rate limit
      keyProfiles.forEach((currentProfile) => {
        currentProfile.count += 1;
      });

      // Update Redis with the new counts and expiration times
      // Update Redis with the new counts and expiration times
      await dbState.set(`rateLimiter:${key}`, JSON.stringify(keyProfiles));

      // Set the expiration for the key to the max interval if necessary

      const maxExp = Math.max(...keyProfiles.map((rl) => (rl.expiresAt - now) / 1000));
      await dbState.expire(`rateLimiter:${key}`, Math.ceil(maxExp));
    }

    next();
  } catch (e) {
    console.log('error in rate limit');
    console.log(e?.response?.data || e);
    return res.status(500).send(e?.response?.data || e);
  }
};
