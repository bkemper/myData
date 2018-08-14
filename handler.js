'use strict';
const storeFitbitHeartRate = require('./storeFitbitHeartRate');

module.exports.storeFitbitHeartRate = async function(event, context, callback) {
  try {
    console.log(await storeFitbitHeartRate());
  } catch(error) {
    console.error(error); // shh
  }

  callback();
}
