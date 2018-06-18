/* tslint:disable:no-bitwise false */
'use strict';
import bigInt = require('big-integer');
import crypto = require('crypto');
import zlib = require('zlib');

/**
 * Decodes the data.
 */
export default function(id: number, iv: Buffer|string, data: Buffer|string,
                        done: (err?: Error, result?: Buffer) => void)
{
  try
  {
    decompress(decrypt(id, iv, data), done);
  } catch (e)
  {
    done(e);
  }
}

/**
 * Decrypts the data.
 */
function decrypt(id: number, iv: Buffer|string, data: Buffer|string)
{
  const ivBuffer = typeof iv === 'string' ? new Buffer(iv, 'base64') : iv;
  const dataBuffer = typeof data === 'string' ? new Buffer(data, 'base64') : data;
  const decipher = crypto.createDecipheriv('aes-256-cbc', key(id), ivBuffer);

  decipher.setAutoPadding(false);

  return Buffer.concat([decipher.update(dataBuffer), decipher.final()]);
}

/**
 * Decompresses the data.
 */
function decompress(data: Buffer, done: (err: Error, result?: Buffer) => void)
{
  try
  {
    zlib.inflate(data, done);
  } catch (e)
  {
    done(null, data);
  }
}

/**
 * Generates a key.
 */
function key(subtitleId: number): Buffer
{
  const hash = secret(20, 97, 1, 2) + magic(subtitleId);
  const result = Buffer.allocUnsafe(32);

  result.fill(0);
  crypto.createHash('sha1').update(hash).digest().copy(result);

  return result;
}

/**
 * Generates a magic number.
 */
function magic(subtitleId: number): number
{
  const base = Math.floor(Math.sqrt(6.9) * Math.pow(2, 25));
  const hash = bigInt(base).xor(subtitleId).toJSNumber();
  const multipliedHash = bigInt(hash).multiply(32).toJSNumber();

  return bigInt(hash).xor(hash >> 3).xor(multipliedHash).toJSNumber();
}

/**
 * Generates a secret string based on a Fibonacci sequence.
 */
function secret(size: number, modulo: number, firstSeed: number, secondSeed: number): string
{
  let currentValue = firstSeed + secondSeed;
  let previousValue = secondSeed;
  let result = '';

  for (let i = 0; i < size; i += 1)
  {
    const oldValue = currentValue;
    result += String.fromCharCode(currentValue % modulo + 33);
    currentValue += previousValue;
    previousValue = oldValue;
  }

  return result;
}
