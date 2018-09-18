'use strict';

function handle(fn) {
  return async function(event, context, callback) {
    try {
      console.log(await fn());
    } catch(error) {
      console.error(error); // shh
    }

    callback();
  }
}

module.exports.storeFitbitHeartRate = handle(require('./storeFitbitHeartRate'));
module.exports.storeGithubEvents = handle(require('./storeGithubEvents'));
