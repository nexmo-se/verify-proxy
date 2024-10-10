# VCR Starter Project

This project creates a middleware server to apply rate limits to your Verify requests.

Rate limits offer the ability to enforce restrictions, but they don't dictate which properties should be limited. You have the choice of what to limit. For instance, rate limiting based on IP address makes sense in a mobile consumer app where the End User's IP address is readily available. You can also decide to rate-limit based on your own UUIDs like customer Ids or other identifier.

Some properties that can be rate limited include:

End User IP Address,
Geolocation of End User IP Address,
Phone Number,
User Id

## Whitelist

The app exposes a whitelist service that can be consumed via APIs to add users to a safe list. The users included in this safe list won't be subject to any rate limit. So even if you pass the request to the middleware server with a specific rate limit, it will be skipped if the user is whitelisted.

### Whitelist a user

```
curl -X POST https://{APP_URL}/whitelist' \
-H "Content-Type: application/json" \
-d '{"number": "232323232"}'

```

### Check if a user is whitelisted

```
curl -X GET 'https://{APP_URL}/whitelist/query/:number' \
-H 'Content-Type: application/json' \'
```

### Delete a whitelisted user

```
curl -X DELETE https://{APP_URL}/whitelist' \
-H "Content-Type: application/json" \
-d '{"number": "34628124718"}'
```

## Profiles creation

This will create a profile

```
 curl -X POST https://{APP_URL}/profiles/rate-limit-profile \
-H "Content-Type: application/json" \
-d '{"uniqueName": "ip_verification_limit", "description": "Limit requests for end users iP"}'
```

returns

{"profileId":"aaaa-bbb-425a-ab2e-b569bddd9395"}%

If you want to change an existing profile

```
 curl -X PATCH https://{APP_URL}/profiles/rate-limit-profile \
-H "Content-Type: application/json" \
-d '{"uniqueName": "ip_verification_limit", "description": "Limit requests for end users iP", "profileId":"aaaa-bbb-425a-ab2e-b569bddd9395"}'

```

Deleting an existing profile

```

 curl -X DELETE https://{APP_URL}/profiles/${profileId} \
-H "Content-Type: application/json" \
```

## Apply rate limit to a profile

This will apply a rate limit to a previously created profile. For instance, in this case maximum of 2 requests per 10 minutes interval.

```
 curl -X POST https://{APP_URL}/profiles/apply-rate-limit \
-H "Content-Type: application/json" \
-d '{"profileId": "aaaa-bbb-425a-ab2e-b569bddd9395" "maxRequests": 2, "interval":600}'

```

## Change an existing rate limit

```

curl -X PATCH https://{APP_URL}/profiles/apply-rate-limit \
-H "Content-Type: application/json" \
-d '{"profileId": "aaaa-bbb-425a-ab2e-b569bddd9395" "maxRequests": 2, "interval":600, rateLimitId:"11232"}'

```

You can create another rate limit and apply it to the same profile. For instance maximum of 5 requests per hour.

```
curl curl -X POST https://{APP_URL}/profiles/apply-rate-limit \
-H "Content-Type: application/json" \
-d '{"profileId": "aaaa-bbb-425a-ab2e-b569bddd9395", "maxRequests": 5, "interval":3600}'
```

## Call the verify middleware

This endpoint will be called by the customer and a rate limit corresponding to the profile (ip_verification_limit) will be applied. This means that requests coming from the IP 127.0.0.1 will be rate-limited at maximum 2 requests per 10 minutes and 5 requests per hour. Subsequents requests will be rejected

```
 curl -X POST https://{APP_URL}/verify \
-H "Authorization: Basic ${basicauth}" \
-H "Content-Type: application/json" \
-d '{"to": "447666666666", "rateLimits": { "a650a578-7788-425a-ab2e-b569bddd9395": "127.0.0.1" }}'

```

For testing purposes you can also just test the rate limit logic and simulate a call to the verify API

```
 curl -X POST https://{APP_URL}/fakeverify \
-H "Authorization: Basic ${basicauth}" \
-H "Content-Type: application/json" \
-d '{"to": "447666666666", "rateLimits": { "a650a578-7788-425a-ab2e-b569bddd9395": "127.0.0.1" }}'




### Running the project

Create your own vcr project and populate the `vcr.yml` file

```

vcr deploy

```

or if you want to run the project on debug mode

```

vcr debug

```

View the [deploying guide](https://developer.vonage.com/vcr/guides/deploying) to learn more about deploying on Vonage Cloud Runtime.

```

```

```
