const log = require('./log');

let prevRequestId;

// Run a function in a common way with async/await
// see, https://aws.amazon.com/blogs/compute/node-js-8-10-runtime-now-available-in-aws-lambda/
const handle = (fn, env = process.env) => async (event, context) => {
  // Ignore failed requests that are being retried, lambdas will automatically retry three times on
  // failure, there is no way to turn this off, do not suppress errors, need to accurately report
  // to CloudWatch
  // see, https://docs.aws.amazon.com/lambda/latest/dg/retries-on-errors.html
  // see, https://medium.com/@meego/disable-auto-retries-in-aws-lambda-4443cb18fde4
  if (prevRequestId === context.awsRequestId) {
    log('Ignoring retry of this failed request');
    return;
  }

  prevRequestId = context.awsRequestId;

  return await fn(env);
};

module.exports = handle;
