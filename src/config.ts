import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

const configPath = path.resolve(os.homedir(), '.crunchyrc');

let configCache: any;

export function getConfig(done: (err: Error, config?: any) => void): void
{
  const callback = (err?: Error, config?: any) => {
    if (!configCache)
    {
      configCache = config || {};
    }

    // return cloned config object so changes won't affect the cached config
    done(err, JSON.parse(JSON.stringify(configCache)));
  };

  if (configCache)
  {
    return callback();
  }

  fs.access(configPath, (err) =>
  {
    if (err)
    {
      return callback(err);
    }

    fs.readFile(configPath, (err, data) =>
    {
      if (err)
      {
        return callback(err);
      }

      try
      {
        callback(null, JSON.parse(data.toString('utf8')) || {});
      }
      catch (err)
      {
        configCache = {};
        callback(new Error('Failed to load config: ' + err));
      }
    });
  });
}

export function saveConfig(config: any, done: (err: any) => void): void
{
  fs.writeFile(configPath, JSON.stringify(config, null, 2), (err) =>
  {
    if (err)
    {
      return done(err);
    }

    configCache = JSON.parse(JSON.stringify(config));

    done(null);
  });
}
