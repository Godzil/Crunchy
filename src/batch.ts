'use strict';
import commander = require('commander');
import fs = require('fs');
import path = require('path');
import log = require('./log');
import series from './series';

/* correspondances between resolution and value CR excpect */
const resol_table: { [id: string]: IResolData; } =
{
    360:  {quality: '60', format: '106'},
    480:  {quality: '61', format: '106'},
    720:  {quality: '62', format: '106'},
    1080: {quality: '80', format: '108'},
};

/**
 * Streams the batch of series to disk.
 */
export default function(args: string[], done: (err?: Error) => void)
{
  const config = parse(args);
  const batchPath = path.join(config.output || process.cwd(), 'CrunchyRoll.txt');

  // set resolution
  if (config.resolution)
  {
    try
    {
      config.video_format = resol_table[config.resolution].format;
      config.video_quality = resol_table[config.resolution].quality;
    }
    catch (e)
    {
      log.warn(`Invalid resolution ${config.resolution}p. Setting to 1080p`);
      config.video_format = resol_table['1080'].format;
      config.video_quality = resol_table['1080'].quality;
    }
  }
  else
  {
    /* 1080 by default */
    config.video_format = resol_table['1080'].format;
    config.video_quality = resol_table['1080'].quality;
  }

  tasks(config, batchPath, (err, tasksArr) =>
  {
    if (err) return done(err);

    let i = 0;

    (function next()
    {
      if (i >= tasksArr.length)
      {
        return done();
      }

      series(tasksArr[i].config, tasksArr[i].address, (errin) =>
      {
        if (errin)
        {
          return done(errin);
        }
        i += 1;
        next();
      });
    })();
  });
}

/**
 * Splits the value into arguments.
 */
function split(value: string): string[]
{
  let inQuote = false;
  let i: number;
  const pieces: string[] = [];
  let previous = 0;

  for (i = 0; i < value.length; i += 1)
  {
    if (value.charAt(i) === '"')
    {
      inQuote = !inQuote;
    }

    if (!inQuote && value.charAt(i) === ' ')
    {
      pieces.push(value.substring(previous, i).match(/^"?(.+?)"?$/)[1]);
      previous = i + 1;
    }
  }

  const lastPiece = value.substring(previous, i).match(/^"?(.+?)"?$/);

  if (lastPiece)
  {
    pieces.push(lastPiece[1]);
  }

  return pieces;
}

/**
 * Parses the configuration or reads the batch-mode file for tasks.
 */
function tasks(config: IConfigLine, batchPath: string, done: (err: Error, tasks?: IConfigTask[]) => void)
{
  if (config.args.length)
  {
    const configIn = config;

    return done(null, config.args.map((addressIn) =>
    {
      return {address: addressIn, config: configIn};
    }));
  }

  fs.exists(batchPath, (exists) =>
  {
    if (!exists)
    {
      return done(null, []);
    }

    fs.readFile(batchPath, 'utf8', (err, data) =>
    {
      if (err)
      {
        return done(err);
      }

      const map: IConfigTask[] = [];

      data.split(/\r?\n/).forEach((line) =>
      {
        if (/^(\/\/|#)/.test(line))
        {
          return;
        }

        const lineConfig = parse(process.argv.concat(split(line)));

        lineConfig.args.forEach((addressIn) =>
        {
          if (!addressIn)
          {
            return;
          }

          map.push({address: addressIn, config: lineConfig});
        });
      });
      done(null, map);
    });
  });
}

/**
 * Parses the arguments and returns a configuration.
 */
function parse(args: string[]): IConfigLine
{
  return new commander.Command().version(require('../package').version)
    // Authentication
    .option('-p, --pass <s>', 'The password.')
    .option('-u, --user <s>', 'The e-mail address or username.')
    // Disables
    .option('-c, --cache', 'Disables the cache.')
    .option('-m, --merge', 'Disables merging subtitles and videos.')
    // Filters
    .option('-e, --episode <i>', 'The episode filter.')
    .option('-v, --volume <i>', 'The volume filter.')
    // Settings
    .option('-f, --format <s>', 'The subtitle format. (Default: ass)')
    .option('-o, --output <s>', 'The output path.')
    .option('-s, --series <s>', 'The series override.')
    .option('-n, --filename <s>', 'The name override.')
    .option('-t, --tag <s>', 'The subgroup. (Default: CrunchyRoll)')
    .option('-r, --resolution <s>', 'The video resolution. (Default: 1080 (360, 480, 720, 1080))')
    .option('-g, --rebuildcrp', 'Rebuild the crpersistant file.')
    .parse(args);
}
