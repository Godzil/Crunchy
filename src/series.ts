'use strict';
import cheerio = require('cheerio');
import episode from './episode';
import fs = require('fs');
const fse = require('fs-extra');
import request = require('./request');
import path = require('path');
import url = require('url');
import log  = require('./log');
const persistent = '.crpersistent';

/**
 * Streams the series to disk.
 */
export default function(config: IConfig, address: string, done: (err: Error) => void)
{
  const persistentPath = path.join(config.output || process.cwd(), persistent);

  /* Make a backup of the persistent file in case of */
  fse.copySync(persistentPath, persistentPath + '.backup');

  fs.readFile(persistentPath, 'utf8', (err: Error, contents: string) =>
  {
    const cache = config.cache ? {} : JSON.parse(contents || '{}');

    page(config, address, (errP, page) =>
    {
      if (errP)
      {
        return done(errP);
      }

      let i = 0;
      (function next()
      {
        if (i >= page.episodes.length) return done(null);
        download(cache, config, address, page.episodes[i], (errD, ignored) =>
        {
          if (errD)
          {
            return done(errD);
          }

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
        });
      })();
    });
  });
}

/**
 * Downloads the episode.
 */
function download(cache: {[address: string]: number}, config: IConfig,
                  baseAddress: string, item: ISeriesEpisode,
                  done: (err: Error, ign: boolean) => void)
{
  if (!filter(config, item))
  {
    return done(null, false);
  }

  const address = url.resolve(baseAddress, item.address);

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
 * Filters the item based on the configuration.
 */
function filter(config: IConfig, item: ISeriesEpisode)
{
  // Filter on chapter.
  const episodeFilter = config.episode;
  // Filter on volume.
  const volumeFilter = config.volume;

  const currentEpisode = parseInt(item.episode, 10);
  const currentVolume = item.volume;

  if ( ( (episodeFilter > 0) && (currentEpisode <=  episodeFilter) ) ||
       ( (episodeFilter < 0) && (currentEpisode >= -episodeFilter) ) ||
       ( (volumeFilter  > 0) && (currentVolume  <=  volumeFilter ) ) ||
       ( (volumeFilter  < 0) && (currentVolume  >= -volumeFilter ) ) )
  {
    return false;
  }

  return true;
}

/**
 * Requests the page and scrapes the episodes and series.
 */
function page(config: IConfig, address: string, done: (err: Error, result?: ISeries) => void)
{
  if (address[0] === '@')
  {
    log.info('Trying to fetch from ' + address.substr(1));
    const episodes: ISeriesEpisode[] = [];
    episodes.push({
      address: address.substr(1),
      episode: '',
      volume: 0,
    });
    done(null, {episodes: episodes.reverse(), series: ""});
  }
  else
  {
    let episodeCount = 0;
    request.get(config, address, (err, result) => {
      if (err) {
        return done(err);
      }

      const $ = cheerio.load(result);
      const title = $('span[itemprop=name]').text();

      if (!title) {
        return done(new Error('Invalid page.(' + address + ')'));
      }

      log.info('Checking availability for ' + title);
      const episodes: ISeriesEpisode[] = [];

      $('.episode').each((i, el) => {
        if ($(el).children('img[src*=coming_soon]').length) {
          return;
        }

        const volume = /([0-9]+)\s*$/.exec($(el).closest('ul').prev('a').text());
        const regexp = /Episode\s+((PV )?[S0-9][\-P0-9.]*[a-fA-F]?)\s*$/i;
        const episode = regexp.exec($(el).children('.series-title').text());
        const url = $(el).attr('href');

        if ((!url) || (!episode)) {
          return;
        }
        episodeCount += 1;
        episodes.push({
          address: url,
          episode: episode[1],
          volume: volume ? parseInt(volume[0], 10) : 1,
        });
      });
      if (episodeCount === 0)
      {
        log.warn("No episodes found for " + title + ". Could it be a movie?");
      }
      done(null, {episodes: episodes.reverse(), series: title});
    });
  }
}
