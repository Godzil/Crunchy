'use strict';
import batch from './batch';
import request = require('request');
import log  = require('./log');
import pjson = require('pjson');

const current_version = pjson.version;

/* Check if the current version is the latest */
log.info('Crunchy version ' + current_version);
request.get({ uri: 'https://raw.githubusercontent.com/Godzil/Crunchy/master/package.json' },
                  (error: Error, response: any, body: any) =>
{
  const onlinepkg = JSON.parse(body);
  let tmp = current_version.split('.');
  const cur = (Number(tmp[0]) * 10000) + (Number(tmp[1]) * 100) + Number(tmp[2]);
  tmp = onlinepkg.version.split('.');
  const dist = (Number(tmp[0]) * 10000) + (Number(tmp[1]) * 100) + Number(tmp[2]);
  if (dist > cur)
  {
    log.warn('There is a newer version of crunchy (v' + onlinepkg.version + '), you should update!');
  }
});

batch(process.argv, (err: any) =>
{
  if (err)
  {
    console.error(err.stack || err);
    process.exit(-1);
  }
  console.info('Done!');
  process.exit(0);
});
