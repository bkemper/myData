const AWS = require('aws-sdk');

const getObject = async ({ bucket:Bucket, defaultValue = [], key:Key }) => {
  const s3 = new AWS.S3();
  let object;

  // Fetch data
  try {
    object = await s3.getObject({ Bucket, Key }).promise();
  } catch (error) {
    if (error.code === 'NoSuchKey') {
      return defaultValue;
    }

    throw error;
  }

  return JSON.parse(object.Body.toString('utf8'));
};

module.exports = getObject;
