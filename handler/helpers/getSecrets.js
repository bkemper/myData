'use strict';

const AWS = require('aws-sdk');
const difference = require('./difference');

// note, batchGetItem to reduce number of requests
module.exports = async function getSecrets(...names) {
  const dynamodb = new AWS.DynamoDB();
  const params = {
    RequestItems: {
      secrets: {
        Keys: names.map((name) => ({ name: { S: name }}))
      }
    }
  };
  const { Responses: { secrets }} = await dynamodb.batchGetItem(params).promise();
  const receivedSecrets = secrets.map(({ name }) => name.S);
  const missingSecrets = difference(names, receivedSecrets);

  if (missingSecrets.length) {
    throw new Error(`Unable to get secret(s) — ${missingSecrets.join(',')}`);
  }

  return secrets.reduce((acc, { name, value }) => ({ ...acc, [name.S]: value.S }), {});
}
