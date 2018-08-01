'use strict';
import cheerio = require('cheerio');
import episode from './episode';
// import fs = require('fs');
import fs = require('fs-extra');
import my_request = require('./my_request');
import path = require('path');
import url = require('url');
import log  = require('./log');
const persistent = '.crpersistent';

/**
 * Check if a file exist..
 */
function fileExist(path: string)
{
  try
  {
    fs.statSync(path);
    return true;
  } catch (e)
  {
    return false;
  }
}

/**
 * Streams the series to disk.
 */
export default function(config: IConfig, task: IConfigTask, done: (err: any) => void)
{
  const persistentPath = path.join(config.output || process.cwd(), persistent);

  /* Make a backup of the persistent file in case of */
  if (fileExist(persistentPath))
  {
    fs.copySync(persistentPath, persistentPath + '.backup');
  }

  fs.readFile(persistentPath, 'utf8', (err: Error, contents: string) =>
  {
    const cache = config.cache ? {} : JSON.parse(contents || '{}');

    pageScrape(config, task, (errP, page) =>
    {
      if (errP)
      {
        const reqErr = errP.error;
        if ((reqErr !== undefined) && (reqErr.syscall))
        {
          if ((reqErr.syscall === 'getaddrinfo') && (reqErr.errno === 'ENOTFOUND'))
          {
            log.error('The URL \'' + task.address + '\' is invalid, please check => I\'m ignoring it.');
          }
        }

        return done(errP);
      }

      let i = 0;
      (function next()
      {
        if (config.debug)
        {
          log.dumpToDebug('Episode ' + i, JSON.stringify(page.episodes[i]));
        }

        if (i >= page.episodes.length) return done(null);
        download(cache, config, task, page.episodes[i], (errD, ignored) =>
        {
          if (errD)
          {
            /* Check if domain is valid */
            const reqErr = errD.error;
            if ((reqErr !== undefined) && (reqErr.syscall))
            {
              if ((reqErr.syscall === 'getaddrinfo') && (reqErr.errno === 'ENOTFOUND'))
              {
                page.episodes[i].retry = 0;
                log.error('The URL \'' + task.address + '\' is invalid, please check => I\'m ignoring it.');
              }
            }

            if (page.episodes[i].retry <= 0)
            {
              log.error(JSON.stringify(errD));
              log.error('Cannot fetch episode "s' + page.episodes[i].volume + 'e' + page.episodes[i].episode +
                            '", please rerun later');
              /* Go to the next on the list */
              i += 1;
            }
            else
            {
              if ((config.verbose) || (config.debug))
              {
                if (config.debug)
                {
                  log.dumpToDebug('series address', task.address);
                  log.dumpToDebug('series error', JSON.stringify(errD));
                  log.dumpToDebug('series data', JSON.stringify(page));
                }
                log.error(errD);
              }
              log.warn('Retrying to fetch episode "s' + page.episodes[i].volume + 'e' + page.episodes[i].episode +
                           '" - Retry ' + page.episodes[i].retry + ' / ' + config.retry);
              page.episodes[i].retry -= 1;
            }
            next();
          }
          else
          {
            if ((ignored === false) || (ignored === undefined))
            {
              const newCache = JSON.stringify(cache, null, '  ');
              fs.writeFile(persistentPath, newCache, (errW: Error) =>
              {
                if (errW)
                {
                  return done(errW);
                }

                i += 1;
                next();
              });
            }
            else
            {
              i += 1;
              next();
            }
          }
        });
      })();
    });
  });
}

/**
 * Downloads the episode.
 */
function download(cache: {[address: string]: number}, config: IConfig,
                  task: IConfigTask, item: ISeriesEpisode,
                  done: (err: any, ign: boolean) => void)
{
  const episodeNumber = parseInt(item.episode, 10);

  if ( (episodeNumber < task.episode_min) ||
       (episodeNumber > task.episode_max) )
  {
    return done(null, false);
  }

  const address = url.resolve(task.address, item.address);

  if (cache[address])
  {
    return done(null, false);
  }

  episode(config, address, (err, ignored) =>
  {
    if (err)
    {
      return done(err, false);
    }

    cache[address] = Date.now();
    done(null, ignored);
  });
}

/**
 * Requests the page and scrapes the episodes and series.
 */
function pageScrape(config: IConfig, task: IConfigTask, done: (err: any, result?: ISeries) => void)
{
  if (task.address[0] === '@')
  {
    log.info('Trying to fetch from ' + task.address.substr(1));
    const episodes: ISeriesEpisode[] = [];
    episodes.push({
      address: task.address.substr(1),
      episode: '',
      seasonName: '',
      volume: 0,
      retry: config.retry,
    });
    done(null, {episodes: episodes.reverse(), series: ''});
  }
  else
  {
    let episodeCount = 0;
    my_request.get(config, task.address, (err, result) => {
      if (err)
      {
        return done(err);
      }

      const $ = cheerio.load(result);
      const title = $('span[itemprop=name]').text();

      if (config.debug)
      {
        log.dumpToDebug('serie page', $.html());
      }

      if (!title) {
        if (config.debug)
        {
          log.dumpToDebug('missing title', task.address);
        }
        return done(new Error('Invalid page.(' + task.address + ')'));
      }

      log.info('Checking availability for ' + title);
      const episodes: ISeriesEpisode[] = [];

      $('.episode').each((i, el) => {
        if ($(el).children('img[src*=coming_soon]').length) {
          return;
        }

        const season_name = $(el).closest('ul').prev('a').text();
        const volume = /([0-9]+)\s*$/.exec($(el).closest('ul').prev('a').text());
        const regexp = /Episode\s+((PV )?[S0-9][\-P0-9.]*[a-fA-F]?)\s*$/i;
        const episode = regexp.exec($(el).children('.series-title').text());
        const url = $(el).attr('href');

        if (config.ignoredub && (season_name.endsWith('Dub)') || season_name.endsWith('dub)')))
        {
          return;
        }

        if ((!url) || (!episode))
        {
          return;
        }
        episodeCount += 1;
        episodes.push({
          address: url,
          episode: episode[1],
          seasonName: season_name,
          volume: volume ? parseInt(volume[0], 10) : 1,
          retry: config.retry,
        });
      });

      if (episodeCount === 0)
      {
        log.warn('No episodes found for ' + title + '. Could it be a movie?');
      }
      done(null, {episodes: episodes.reverse(), series: title});
    });
  }
}
