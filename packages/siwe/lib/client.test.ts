/* eslint @typescript-eslint/no-explicit-any: 0 */
const parsingPositive = require('../../../test/parsing_positive.json');
const parsingNegative = require('../../../test/parsing_negative.json');
const parsingNegativeObjects = require('../../../test/parsing_negative_objects.json');
const verificationPositive = require('../../../test/verification_positive.json');
const verificationNegative = require('../../../test/verification_negative.json');
const EIP1271 = require('../../../test/eip1271.json');

import { providers, Wallet } from 'ethers';
import { SiweMessage } from './client';
import { SiweErrorType } from './types';

describe(`Message Generation`, () => {
  test.concurrent.each(Object.entries(parsingPositive))(
    'Generates message successfully: %s',
    (_, test: any) => {
      const msg = new SiweMessage(test.fields);
      expect(msg.toMessage()).toBe(test.message);
    }
  );

  test.concurrent.each(Object.entries(parsingNegative))(
    'Fails to generate message: %s',
    (n, test) => {
      try {
        new SiweMessage(test);
      } catch (error) {
        expect(Object.values(SiweErrorType).includes(error));
      }
    }
  );

  test.concurrent.each(Object.entries(parsingNegativeObjects))(
    'Fails to generate message: %s',
    (n, test) => {
      try {
        new SiweMessage(test as any);
      } catch (error) {
        expect(Object.values(SiweErrorType).includes(error));
      }
    }
  );
});

describe(`Message verification`, () => {
  test.concurrent.each(Object.entries(verificationPositive))(
    'Verificates message successfully: %s',
    async (_, test_fields: any) => {
      const msg = new SiweMessage(test_fields);
      const params = {
        signature: test_fields.signature,
        time: ((test_fields as any).time || test_fields.issuedAt),
        domain: (test_fields as any).domain,
        nonce: (test_fields as any).nonce
      };
      await expect(
        msg.verify(params).then(async () => {
          jest
            .useFakeTimers()
            .setSystemTime(new Date((test_fields as any).time || test_fields.issuedAt))
        })
      ).resolves.toBeUndefined();
    }
  );
  test.concurrent.each(Object.entries(verificationNegative))(
    'Fails to verify message: %s and rejects the promise',
    async (n, test_fields: any) => {
      try {
        const msg = new SiweMessage(test_fields);
        await expect(
          msg
            .verify({
              signature: test_fields.signature,
              time: (test_fields as any).time || test_fields.issuedAt,
              domain: (test_fields as any).domain,
              nonce: (test_fields as any).matchNonce,
            })
        ).rejects.toBeFalsy();
      } catch (error) {
        expect(Object.values(SiweErrorType).includes(error));
      }
    }
  );
});

describe(`Round Trip`, () => {
  const wallet = Wallet.createRandom();
  test.concurrent.each(Object.entries(parsingPositive))(
    'Generates a Successfully Verifying message: %s',
    async (_, test: any) => {
      const msg = new SiweMessage(test.fields);
      msg.address = wallet.address;
      const signature = await wallet.signMessage(msg.toMessage());
      const { domain, nonce } = test.fields;
      await expect(msg.verify({ 
        signature, 
        domain,
        nonce,
        time: (new Date()).toLocaleString()
     })).resolves.toBeUndefined();
    }
  );
});

describe(`Round Trip`, () => {
  const wallet = Wallet.createRandom();
  test.concurrent.each(Object.entries(parsingPositive))(
    'Generates a Successfully Verifying message: %s',
    async (_, test: any) => {
      const msg = new SiweMessage(test.fields);
      msg.address = wallet.address;
      const signature = await wallet.signMessage(msg.toMessage());
      const { domain, nonce } = test.fields;
      await expect(msg.verify({ 
        signature,
        domain,
        nonce,
        time: (new Date()).toLocaleString()
      })).resolves.toBeUndefined();
    }
  );
});

describe(`EIP1271`, () => {
  test.concurrent.each(Object.entries(EIP1271))(
    'Verificates message successfully: %s',
    async (_, test_fields: any) => {
      const msg = new SiweMessage(test_fields.message);
      await expect(
        msg
          .verify(
            {
              signature: test_fields.signature,
              domain: test_fields.domain,
              nonce: test_fields.nonce,
              time: (new Date()).toLocaleString()
            },
            {
              provider: new providers.CloudflareProvider(1),
            },
          )
      ).resolves.toBeUndefined();
    }
  );
});

describe(`Unit`, () => {
  test('Should throw if validateMessage is called with arguments', () =>
    expect(() => {
      const msg = new SiweMessage({
        domain: 'service.org',
        address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        statement:
          'I accept the ServiceOrg Terms of Service: https://service.org/tos',
        uri: 'https://service.org/login',
        version: '1',
        chainId: 1,
        nonce: '32891757',
        issuedAt: '2021-09-30T16:25:24.000Z',
        resources: [
          'ipfs://Qme7ss3ARVgxv6rXqVPiikMJ8u2NLgmgszg13pYrDKEoiu',
          'https://example.com/my-web2-claim.json',
        ],
      });
      (msg as any).validateMessage(
        '0xdc35c7f8ba2720df052e0092556456127f00f7707eaa8e3bbff7e56774e7f2e05a093cfc9e02964c33d86e8e066e221b7d153d27e5a2e97ccd5ca7d3f2ce06cb1b'
      );
    }).toThrow());

  test('Should not throw if params are valid.', async () => {
    const wallet = Wallet.createRandom();
    const params = {
      address: wallet.address,
      domain: 'login.xyz',
      statement: 'Sign-In With Ethereum Example Statement',
      uri: 'https://login.xyz',
      version: '1',
      nonce: 'bTyXgcQxn2htgkjJn',
      issuedAt: '2022-01-27T17:09:38.578Z',
      chainId: 1,
      expirationTime: '2100-01-07T14:31:43.952Z',
    };
    const msg = new SiweMessage(params);
    const signature = await wallet.signMessage(msg.toMessage());
    const { domain, nonce } = params;
    const result = await (msg as any).verify({ signature, domain, nonce, time: (new Date()).toLocaleString() });
    expect(result).toBeUndefined();
  });

  test('Should throw if params are invalid.', async () => {
    const wallet = Wallet.createRandom();
    const params = {
      address: wallet.address,
      domain: 'login.xyz',
      statement: 'Sign-In With Ethereum Example Statement',
      uri: 'https://login.xyz',
      version: '1',
      nonce: 'bTyXgcQxn2htgkjJn',
      issuedAt: '2022-01-27T17:09:38.578Z',
      chainId: 1,
      expirationTime: '2100-01-07T14:31:43.952Z',
    };
    const msg = new SiweMessage(params);
    const signature = await wallet.signMessage(msg.toMessage());
    try {
      await (msg as any).verify({
        signature,
        invalidKey: 'should throw'
      });
    } catch (e) {
      expect(e).toEqual(
        new Error('invalidKey is/are not valid key(s) for VerifyParams.')
      );
    }
  });

  test('Should throw if opts are invalid.', async () => {
    const wallet = Wallet.createRandom();
    const msg = new SiweMessage({
      address: wallet.address,
      domain: 'login.xyz',
      statement: 'Sign-In With Ethereum Example Statement',
      uri: 'https://login.xyz',
      version: '1',
      nonce: 'bTyXgcQxn2htgkjJn',
      issuedAt: '2022-01-27T17:09:38.578Z',
      chainId: 1,
      expirationTime: '2100-01-07T14:31:43.952Z',
    });
    const signature = await wallet.signMessage(msg.toMessage());
    try {
      await (msg as any).verify(
        { signature },
        { invalidKey: 'should throw' }
      );
    } catch (e) {
      expect(e).toEqual(
        new Error('invalidKey is/are not valid key(s) for VerifyOpts.')
      );
    }
  });
});
