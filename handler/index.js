'use strict';

const handle = require('./helpers/handle');

module.exports.storeFitbitHeartRate = handle(require('./storeFitbitHeartRate'));
module.exports.storeGithubEvents = handle(require('./storeGithubEvents'));
