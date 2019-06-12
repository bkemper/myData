const log = require('../log');
const handle = require('../handle');

jest.mock('../log');

describe('handle', () => {
  it('executes function', async () => {
    const context = { awsRequestId: '1111-1111-1111-1111-1111' };
    const env = { BUCKET: 'example' };
    const fn = jest.fn(() => 'success!');

    await expect(handle(fn, env)(undefined, context)).resolves.toEqual('success!');
    expect(fn).toHaveBeenCalledWith(env);
  });

  it('ignores retries', async () => {
    const context = { awsRequestId: '2222-2222-2222-2222-2222' };
    const fn = jest.fn(() => Promise.reject(Error('Oh no!')));
    const handler = handle(fn);

    await expect(handler(undefined, context)).rejects.toThrowError('Oh no!');
    await expect(handler(undefined, context)).resolves.toBeUndefined();
    expect(log).toHaveBeenCalledWith(expect.stringMatching(/Ignoring/));
  });
});
