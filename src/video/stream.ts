'use strict';
import childProcess = require('child_process');
import os = require('os');
import path = require('path');

import log  = require('../log');

/**
 * Streams the video to disk.
 */
export default function(rtmpUrl: string, rtmpInputPath: string, swfUrl: string, filePath: string,
                        fileExt: string, mode: string, verbose: boolean, done: (err: Error) => void)
{
  let cp;
  let cmd;
  if (mode === 'RTMP')
  {
       cmd = command('rtmpdump') + ' ' +
          '-r "' + rtmpUrl + '" ' +
          '-y "' + rtmpInputPath + '" ' +
          '-W "' + swfUrl + '" ' +
          '-o "' + filePath + fileExt + '"';
  }
  else if (mode === 'HLS')
  {
      cmd = command('ffmpeg') + ' ' +
          '-i "' + rtmpInputPath + '" ' +
          '-c copy -bsf:a aac_adtstoasc ' +
          '"' + filePath + '.mp4"';
  }
  else
  {
    log.error('No such mode: ' + mode);
  }

  cp = childProcess.exec(cmd,
  {
      maxBuffer: Infinity,
  }, done);

  if (verbose === true)
  {
    cp.stdin.pipe(process.stdin);
    cp.stdout.pipe(process.stdout);
    cp.stderr.pipe(process.stderr);
  }
}

/**
 * Determines the command for the operating system.
 */
function command(exe: string): string
{
  if (os.platform() !== 'win32')
  {
    return exe;
  }

  return '"' + path.join(__dirname, '../../bin/' + exe + '.exe') + '"';
}
