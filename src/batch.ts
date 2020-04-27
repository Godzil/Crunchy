'use strict';
import commander = require('commander');
import fs = require('fs');
import path = require('path');
import log = require('./log');
import my_request = require('./my_request');
import cfg = require('./config');
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
  const config = Object.assign(cfg.load(), parse(args));
  let batchPath;

  if (path.isAbsolute(config.batch))
  {
    batchPath = path.normalize(config.batch);
  }
  else
  {
    batchPath = path.normalize(path.join(process.cwd(), config.batch));
  }

  if (config.nametmpl === undefined)
  {
    config.nametmpl = '{SERIES_TITLE} - s{SEASON_NUMBER}e{EPISODE_NUMBER} - {EPISODE_TITLE} - [{TAG}]';
  }

  if (config.tag === undefined)
  {
    config.tag = 'CrunchyRoll';
  }

  if (config.sublang === undefined)
  {
    config.sublang = [ 'enUS' ];
  }

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
      log.warn('Invalid resolution ' + config.resolution + 'p. Setting to 1080p');
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

  // Update the config file with new parameters
  cfg.save(config);

  if (config.unlog)
  {
    config.crDeviceId = undefined;
    config.user = undefined;
    config.pass = undefined;
    my_request.eatCookies(config);
    cfg.save(config);
    log.info('Unlogged!');

    process.exit(0);
  }

  if (config.debug)
  {
    /* Ugly but meh */
    const tmp = JSON.parse(JSON.stringify(config));
    tmp.pass = 'obfuscated';
    tmp.user = 'obfustated';
    tmp.rawArgs = undefined;
    tmp.options = undefined;
    log.dumpToDebug('Config', JSON.stringify(tmp), true);
  }

  tasks(config, batchPath, (err, tasksArr) =>
  {
    if (err)
    {
        return done(err);
    }

    if (!tasksArr || !tasksArr[0] || (tasksArr[0].address === ''))
    {
        return done();
    }

    let i = 0;

    (function next()
    {
      if (i >= tasksArr.length)
      {
        // Save configuration before leaving (should store info like session & other)
        cfg.save(config);

        return done();
      }

      if (config.debug)
      {
        log.dumpToDebug('Task ' + i, JSON.stringify(tasksArr[i]));
      }

      series(config, tasksArr[i], (errin) =>
      {
        if (errin)
        {
          if (errin.error)
          {
            /* Error from the request, so ignore it */
            tasksArr[i].retry = 0;
          }

          if (errin.authError)
          {
            /* Force a graceful exit */
            log.error(errin.message);
            i = tasksArr.length;
          }
          else if (tasksArr[i].retry <= 0)
          {
            log.error(JSON.stringify(errin));
            if (config.debug)
            {
              log.dumpToDebug('BatchGiveUp', JSON.stringify(errin));
            }
            log.error('Cannot get episodes from "' + tasksArr[i].address + '", please rerun later');
            /* Go to the next on the list */
            i += 1;
          }
          else
          {
            if (config.verbose)
            {
              log.error(JSON.stringify(errin));
            }
            if (config.debug)
            {
              log.dumpToDebug('BatchRetry', JSON.stringify(errin));
            }
            log.warn('Retrying to fetch episodes list from' + tasksArr[i].retry + ' / ' + config.retry);
            tasksArr[i].retry -= 1;
          }
        }
        else
        {
          i += 1;
        }
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

function get_min_filter(filter: string): IEpisodeNumber
{
  if (filter !== undefined)
  {
    const tok = filter.split('-');

    if (tok.length > 2)
    {
      log.error('Invalid episode filter \'' + filter + '\'');
      process.exit(-1);
    }

    if (tok[0] !== '')
    {
      /* If first item is not empty, ie '10-20' */
      if (tok[0].includes('e'))
      {
        /* include a e so we probably have something like 5e10
           aka season 5 episode 10
         */
        const tok2 = tok[0].split('else');
        if (tok2.length > 2)
        {
          log.error('Invalid episode filter \'' + filter + '\'');
          process.exit(-1);
        }

        if (tok[0] !== '')
        {
          /* So season is properly filled */
          return {season: parseInt(tok2[0], 10), episode: parseInt(tok2[1], 10)};
        }
        else
        {
          /* we have 'e10' */
          return {season: 0, episode: parseInt(tok2[1], 10)};
        }
      }
      else
      {
        return {season: 0, episode: parseInt(tok[0], 10)};
      }
    }
  }
  /* First item is empty, ie '-20' */
  return {season: 0, episode: 0};
}

function get_max_filter(filter: string): IEpisodeNumber
{
  if (filter !== undefined)
  {
    const tok = filter.split('-');

    if (tok.length > 2)
    {
      log.error('Invalid episode filter \'' + filter + '\'');
      process.exit(-1);
    }

    if ((tok.length > 1) && (tok[1] !== ''))
    {
      /* We have a max value */
      return  {season: +Infinity, episode: parseInt(tok[1], 10)};
    }
    else if ((tok.length === 1) && (tok[0] !== ''))
    {
      /* A single episode has been requested */
      return  {season: +Infinity, episode: parseInt(tok[0], 10) + 1};
    }
  }
  return  {season: +Infinity, episode: +Infinity};
}

/**
 * Check that URL start with http:// or https://
 * As for some reason request just return an error but a useless one when that happen so check it
 * soon enough.
 */
function checkURL(address: string): boolean
{
  if (address.startsWith('http:\/\/'))
  {
    return true;
  }
  if (address.startsWith('https:\/\/'))
  {
    return true;
  }
  if (address.startsWith('@http:\/\/'))
  {
    return true;
  }
  if (address.startsWith('@https:\/\/'))
  {
    return true;
  }

  log.error('URL ' + address + ' miss \'http:\/\/\' or \'https:\/\/\' => will be ignored');

  return false;
}

/**
 * Parses the configuration or reads the batch-mode file for tasks.
 */
function tasks(config: IConfigLine, batchPath: string, done: (err: Error, tasks?: IConfigTask[]) => void)
{
  if (config.args.length)
  {
    return done(null, config.args.map((addressIn) =>
    {
      if (checkURL(addressIn))
      {
        return {address: addressIn, retry: config.retry,
                episode_min: get_min_filter(config.episodes), episode_max: get_max_filter(config.episodes)};
      }

      return {address: '', retry: 0, episode_min: {season: 0, episode: 0}, episode_max: {season: 0, episode: 0}};
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

          if (checkURL(addressIn))
          {
            map.push({address: addressIn, retry: lineConfig.retry,
                      episode_min: get_min_filter(lineConfig.episodes), episode_max: get_max_filter(lineConfig.episodes)});
          }
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
    .option('-d, --unlog', 'Unlog')
    // Disables
    .option('-c, --cache', 'Disables the cache.')
    .option('-m, --merge', 'Disables merging subtitles and videos.')
    // Episode filter
    .option('-e, --episodes <s>', 'Episode list. Read documentation on how to use')
    // Settings
    .option('-l, --crlang <s>', 'CR page language (valid: en, fr, es, it, pt, de, ru).')
    .option('-f, --format <s>', 'The subtitle format.', 'ass')
    .option('-o, --output <s>', 'The output path.')
    .option('-s, --series <s>', 'The series name override.')
    .option('--ignoredub', 'Experimental: Ignore all seasons where the title end with \'Dub)\'')
    .option('-n, --nametmpl <s>', 'Output name template')
    .option('-t, --tag <s>', 'The subgroup.')
    .option('-r, --resolution <s>', 'The video resolution. (valid: 360, 480, 720, 1080)')
    .option('-b, --batch <s>', 'Batch file', 'CrunchyRoll.txt')
    .option('--verbose', 'Make tool verbose')
    .option('--debug', 'Create a debug file. Use only if requested!')
    .option('--rebuildcrp', 'Rebuild the crpersistant file.')
    .option('--retry <i>', 'Number or time to retry fetching an episode.', '5')
    .parse(args);
}
