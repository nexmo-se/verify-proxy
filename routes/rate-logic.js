import express from 'express';
import { v4 as uuidv4 } from 'uuid';
const router = express.Router();
export default function Router(dbState) {
  router.get('/all', async (req, res) => {
    try {
      const profiles = await dbState.mapGetAll('rateLimitProfiles');
      if (profiles) {
        const parsedTemplates = Object.keys(profiles).map((key) => {
          const data = JSON.parse(profiles[key]);
          return { ...data };
        });
        res.send(parsedTemplates);
      } else {
        res.send('no profiles found');
      }
    } catch (e) {
      res.send(e);
    }
  });
  //route to get a rate Limiter key
  router.get('/ratelimiters/:key', async (req, res) => {
    try {
      console.log(req.params.key);
      const profileData = await dbState.get(`rateLimiter:${req.params.key}`);
      console.log(profileData);
      res.send(profileData);
    } catch (e) {
      res.send('error');
    }
  });
  //route to get a rate limit by id

  router.get('/rate-limit-profile/:id', async (req, res) => {
    try {
      const { id } = req.params;
      console.log('aqui');
      console.log(id);
      const respRateLimits = await dbState.get(`rateLimitProfile:${id}`);

      if (respRateLimits) {
        res.json(JSON.parse(respRateLimits));
      } else {
        res.status(404).send('Profile not found');
      }
    } catch (e) {
      console.log(e);
      res.send('error');
    }
  });

  router.get('/get-rate-limit-profile/:uniqueName', async (req, res) => {
    try {
      const { uniqueName } = req.params;
      // const respRateLimits = await dbState.mapGetValue('rateLimitByName', uniqueName);
      const data = await dbState.get(`profileName:${uniqueName}`);
      if (data) {
        // res.send(JSON.parse(respRateLimits));
        res.json(data);
      } else {
        res.status(404).send('Profile not found');
      }
    } catch (e) {
      console.log(e);
      res.send('error');
    }
  });

  //route to create a rate limit profile
  router.post('/rate-limit-profile', async (req, res) => {
    const { uniqueName, description } = req.body;

    if (!uniqueName || !description) {
      return res.status(400).json({ error: 'Unique name and description are required.' });
    }
    if (typeof uniqueName !== 'string' || typeof description !== 'string') {
      return res.status(400).json({ error: 'Invalid params' });
    }

    const profileExists = await dbState.mapGetValue('rateLimitProfiles', uniqueName);
    if (profileExists) {
      return res.status(400).json({ message: 'Rate limit profile already exists' });
    }

    // Generate a unique profile ID
    const profileId = uuidv4();

    // Create the profile object
    const profile = {
      description,
      profileId,
      uniqueName,
      rateLimits: [], // Rate limits will be applied later
    };
    // const profileData =  await dbState.get(`rateLimitProfile:${profileId}`, JSON.stringify(profile));
    // Store the profile in Redis with SET
    const saved = await dbState.set(`rateLimitProfile:${profileId}`, JSON.stringify(profile));
    //storing profile info on a hashtable as well
    await dbState.mapSet('rateLimitProfiles', { [profileId]: JSON.stringify(profile) });
    // await dbState.mapSet('rateLimitByName', { [uniqueName]: JSON.stringify(profile) });
    await dbState.set(`profileName:${uniqueName}`, profileId);
    // Respond with the generated profile ID
    res.status(201).json({ profileId });
  });

  //route to patch a rate limit profile

  router.patch('/rate-limit-profile', async (req, res) => {
    const { uniqueName, description, profileId } = req.body;

    if (!uniqueName || !description) {
      return res.status(400).json({ error: 'Unique name and description are required.' });
    }
    const profileExists = await dbState.get(`rateLimitProfile:${profileId}`);
    if (!profileExists) {
      return res.status(400).json({ message: 'Rate limit profile does not exist' });
    }

    // const profileToDelete = await dbState.get(`profileName:${uniqueName}`);
    // if (profileToDelete) {
    //   await dbState.delete(`profileName:${profileToDelete}`);
    // }

    // Generate a unique profile ID

    // Create the profile object
    const profile = {
      description,
      uniqueName,
      profileId,
      rateLimits: [], // Rate limits will be applied later
    };

    // Store the profile in Redis with SET
    await dbState.set(`rateLimitProfile:${profileId}`, JSON.stringify(profile));
    await dbState.set(`profileName:${uniqueName}`, profileId);
    await dbState.mapSet('rateLimitProfiles', { [profileId]: JSON.stringify(profile) });

    // Respond with the generated profile ID
    res.status(201).json({ profileId });
  });

  //route to delete a rate limit profile

  //route to delete a rate limit profile
  router.delete('/rate-limit-profile/:profileId', async (req, res) => {
    const { profileId } = req.params;

    if (!profileId) {
      return res.status(400).json({ error: 'Profile ID is required.' });
    }

    try {
      // Fetch the profile data by profile ID
      const profileFound = await dbState.get(`rateLimitProfile:${profileId}`);

      if (!profileFound) {
        return res.status(404).json({ message: 'Rate limit profile does not exist.' });
      }

      const profileData = JSON.parse(profileFound); // Parse the profile data to access the unique name
      const uniqueName = profileData.uniqueName;

      // Delete the profile data from Redis
      await dbState.delete(`rateLimitProfile:${profileId}`);
      await dbState.mapDelete('rateLimitProfiles', [profileId]); // Deleting from the map by profileId
      await dbState.delete(`profileName:${uniqueName}`);

      // Respond with a success message
      res.status(200).json({ message: 'Profile deleted successfully.' });
    } catch (error) {
      console.error('Error deleting profile:', error);
      res.status(500).json({ error: 'An error occurred while deleting the profile.' });
    }
  });

  //route to apply a rate limit to a profile

  router.post('/apply-rate-limit', async (req, res) => {
    const { profileId, maxRequests, interval } = req.body;

    if (!profileId || !maxRequests || !interval) {
      return res.status(400).json({ error: 'Profile ID, max requests, and interval are required.' });
    }

    if (typeof profileId !== 'string' || typeof maxRequests !== 'number' || typeof interval !== 'number') {
      return res.status(400).json({ error: 'Invalid params' });
    }

    // Fetch the profile from Redis using the profileId
    const profileData = await dbState.get(`rateLimitProfile:${profileId}`);

    if (!profileData) {
      return res.status(404).json({ error: 'Profile not found.' });
    }

    const profile = JSON.parse(profileData);

    // Check if the same rate limit already exists (to avoid duplicates)
    const isDuplicate = profile.rateLimits.some((rl) => rl.maxRequests === maxRequests && rl.interval === interval);

    if (isDuplicate) {
      return res.status(400).json({ error: 'Duplicate rate limit.' });
    }
    const rateLimitId = uuidv4();

    // Add the new rate limit to the profile
    profile.rateLimits.push({
      maxRequests,
      interval,
      rateLimitId,
    });

    await dbState.mapSet('rateLimitProfiles', { [profileId]: JSON.stringify(profile) });
    // Update the profile in Redis
    await dbState.set(`rateLimitProfile:${profileId}`, JSON.stringify(profile));

    // await dbState.mapSet('rateLimitProfiles', { [uniqueName]: JSON.stringify(profile) });

    res.status(200).json({ message: `Rate limit applied successfully.`, id: rateLimitId });
  });

  router.get('/rate-limit/:profileId/:id', async (req, res) => {
    try {
      const { id, profileId } = req.params;
      if (!id || !profileId) {
        return res.status(400).json({ error: 'id and profileId are mandatory' });
      }
      if (typeof id !== 'string' || typeof profileId !== 'string') {
        return res.status(400).json({ error: 'Invalid params' });
      }
      const respRateLimits = await dbState.get(`rateLimitProfile:${profileId}`);
      if (!respRateLimits) {
        return res.status(400).json({ message: 'Profile Not found' });
      }
      const respRateLimitsJson = JSON.parse(respRateLimits);
      const rateLimiter = respRateLimitsJson.rateLimits.find((rate) => rate.rateLimitId === id);
      if (!rateLimiter) {
        return res.status(400).json({ message: 'rate limit not found' });
      }
      res.send(rateLimiter);
    } catch (e) {
      console.log(e.message);
      res.status(500).send({ error: e.message });
    }
  });

  //route to patch a rate limit
  router.patch('/apply-rate-limit', async (req, res) => {
    const { rateLimitId, maxRequests, interval, profileId } = req.body;

    if (!rateLimitId || !maxRequests || !interval || typeof maxRequests !== 'number' || typeof interval !== 'number') {
      return res.status(400).json({ error: 'Profile ID, max requests, and interval are required.' });
    }

    // Fetch the profile from Redis using the profileId
    const profileData = await dbState.get(`rateLimitProfile:${profileId}`);

    if (!profileData) {
      return res.status(404).json({ error: 'Profile not found.' });
    }

    const profile = JSON.parse(profileData);
    const indexToReplace = profile.rateLimits.findIndex((rateLimit) => rateLimit.rateLimitId === rateLimitId);
    if (indexToReplace > -1) {
      profile.rateLimits[indexToReplace].interval = interval;
      profile.rateLimits[indexToReplace].maxRequests = maxRequests;
      await dbState.set(`rateLimitProfile:${profileId}`, JSON.stringify(profile));
      await dbState.mapSet('rateLimitProfiles', { [profileId]: JSON.stringify(profile) });
      res.status(200).json({ message: 'Rate limit updated successfully.', id: rateLimitId });
    } else {
      return res.status(404).json({ error: 'rate limiter not found.' });
    }
  });
  //route to delete a rate limit

  router.delete('/apply-rate-limit', async (req, res) => {
    const { rateLimitId, profileId } = req.body;

    if (!profileId) {
      return res.status(400).json({ error: 'Profile ID, max requests, and interval are required.' });
    }

    // Fetch the profile from Redis using the profileId
    const profileData = await dbState.get(`rateLimitProfile:${profileId}`);

    if (!profileData) {
      return res.status(404).json({ error: 'Profile not found.' });
    }

    const profile = JSON.parse(profileData);
    const indexToDelete = profile.rateLimits.findIndex((rateLimit) => rateLimit.rateLimitId === rateLimitId);
    if (indexToDelete > -1) {
      const newRateLimits = [...profile.rateLimits]; // clone the array
      newRateLimits.splice(indexToDelete, 1);
      const updatedLimiters = {
        ...profile, // copy the existing properties
        rateLimits: newRateLimits, // replace the rateLimits array
      };
      await dbState.set(`rateLimitProfile:${profileId}`, JSON.stringify(updatedLimiters));
      await dbState.mapSet('rateLimitProfiles', { [profileId]: JSON.stringify(updatedLimiters) });
      res.status(200).json({ message: 'Rate limit removed successfully.', id: rateLimitId });
    } else {
      return res.status(404).json({ error: 'rate limiter not found.' });
    }
  });

  return router;
}
