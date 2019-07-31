'use strict';
import cheerio = require('cheerio');
import request = require('request');
import rp = require('request-promise');
import Promise = require('bluebird');
import uuid = require('uuid');
import path = require('path');
import fs = require('fs-extra');
import languages = require('./languages');
import log = require('./log');

import { RequestPromise } from 'request-promise';
import { Response } from 'request';

// tslint:disable-next-line:no-var-requires
const cookieStore = require('tough-cookie-file-store');

const CR_COOKIE_DOMAIN = 'http://crunchyroll.com';

let isAuthenticated = false;
let isPremium = false;

let j: request.CookieJar;

const defaultHeaders =
{
  'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.99 Safari/537.36',
  'Connection': 'keep-alive',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
  'Referer': 'https://www.crunchyroll.com/login',
  'Cache-Control': 'private',
  'Accept-Language': 'en-US,en;q=0.9'
};

const defaultOptions =
{
  followAllRedirects: true,
  decodeEmails: true,
  challengesToSolve: 3,
  gzip: true,
};

// tslint:disable-next-line:no-var-requires
const cloudscraper = require('cloudscraper').defaults(defaultOptions);

function AuthError(msg: string): IAuthError
{
  return { name: 'AuthError', message: msg, authError: true };
}

function startSession(config: IConfig): Promise<any>
{
  return rp(
  {
    method: 'GET',
    url: config.crSessionUrl,
    qs:
    {
      device_id: config.crDeviceId,
      device_type: config.crDeviceType,
      access_token: config.crSessionKey,
      version: config.crAPIVersion,
      locale: config.crLocale,
    },
    json: true,
  })
  .then((response: any) =>
  {
    if ((response.data === undefined) || (response.data.session_id === undefined))
    {
      throw new Error('Getting session failed: ' + JSON.stringify(response));
    }

    return response.data.session_id;
  });
}

function APIlogin(config: IConfig, sessionId: string, user: string, pass: string): Promise<any>
{
  return rp(
  {
    method: 'POST',
    url:  config.crLoginUrl,
    form:
    {
      account: user,
      password: pass,
      session_id: sessionId,
      version: config.crAPIVersion,
    },
    json: true,
    jar: j,
  })
  .then((response) =>
  {
    if (response.error) throw new Error('Login failed: ' + response.message);
    return response.data;
  });
}

function checkIfUserIsAuth(config: IConfig, done: (err: Error) => void): void
{
  if (j === undefined)
  {
    loadCookies(config);
  }

  /**
   * The main page give us some information about the user
   */
  const url = 'http://www.crunchyroll.com/';

  cloudscraper.get({gzip: true, uri: url}, (err: Error, rep: string, body: string) =>
  {
    if (err)
    {
      return done(err);
    }

    const $ = cheerio.load(body);

    /* As we are here, try to detect which locale CR tell us */
    const localeRE = /LOCALE = "([a-zA-Z]+)",/g;
    const locale = localeRE.exec($('script').text())[1];
    const countryCode = languages.localeToCC(locale);

    if (config.crlang === undefined)
    {
      log.info('No locale set. Setting to the one reported by CR: "' + countryCode + '"');
      config.crlang = countryCode;
    }
    else if (config.crlang !== countryCode)
    {
      log.warn('Crunchy is configured for locale "' + config.crlang + '" but CR report "' + countryCode + '" (LOCALE = ' + locale + ')');
      log.warn('Check if it is correct or rerun (once) with "-l ' + countryCode + '" to correct.');
    }

    /* Check if auth worked */
    const regexps = /ga\('set', 'dimension[5-8]', '([^']*)'\);/g;
    const dims = regexps.exec($('script').text());

    for (let i = 1; i < 5; i++)
    {
      if ((dims[i] !== undefined) && (dims[i] !== '') && (dims[i] !== 'not-registered'))
      {
        isAuthenticated = true;
      }

      if ((dims[i] === 'premium') || (dims[i] === 'premiumplus'))
      {
        isPremium = true;
      }
    }

    if (isAuthenticated === false)
    {
        const error = $('ul.message, li.error').text();
        log.warn('Authentication failed: ' + error);

        log.dumpToDebug('not auth rep', rep);
        log.dumpToDebug('not auth body', body);

        return done(AuthError('Authentication failed: ' + error));
    }
    else
    {
      if (isPremium === false)
      {
        log.warn('Do not use this app without a premium account.');
      }
      else
      {
        log.info('You have a premium account! Good!');
      }
    }

    done(null);
  });
}

function loadCookies(config: IConfig)
{
  const cookiePath = path.join(config.output || process.cwd(), '.cookies.json');

  if (!fs.existsSync(cookiePath))
  {
    fs.closeSync(fs.openSync(cookiePath, 'w'));
  }

  j = request.jar(new cookieStore(cookiePath));
}

export function eatCookies(config: IConfig)
{
  const cookiePath = path.join(config.output || process.cwd(), '.cookies.json');

  if (fs.existsSync(cookiePath))
  {
      fs.removeSync(cookiePath);
  }

  j = undefined;
}

export function getUserAgent(): string
{
  return defaultHeaders['User-Agent'];
}

/**
 * Performs a GET request for the resource.
 */
export function get(config: IConfig, options: string|any, done: (err: any, result?: string) => void)
{
  if (j === undefined)
  {
    loadCookies(config);
  }

  if (config.userAgent)
  {
    defaultHeaders['User-Agent'] = config.userAgent;
  }

  authenticate(config, (err) =>
  {
    if (err)
    {
      return done(err);
    }

    cloudscraper.get(modify(options), (error: any, response: any, body: any) =>
    {
      if (error) return done(error);

      done(null, typeof body === 'string' ? body : String(body));
    });
  });
}

/**
 * Performs a POST request for the resource.
 */
export function post(config: IConfig, options: request.Options, done: (err: Error, result?: string) => void)
{
  if (j === undefined)
  {
    loadCookies(config);
  }

  if (config.userAgent)
  {
    defaultHeaders['User-Agent'] = config.userAgent;
  }

  authenticate(config, (err) =>
  {
    if (err)
    {
      return done(err);
    }

    cloudscraper.post(modify(options), (error: Error, response: any, body: any) =>
    {
      if (error)
      {
        return done(error);
      }
      done(null, typeof body === 'string' ? body : String(body));
    });
  });
}

/**
 * Authenticates using the configured pass and user.
 */
function authenticate(config: IConfig, done: (err: Error) => void)
{
  if (isAuthenticated)
  {
    return done(null);
  }

  /* First of all, check if the user is not already logged via the cookies */
  checkIfUserIsAuth(config, (errCheckAuth) =>
  {
    if (isAuthenticated)
    {
      return done(null);
    }

    /* So if we are here now, that mean we are not authenticated so do as usual */
    if ((!config.logUsingApi && !config.logUsingCookie) && (!config.pass || !config.user))
    {
      log.error('You need to give login/password to use Crunchy');
      process.exit(-1);
    }

    log.info('Seems we are not currently logged. Let\'s login!');

    if (config.logUsingApi)
    {
      if (config.crDeviceId === undefined)
      {
        config.crDeviceId = uuid.v4();
      }

      if (!config.crSessionUrl || !config.crDeviceType || !config.crAPIVersion ||
          !config.crLocale || !config.crLoginUrl)
      {
        return done(AuthError('Invalid API configuration, please check your config file.'));
      }

      startSession(config)
      .then((sessionId: string) =>
      {
        // defaultHeaders['Cookie'] = `sess_id=${sessionId}; c_locale=enUS`;
        return APIlogin(config, sessionId, config.user, config.pass);
      })
      .then((userData) =>
      {
        checkIfUserIsAuth(config, (errCheckAuth2) =>
        {
          if (isAuthenticated)
          {
            return done(null);
          }
          else
          {
            return done(errCheckAuth2);
          }
        });
      })
      .catch((errInChk) =>
      {
        return done(AuthError(errInChk.message));
      });
    }
    else if (config.logUsingCookie)
    {
      j.setCookie(request.cookie('c_userid=' + config.crUserId + '; Domain=crunchyroll.com; HttpOnly; hostOnly=false;'),
                  CR_COOKIE_DOMAIN);
      j.setCookie(request.cookie('c_userkey=' + config.crUserKey + '; Domain=crunchyroll.com; HttpOnly; hostOnly=false;'),
                  CR_COOKIE_DOMAIN);

      checkIfUserIsAuth(config, (errCheckAuth2) =>
      {
        if (isAuthenticated)
        {
          return done(null);
        }
        else
        {
          return done(errCheckAuth2);
        }
      });
    }
    else
    {
      /* First get https://www.crunchyroll.com/login to get the login token */
      const options =
      {
        // jar: j,
        uri: 'https://www.crunchyroll.com/login'
      };

      cloudscraper.get(options, (err: Error, rep: string, body: string) =>
      {
        if (err) return done(err);

        const $ = cheerio.load(body);

        /* Get the token from the login page */
        const token = $('input[name="login_form[_token]"]').attr('value');
        if (token === '')
        {
            return done(AuthError('Can\'t find token!'));
        }

        /* Now call the page again with the token and credentials */
        const options =
        {
          form:
          {
            'login_form[name]': config.user,
            'login_form[password]': config.pass,
            'login_form[redirect_url]': '/',
            'login_form[_token]': token
          },
          // jar: j,
          url: 'https://www.crunchyroll.com/login'
        };

        cloudscraper.post(options, (err: Error, rep: string, body: string) =>
        {
          if (err)
          {
              return done(err);
          }

          /* Now let's check if we are authentificated */
          checkIfUserIsAuth(config, (errCheckAuth2) =>
          {
            if (isAuthenticated)
            {
              return done(null);
            }
            else
            {
              return done(errCheckAuth2);
            }
          });
        });
      });
    }
  });
}

/**
 * Modifies the options to use the authenticated cookie jar.
 */
function modify(options: string|any): any
{
  if (typeof options !== 'string')
  {
    options.jar = j;
    return options;
  }
  return {
    jar: j,
    url: options.toString(),
  };
}
