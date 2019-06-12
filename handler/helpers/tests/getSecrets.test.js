const AWS = require('aws-sdk');
const getSecrets = require('../getSecrets');

jest.mock('aws-sdk');

describe('getSecrets', () => {
  it('returns secrets', async () => {
    const batchGetItem = jest.fn(() => ({
      promise: () => Promise.resolve({
        Responses: {
          secrets: [{ name: { S: 'MY_TOKEN' }, value: { S: 'abc' }}]
        }
      })
    }));

    AWS.DynamoDB.mockImplementation(() => ({ batchGetItem }));

    await expect(getSecrets('MY_TOKEN')).resolves.toEqual({ MY_TOKEN: 'abc' });
    expect(batchGetItem).toHaveBeenCalledWith({
      RequestItems: {
        secrets: {
          Keys: [{ name: { S: 'MY_TOKEN' }}]
        }
      }
    });
  });

  it('throws error when unable to get all secrets', async () => {
    const batchGetItem = jest.fn(() => ({
      promise: () => Promise.resolve({ Responses: { secrets: [] }})
    }));

    AWS.DynamoDB.mockImplementation(() => ({ batchGetItem }));

    await expect(getSecrets('MY_TOKEN')).rejects.toThrowError(/Unable to get secret/);
  });
});
