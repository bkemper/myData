const AWS = require('aws-sdk');
const log = require('./log');

const putObject = async ({ bucket:Bucket, data, key:Key }) => {
  const s3 = new AWS.S3(); // inherit from the provider.role

  if (process.env.IS_LOCAL) {
    log(data);
    return;
  }

  // Write to S3 file
  await s3.putObject({ ACL: 'public-read', Body: JSON.stringify(data), Bucket, Key }).promise();
}

module.exports = putObject;
