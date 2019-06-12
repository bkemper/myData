'use strict';

const AWS = require('aws-sdk');

// note, batchGetItem to reduce number of requests
module.exports = async function putSecret(name, value) {
  const dynamodb = new AWS.DynamoDB();
  const params = {
    Item: {
      'name': { S: name },
      'value': { S: value },
    },
    TableName: 'secrets'
  };

  await dynamodb.putItem(params).promise();
}
