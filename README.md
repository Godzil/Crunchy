# Crunchy: a fork of Deathspike/CrunchyRoll.js

[![Travis CI](https://travis-ci.org/Godzil/Crunchy.svg?branch=master)](https://travis-ci.org/Godzil/Crunchy)
[![Maintainability](https://api.codeclimate.com/v1/badges/413c7ca11c0805b1ef3e/maintainability)](https://codeclimate.com/github/Godzil/Crunchy/maintainability)
![npm](https://img.shields.io/npm/dy/crunchy.svg)
![Issue Count](https://img.shields.io/github/issues/Godzil/Crunchy.svg)

*Crunchy* is capable of downloading *anime* episodes from the popular *CrunchyRoll* streaming service. An episode is stored in the original video format (often H.264 in a MP4 container) and the configured subtitle format (ASS or SRT).The two output files are then merged into a single MKV file.

## Motivation

*CrunchyRoll* has been providing an amazing streaming service and offers the best way to enjoy *anime* in a *convenient* and *legal* way. As a streaming service, video files cannot be downloaded and watched offline. Understandable from a business perspective and considering possible contract implications, but annoying for users. This application enables episodes to be downloaded for offline convenience. Please do not abuse this application; download episodes for **personal use** and **delete them** if you do not have an active premium account. Continue to support *CrunchyRoll*; without our financial backing their service cannot exist!

## Legal Warning

This application is not endorsed or affliated with *CrunchyRoll*. The usage of this application enables episodes to be downloaded for offline convenience which may be forbidden by law in your country. Usage of this application may also cause a violation of the agreed *Terms of Service* between you and the stream provider. A tool is not responsible for your actions; please make an informed decision prior to using this application.

**_ONLY_ USE THIS TOOL IF YOU HAVE A _PREMIUM ACCOUNT_**

## Configuration

You need to authentication (`-p` and `-u`) to use Crunchy so you need to have an account on *CrunchyRool*. It is not possible to download non-free material without an account and premium subscription.


## Prerequisites

* NodeJS >= 8.1 (http://nodejs.org/)
* NPM >= 5.8 (https://www.npmjs.org/)

## Installation

Use the applicable instructions to install. Is your operating system not listed? Please ask or contribute!

### Linux (Debian, Mint, Ubuntu, etc)

1. Run in *Terminal*: `sudo apt-get install nodejs npm mkvtoolnix rtmpdump ffmpeg`
2. Run in *Terminal*: `sudo ln -s /usr/bin/nodejs /usr/bin/node`
3. Run in *Terminal*: `sudo npm install -g crunchy`

#### Updating:
1. Run in *Terminal*: `sudo npm update -g crunchy`

### Mac OS X

1. Install *Homebrew* following the instructions at http://brew.sh/
2. Run in *Terminal*: `brew install node mkvtoolnix rtmpdump ffmpeg`
3. Run in *Terminal*: `npm install -g crunchy`

#### Updating:
1. Run in *Terminal*: `sudo npm update -g crunchy`

### Windows

1. Install *NodeJS* following the instructions at http://nodejs.org/
3. Run in *Command Prompt*: `npm install -g crunchy`

#### Updating:
1. Run in *Command Prompt*: `npm update -g crunchy`

## Instructions

Use the applicable instructions for the interface of your choice (currently limited to command-line).

### Command-line Interface (`crunchy`)

The [command-line interface](http://en.wikipedia.org/wiki/Command-line_interface) does not have a graphical component and is ideal for automation purposes and headless machines. The interface can run using a sequence of series addresses (the site address containing the episode listing), or with a batch-mode source file. The `crunchy --help` command will produce the following output:

    Usage: crunchy [options]

    Options:

        -V, --version         output the version number
        -p, --pass <s>        The password.
        -u, --user <s>        The e-mail address or username.
        -d, --unlog           Unlog
        -c, --cache           Disables the cache.
        -m, --merge           Disables merging subtitles and videos.
        -e, --episodes <s>    Episode list. Read documentation on how to use
        -f, --format <s>      The subtitle format. (default: ass)
        -o, --output <s>      The output path.
        -s, --series <s>      The series name override.
        --ignoredub           Experimental: Ignore all seasons where the title end with 'Dub)'
        -n, --nametmpl <s>    Output name template (default: {SERIES_TITLE} - s{SEASON_NUMBER}e{EPISODE_NUMBER} - [{TAG}])
        -t, --tag <s>         The subgroup. (default: CrunchyRoll)
        -r, --resolution <s>  The video resolution. (valid: 360, 480, 720, 1080) (default: 1080)
        -b, --batch <s>       Batch file (default: CrunchyRoll.txt)
        --verbose             Make tool verbose
        --rebuildcrp          Rebuild the crpersistant file.
        --retry <i>           Number or time to retry fetching an episode. (default: 5)
        -h, --help            output usage information

#### Batch-mode

When no sequence of series addresses is provided, the batch-mode source file will be read (which is *CrunchyRoll.txt* in the current work directory. Each line in this file is processed contain the URL of a series and can support some of the command line parameter (like `-e`). This makes it ideal to manage a large sequence of series addresses.

#### Configuration file

Starting from version 1.4.0, Crunchy store some information in a config.json file. The file which is use have to be in the folder you are calling Crunchy. This is partly by design and a limitation on where Crunchy can find files.

This file store some informations like your username and password.

You don't need to create that file as Crunchy will create it for you, the first time you run it. Each run will update the content of the file, so it you run crunchy with your credential on the command line, it will add them to config file.

There are some parameter that the config file can accept which are not created by default, and some of them are cannont be set form the command line parameter.

Don't mess with them if you don't know what you are doing.

Here are the list of valid parameter in the config file:

 - Output options
  * `merge` see `--merge`
  * `format` see `--format`
  * `output` see `--output`
  * `nametmpl` see `--nametmpl`
  * `tag` see `--tag`
  * `resolution` see `--resolution`

 - Login related options:
  * `pass` see `--user`
  * `user` see `--pass`
  * `userAgent` set the user agent reported by Crunchy while crawling pages
  * `logUsingApi`
  * `logUsingCookie`
  * `crSessionUrl`
  * `crDeviceType`
  * `crAPIVersion`
  * `crLocale`
  * `crSessionKey`
  * `crLoginUrl`
  * `crUserId`
  * `crUserKey`

 - Generated values: don't touch them:
  * `crDeviceId`
  * `crSessionId`

Some of theses login related options are not going to be documented on what to put there for _legal_ reason.

Crunchy will also create a `.cookie.jar` file in the output folder (by default the current folder) it is the file used by Crunchy to store the web cookies.

#### Examples

Download in batch-mode:

 You will need to create the batch file (default name is `CrunchyRoll.txt`):

    http://www.cr.com/tail-fairy
    http://www.cr.com/gin-mama
    http://www.cr.com/two-parts
    // Just download episodes 3 to 42
    http://www.cr.com/defense-of-dwarfs -e 3-42

 Then launch crunchy:

    crunchy -u login -p password http://www.cr.com/tail-fairy

Download *Tail Fairy* to the current work directory:

    crunchy -u login -p password http://www.cr.com/tail-fairy

Download *Tail Fairy* to `C:\Anime`:

    crunchy -u login -p password --output C:\Anime http://www.cr.com/tail-fairy

Download episode 42 of *Tail Fairy* to `C:\Anime`:

    crunchy -u login -p password --output C:\Anime @http://www.cr.com/tail-fairy/episode-42-the-episode-which-dont-exist-665544

  *Notice the '@' in front of the URL, it is there to tell Crunchy that the URL is an episode URL and not a series URL.*

 or 

    crunchy -u login -p password --output C:\Anime http://www.cr.com/tail-fairy -e 42

Download episode 10 to 42 (both included) of *Tail Fairy*:

    crunchy -u login -p password http://www.cr.com/tail-fairy -e 10-42

Download episode up to 42 (included) of *Tail Fairy*:

    crunchy -u login -p password http://www.cr.com/tail-fairy -e -42

Download episodes starting from 42 to the last available of *Tail Fairy*:

    crunchy -u login -p password http://www.cr.com/tail-fairy -e 42-



#### Command line parameters

##### Authentication

* `-p or --pass <s>` sets the password.
* `-u or --user <s>` sets the e-mail address or username.
* `-d or --unlog` unlog

_New in 1.4.0_: Crunchy remember between run about login information and other, so you need to passe the login and password only once
I recommend to unlog if you see some problems during the run.

*When you unlog, the cookie file is deleted as for some parameter in the config file (like username and password).*

##### Disables

* `-c or --cache` disables the cache in batch mode.
* `-m or --merge` disables merging subtitles and videos.

##### Settings

* `-e or --episodes <s>` set an episode
* `-f or --format <s>` sets the subtitle format. (Default: ass)
* `-o or --output <s>` sets the output path.
* `-s or --series <s>` sets the series override.
* `-t or --tag <s>` sets The subgroup. (Default: CrunchyRoll)
* `-r or --resolution <s>` sets the resolutoin you want to download (360, 480, 720, 1080)
* `--retry <i>` set the number of try Crunchy will use if downloading a serie or episode fail
* `--ignoredub` It is an experimental features that will ignore all season where the name ends with 'dub)'. The idea is to try to ignore dubbed season.

##### Others

* `-b or --batch <s>` specify the batch file to use. Default to "CrunchyRoll.txt"
* `--verbose` make Crunchy really verbose. You should use it only for bug reporting or to try to see why it does not work
* `-g or --rebuildcrp` use that parameter only if the .crpersistent file has been corrupted and Crunchy try to redownload everything. It will try to rebuild the cache file from the file if find. If you renamed of move any file they will be ignored and not added to the cache file.


## When things goes wrong

First, make sure you have the latest version of Crunchy installed, if you run an older version, the issue you face may have been solved.

Second thing to check, you have to give your credentials (-u and -p parameters) each time you run Crunchy. It does not actually store the token it receive when login and need to relog each time it is called. This may change in the future.

Third, is it a recently released episode? If yes, sometimes CR have issues were the requested format is not available, and Crunchy is not able to get it. When in doubt, try to watch CR website, if it does not work there, Crunchy will not either. This is valid in all cases even on non recently released.

Fourth, sometimes, CR website does weird things, and there are some transient errors, wait a couple of minutes (or hours) and try again. It has really often solved lots of weird issue on my side (yes I know that's not really a way of fixing, but if the error is on CR side, Crunchy can't do anything)

If really nothing works or you find a problem with Crunchy, then you can go and fill an Issue, first read the already open and closed one to make sure you are not reporting an existing problem. If your problem has been already reported, what you can do is to either:
- Add a comment saying you also have the same issue
- Add a Thumbs Up reaction to the original entry in the issue, I use them as a metric to know how many people are annoyed by that issue
If you find one which correspond and it is close, don't hesitate to add a comment, the issue may have not be fully solved.

If there is no comparable opened or close issue, you are welcome to create a new one.

## Developers

More information will be added at a later point. For now the recommendations are:

* Atom with `atom-typescript` and `linter-tslint` (and dependencies).

Since this project uses TypeScript, compile with `node run compile` to build the tool and `npm run test` to run the linter.

