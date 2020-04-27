'use strict';
import cheerio = require('cheerio');
import fs = require('fs');
import mkdirp = require('mkdirp');
import my_request = require('./my_request');
import path = require('path');
import subtitle from './subtitle/index';
import vlos from './vlos';
import video from './video/index';
import xml2js = require('xml2js');
import log  = require('./log');

/**
 * Streams the episode to disk.
 */
export default function(config: IConfig, address: string, done: (err: Error, ign: boolean) => void)
{
  scrapePage(config, address, (err, page) =>
  {
    if (err)
    {
      return done(err, false);
    }

    if (page.media != null)
    {
      /* No player to scrape */
      download(config, page, null, done);
    }
    else
    {
      /* The old way */
      scrapePlayer(config, address, page.id, (errS, player) =>
      {
        if (errS)
        {
          return done(errS, false);
        }

        download(config, page, player, done);
      });
    }
  });
}

/**
 * Completes a download and writes the message with an elapsed time.
 */
function complete(epName: string, message: string, begin: number, done: (err: Error, ign: boolean) => void)
{
  const timeInMs = Date.now() - begin;
  const seconds = prefix(Math.floor(timeInMs / 1000) % 60, 2);
  const minutes = prefix(Math.floor(timeInMs / 1000 / 60) % 60, 2);
  const hours = prefix(Math.floor(timeInMs / 1000 / 60 / 60), 2);

  log.dispEpisode(epName, message + ' (' + hours + ':' + minutes + ':' + seconds + ')', true);

  done(null, false);
}

/**
 * Check if a file exist..
 */
function fileExist(path: string)
{
  try
  {
    fs.statSync(path);
    return true;
  }
  catch (e)
  {
    return false;
  }
}

function sanitiseFileName(str: string)
{
  const sanitized = str.replace(/[\/':\?\*"<>\\\.\|]/g, '_');

  return sanitized.replace(/{DIR_SEPARATOR}/g, '/');
}

/**
 * Downloads the subtitle and video.
 */
function download(config: IConfig, page: IEpisodePage, player: IEpisodePlayer, done: (err: Error | string, ign: boolean) => void)
{
  const serieFolder = sanitiseFileName(config.series || page.series);

  let fileName = sanitiseFileName(generateName(config, page));
  let filePath = path.join(config.output || process.cwd(), serieFolder, fileName);

  if (fileExist(filePath + '.mkv'))
  {
    let count = 0;

    if (config.rebuildcrp)
    {
      log.warn('Adding \'' + fileName + '\' to the DB...');
      return done(null, false);
    }

    log.warn('File \'' + fileName + '\' already exist...');

    do
    {
      count = count + 1;
      fileName = sanitiseFileName(generateName(config, page, '-' + count));
      filePath = path.join(config.output || process.cwd(), serieFolder, fileName);
    } while (fileExist(filePath + '.mkv'));

    log.warn('Renaming to \'' + fileName + '\'...');

    page.filename = fileName;
  }

  if (config.rebuildcrp)
  {
    log.warn('Ignoring \'' + fileName + '\' as it does not exist...');
    return done(null, true);
  }

  const ret = mkdirp(path.dirname(filePath));
  if (ret)
  {
    log.dispEpisode(fileName, 'Fetching...', false);
    downloadSubtitle(config, page, player, filePath, (errDS) =>
    {
      if (errDS)
      {
        log.dispEpisode(fileName, 'Error...', true);
        return done(errDS, false);
      }

      const now = Date.now();
      if ( ((page.media === null) && (player.video.file !== undefined))
        || ((page.media !== null) /* Do they still create page in advance for unreleased episodes? */) )
      {
        log.dispEpisode(fileName, 'Fetching video...', false);
        downloadVideo(config, page, player, filePath, (errDV) =>
        {
          if (errDV)
          {
            log.dispEpisode(fileName, 'Error...', true);
            return done(errDV, false);
          }

          if (config.merge)
          {
            return complete(fileName, 'Finished!', now, done);
          }

          let isSubtitled = true;

          if (page.media === null)
          {
            isSubtitled = Boolean(player.subtitle);
          }
          else
          {
            if (page.media.subtitles.length === 0)
            {
              isSubtitled = false;
            }
          }

          let videoExt = '.mp4';
          if ( (page.media === null) && (player.video.mode === 'RTMP'))
          {
            videoExt = path.extname(player.video.file);
          }

          log.dispEpisode(fileName, 'Merging...', false);
          video.merge(config, isSubtitled, videoExt, filePath, config.verbose, (errVM) =>
          {
            if (errVM)
            {
              log.dispEpisode(fileName, 'Error...', true);
              return done(errVM, false);
            }

            complete(fileName, 'Finished!', now, done);
          });
        });
      }
      else
      {
        log.dispEpisode(fileName, 'Ignoring: not released yet', true);
        done(null, true);
      }
    });
  }
  else
  {
    log.dispEpisode(fileName, 'Error creating folder \'' + filePath + '\'...', true);
    return done('Cannot create folder', false);
  }
}

/**
 * Saves the subtitles to disk.
 */
function downloadSubtitle(config: IConfig, page: IEpisodePage, player: IEpisodePlayer,
                          filePath: string, done: (err?: Error | string) => void)
{
  if (page.media !== null)
  {
    const subs = page.media.subtitles;
    if (subs.length === 0)
    {
      /* No downloadable subtitles */
      console.warn('Can\'t find subtitle ?!');
      return done();
    }

    let i;
    let j;

    /* Find a proper subtitles */
    for (j = 0; j < config.sublang.length; j++)
    {
      const reqSubLang = config.sublang[j];
      for (i = 0; i < subs.length; i++)
      {
        const curSub = subs[i];
        if (curSub.format === 'ass' && curSub.language === reqSubLang)
        {
          my_request.get(config, curSub.url, (err, result) =>
          {
            if (err)
            {
              log.error('An error occured while fetching subtitles...');
              return done(err);
            }

            fs.writeFile(filePath + '.ass', '\ufeff' + result, done);
          });

          /* Break from the first loop */
          j = config.sublang.length;
          break;
        }
      }
    }
    if (i >= subs.length)
    {
      done('Cannot find subtitles with requested language(s)');
    }
  }
  else
  {
    const enc = player.subtitle;

    if (!enc)
    {
      return done();
    }

    subtitle.decode(enc.id, enc.iv, enc.data, (errSD, data) =>
    {
      if (errSD)
      {
        log.error('An error occured while getting subtitles...');
        return done(errSD);
      }

      if (config.debug)
      {
        log.dumpToDebug('SubtitlesXML', data);
      }

      const formats = subtitle.formats;
      const format = formats[config.format] ? config.format : 'ass';

      formats[format](config, data, (errF: Error, decodedSubtitle: string) =>
      {
        if (errF)
        {
          return done(errF);
        }

        fs.writeFile(filePath + '.' + format, '\ufeff' + decodedSubtitle, done);
      });
    });
  }
}

/**
 * Streams the video to disk.
 */
function downloadVideo(config: IConfig,  page: IEpisodePage, player: IEpisodePlayer,
                       filePath: string, done: (err: any) => void)
{
  if (player == null)
  {
    /* new way */

    const streams = page.media.streams;
    let i;
    /* Find a proper subtitles */
    for (i = 0; i < streams.length; i++)
    {
      if (streams[i].format === 'vo_adaptive_hls' && streams[i].audio_lang === 'jaJP' &&
          streams[i].hardsub_lang === null)
      {
        video.stream('', streams[i].url, '', filePath,
          'mp4', 'HLS', config.verbose, done);
        break;
      }
    }
    if (i >= streams.length)
    {
      done('Cannot find a valid stream');
    }
  }
  else
  {
    /* Old way */
    video.stream(player.video.host, player.video.file, page.swf, filePath,
                 path.extname(player.video.file), player.video.mode, config.verbose, done);
  }
}

/**
 * Names the file based on the config, page, series and tag.
 */
function generateName(config: IConfig, page: IEpisodePage, extra = '')
{
  const episodeNum = parseInt(page.episode, 10);
  const volumeNum = parseInt(page.volume, 10);
  const episode = (episodeNum < 10 ? '0' : '') + page.episode;
  const volume = (volumeNum < 10 ? '0' : '') + page.volume;
  const tag = config.tag || 'CrunchyRoll';
  const series = config.series || page.series;

  return config.nametmpl
      .replace(/{EPISODE_ID}/g, page.id.toString())
      .replace(/{EPISODE_NUMBER}/g, episode)
      .replace(/{SEASON_NUMBER}/g, volume)
      .replace(/{VOLUME_NUMBER}/g, volume)
      .replace(/{SEASON_TITLE}/g, page.season)
      .replace(/{VOLUME_TITLE}/g, page.season)
      .replace(/{SERIES_TITLE}/g, series)
      .replace(/{EPISODE_TITLE}/g, page.title)
      .replace(/{TAG}/g, tag) + extra;
}

/**
 * Prefixes a value.
 */
function prefix(value: number|string, length: number)
{
  let valueString = (typeof value !== 'string') ? String(value) : value;

  while (valueString.length < length)
  {
    valueString = '0' + valueString;
  }

  return valueString;
}

/**
 * Requests the page data and scrapes the id, episode, series and swf.
 */
function scrapePage(config: IConfig, address: string, done: (err: Error, page?: IEpisodePage) => void)
{
  const epId = parseInt((address.match(/[0-9]+$/) || ['0'])[0], 10);

  if (!epId)
  {
    return done(new Error('Invalid address.'));
  }

  my_request.get(config, address, (err, result) =>
  {
    if (err)
    {
      return done(err);
    }

    const $ = cheerio.load(result);
    /* First check if we have the new player */
    const vlosScript = $('#vilos-iframe-container');

    if (vlosScript)
    {
      const pageMetadata = JSON.parse($('script[type="application/ld+json"]')[0].children[0].data);
      const divScript = $('div[id="showmedia_video_box_wide"]');
      const scripts = divScript.find('script').toArray();
      const script = scripts[2].children[0].data;
      let seasonNumber = '1';
      let seasonTitle = '';

      if (pageMetadata.partOfSeason)
      {
        seasonNumber = pageMetadata.partOfSeason.seasonNumber;
        if (seasonNumber === '0') { seasonNumber = '1'; }

        seasonTitle = pageMetadata.partOfSeason.name;
      }
      done(null, vlos.getMedia(script, seasonTitle, seasonNumber));
    }
    else
    {
      /* Use the old way */
      const swf = /^([^?]+)/.exec($('link[rel=video_src]').attr('href'));
      const regexp = /\s*([^\n\r\t\f]+)\n?\s*[^0-9]*([0-9][\-0-9.]*)?,?\n?\s\s*[^0-9]*((PV )?[S0-9][P0-9.]*[a-fA-F]?)/;
      const seasonTitle = $('span[itemprop="title"]').text();
      const look = $('#showmedia_about_media').text();
      const episodeTitle = $('#showmedia_about_name').text().replace(/[“”]/g, '');
      const data = regexp.exec(look);

      if (config.debug) {
        log.dumpToDebug('episode page', $.html());
      }

      if (!swf || !data) {
        log.warn('Somethig unexpected in the page at ' + address + ' (data are: ' + look + ')');
        log.warn('Setting Season to ’0’ and episode to ’0’...');

        if (config.debug) {
          log.dumpToDebug('episode unexpected', look);
        }

        done(null, {
          episode: '0',
          id: epId,
          series: seasonTitle,
          season: seasonTitle,
          title: episodeTitle,
          swf: swf[1],
          volume: '0',
          filename: '',
          media: null,
        });
      } else {
        done(null, {
          episode: data[3],
          id: epId,
          series: data[1],
          season: seasonTitle,
          title: episodeTitle,
          swf: swf[1],
          volume: data[2] || '1',
          filename: '',
          media: null,
        });
      }
    }
  });
}

/**
 * Requests the player data and scrapes the subtitle and video data.
 */
function scrapePlayer(config: IConfig, address: string, id: number, done: (err: Error, player?: IEpisodePlayer) => void)
{
  const url = address.match(/^(https?:\/\/[^\/]+)/);

  if (!url)
  {
    return done(new Error('Invalid address.'));
  }

  const postForm = {
    current_page: address,
    video_format: config.video_format,
    video_quality: config.video_quality,
    media_id: id
  };

  my_request.post(config, url[1] + '/xml/?req=RpcApiVideoPlayer_GetStandardConfig&media_id=' + id, postForm,
    (err, result) =>
  {
    if (err)
    {
      return done(err);
    }

    xml2js.parseString(result, {
      explicitArray: false,
      explicitRoot: false,
    }, (errPS: Error, player: IEpisodePlayerConfig) =>
    {
      if (errPS)
      {
        return done(errPS);
      }

      try
      {
        const isSubtitled = Boolean(player['default:preload'].subtitle);
        let streamMode = 'RTMP';

        if (player['default:preload'].stream_info.host === '')
        {
          streamMode = 'HLS';
        }

        done(null, {
          subtitle: isSubtitled ? {
            data: player['default:preload'].subtitle.data,
            id: parseInt(player['default:preload'].subtitle.$.id, 10),
            iv: player['default:preload'].subtitle.iv,
          } : null,
          video: {
            file: player['default:preload'].stream_info.file,
            host: player['default:preload'].stream_info.host,
            mode: streamMode,
          },
        });
      } catch (parseError)
      {
        if (config.debug)
        {
          log.dumpToDebug('player scrape', parseError);
        }

        done(parseError);
      }
    });
  });
}
