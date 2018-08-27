'use strict';
import batch from './batch';
import request = require('request');
import log  = require('./log');
import pjson = require('pjson');

const current_version = pjson.version;

/* Check if the current version is the latest */
log.info('Crunchy version ' + current_version);
request.get({ uri: 'https://box.godzil.net/getVersion.php?tool=crunchy&v=' + current_version },
                  (error: Error, response: any, body: any) =>
{
  if (response && (response.statusCode === 200))
  {
    const onlinepkg = JSON.parse(body);
    if (onlinepkg.status === 'ok')
    {
      let tmp = current_version.split('.');
      const cur = (Number(tmp[0]) * 10000) + (Number(tmp[1]) * 100) + Number(tmp[2]);
      tmp = onlinepkg.version.split('.');
      const dist = (Number(tmp[0]) * 10000) + (Number(tmp[1]) * 100) + Number(tmp[2]);
      if (dist > cur)
      {
        log.warnMore('There is a newer version of crunchy (v' + onlinepkg.version + '), you should update!');
      }
    }
  }
  else
  {
    log.info('Error while checking for the current version.');
  }
});

batch(process.argv, (err: any) =>
{
  if (err)
  {
    if (err.stack)
    {
      console.error(err.stack || err);
    }
    else
    {
      console.error(err);
    }
    process.exit(-1);
  }
  console.info('Done!');
  process.exit(0);
});
