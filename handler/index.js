'use strict';

const handle = require('./helpers/handle');

module.exports.storeFitbitHeartRate = handle(require('./storeFitbitHeartRate'));
module.exports.storeGithubEvents = handle(require('./storeGithubEvents'));
module.exports.storeSpotifySongs = handle(require('./storeSpotifySongs'));
