'use strict';

const aws = require('aws-sdk');
const axios = require('axios');
const { DateTime, Settings } = require('luxon');

Settings.defaultZoneName = 'America/New_York';

module.exports = async function storeFitbitHeartRate() {
  const fitbit = axios.create({
    baseURL: `https://api.fitbit.com/1/user/${process.env.FITBIT_USER_ID}`,
    headers: {
      Authorization: `Bearer ${process.env.FITBIT_ACCESS_TOKEN}`
    },
    timeout: 60 * 1000,
  });
  const s3 = new aws.S3(); // inherit from the provider.role
  const today = process.env.TODAY || DateTime.local().toISODate(); // 2018-05-03

  // Get heart rate every minute for "today"
  const response = await fitbit.get(`/activities/heart/date/${today}/1d.json`);

  const { dataset } = response.data['activities-heart-intraday'];

  // Transform
  // [{ time: '00:00:00', value: 56 }] ~> [{ t: '2018-01-01T00:00:00-04:00', r: 56 }]
  const normalized = dataset.reduce((accumulator, { time, value: rate }) => [
    ...accumulator, { time: DateTime.fromSQL(`${today} ${time}`).toISO(), rate }
  ], []);

  // Write to S3 file
  await s3.putObject({
    ACL: 'public-read',
    Body: JSON.stringify(normalized),
    Bucket: process.env.S3_BUCKET,
    Key: `${today}.json`,
  }).promise();

  return { today, size: normalized.length };
}
