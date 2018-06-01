'use strict';
import batch from './batch';

batch(process.argv, (err: any) =>
{
  if (err)
  {
    console.error(err.stack || err);
    process.exit(-1);
  }
  console.log('Done!');
  process.exit(0);
});
