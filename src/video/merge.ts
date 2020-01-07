'use strict';
import childProcess = require('child_process');
import fs = require('fs');
import os = require('os');
import path = require('path');

import subtitle from '../subtitle/index';

/**
 * Merges the subtitle and video files into a Matroska Multimedia Container.
 */
export default function(config: IConfig, isSubtitled: boolean, rtmpInputPath: string, filePath: string,
                        streamMode: string, verbose: boolean, done: (err: Error) => void)
{
  const subtitleFormat = (subtitle.formats[config.format] ? config.format : 'ass');
  const subtitlePath = filePath + '.' + subtitleFormat;
  const videoPath = filePath + (streamMode === 'RTMP' ? path.extname(rtmpInputPath) : '.mp4');

  const cmd = `${command()} -y -i "${videoPath}" ${(isSubtitled ? `-i "${subtitlePath}"` : '')} ` +
              `-c copy -c:s ${subtitleFormat} -disposition:s:0 default "${filePath}.mkv"`;

  const cp = childProcess.exec(cmd, {
        maxBuffer: Infinity,
  }, (err) =>
  {
    if (err)
    {
        return done(err);
    }

    unlink(videoPath, subtitlePath, (errin) =>
    {
      if (errin)
      {
          unlinkTimeout(videoPath, subtitlePath, 5000);
      }

      done(null);
    });
  });

  if (verbose)
  {
    cp.stdout.pipe(process.stdout);
    cp.stderr.pipe(process.stderr);
  }
}

/**
 * Determines the command for the operating system.
 */
function command(): string
{
  if (os.platform() !== 'win32')
  {
      return 'ffmpeg';
  }

  return '"' + path.join(__dirname, '../../bin/ffmpeg.exe') + '"';
}

/**
 * Unlinks the video and subtitle.
 * @private
 */
function unlink(videoPath: string, subtitlePath: string, done: (err: Error) => void)
{
  fs.unlink(videoPath, (err) =>
  {
    if (err)
    {
        return done(err);
    }

    fs.unlink(subtitlePath, done);
  });
}

/**
 * Attempts to unlink the video and subtitle with a timeout between each try.
 */
function unlinkTimeout(videoPath: string, subtitlePath: string, timeout: number)
{
  setTimeout(() =>
  {
    unlink(videoPath, subtitlePath, (err) =>
    {
      if (err)
      {
          unlinkTimeout(videoPath, subtitlePath, timeout);
      }
    });
  }, timeout);
}