'use strict';

const axios = require('axios');
const { DateTime, Settings } = require('luxon');
const getSecrets = require('./helpers/getSecrets');
const log = require('./helpers/log');
const putObject = require('./helpers/putObject');
const putSecret = require('./helpers/putSecret');

Settings.defaultZoneName = 'America/New_York';

/**
 * Steps to generate Fitbit access token
 *
 * 1. register app, https://dev.fitbit.com/apps
 * 2. click "OAuth 2.0 tutorial page" link
 * 3. check "Implicit Grant Flow" option
 * 4. check only "heartrate" from "Select Scopes"
 * 5. enter "63072000000" (2 years) for "Expires In(ms)"
 * 6. click the https://www.fitbit.com/oauth2/authorize?... link [redirects to your website]
 * 7. get access token from query string of redirect URL
 *
 * see authorization code grant flow, https://dev.fitbit.com/build/reference/web-api/oauth2/#authorization-code-grant-flow
 */

module.exports = async function storeFitbitHeartRate({ BUCKET, TODAY = DateTime.local().toISODate() }) {
  // Get secrets
  const {
    FITBIT_CLIENT_ID,
    FITBIT_CLIENT_SECRET,
    FITBIT_REFRESH_TOKEN,
    FITBIT_USER_ID
  } = await getSecrets('FITBIT_CLIENT_ID', 'FITBIT_CLIENT_SECRET', 'FITBIT_REFRESH_TOKEN', 'FITBIT_USER_ID');

  // Refresh access token
  const { data: { access_token:accessToken, refresh_token:refreshToken }} = await axios({
    method: 'post',
    url: 'https://api.fitbit.com/oauth2/token',
    headers: {
      Authorization: `Basic ${new Buffer(`${FITBIT_CLIENT_ID}:${FITBIT_CLIENT_SECRET}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    data: `grant_type=refresh_token&refresh_token=${FITBIT_REFRESH_TOKEN}`,
    timeout: 60 * 1000
  });

  // Stash refresh token for next use
  await putSecret('FITBIT_REFRESH_TOKEN', refreshToken);

  // Get heart rate every minute for "today"
  // see, https://dev.fitbit.com/build/reference/web-api/heart-rate/
  const response = await axios({
    url: `https://api.fitbit.com/1/user/${FITBIT_USER_ID}/activities/heart/date/${TODAY}/1d.json`,
    headers: {
      Authorization: `Bearer ${accessToken}`
    },
    timeout: 60 * 1000
  });

  const { dataset } = response.data['activities-heart-intraday'];

  // Transform
  // [{ time: '00:00:00', value: 56 }] ~> [{ time: '2018-01-01T00:00:00-04:00', rate: 56 }]
  const normalized = dataset.reduce((accumulator, { time, value: rate }) => [
    ...accumulator, { time: DateTime.fromSQL(`${TODAY} ${time}`).toISO(), rate }
  ], []);

  // Load
  await putObject({ bucket: BUCKET, key: `${TODAY}.json`, data: normalized });

  log({ today: TODAY, size: normalized.length });
}
