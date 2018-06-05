# Crunchy: a fork of Deathspike/CrunchyRoll.js

[![Issue Stats](http://issuestats.com/github/Godzil/Crunchy/badge/issue)](http://issuestats.com/github/Godzil/Crunchy) [![Travis CI](https://travis-ci.org/Godzil/Crunchy.svg?branch=master)](https://travis-ci.org/Godzil/Crunchy) [![Maintainability](https://api.codeclimate.com/v1/badges/413c7ca11c0805b1ef3e/maintainability)](https://codeclimate.com/github/Godzil/Crunchy/maintainability) 

*Crunchy* is capable of downloading *anime* episodes from the popular *CrunchyRoll* streaming service. An episode is stored in the original video format (often H.264 in a MP4 container) and the configured subtitle format (ASS or SRT).The two output files are then merged into a single MKV file.

## Motivation

*CrunchyRoll* has been providing an amazing streaming service and offers the best way to enjoy *anime* in a *convenient* and *legal* way. As a streaming service, video files cannot be downloaded and watched offline. Understandable from a business perspective and considering possible contract implications, but annoying for users. This application enables episodes to be downloaded for offline convenience. Please do not abuse this application; download episodes for **personal use** and **delete them** if you do not have an active premium account. Continue to support *CrunchyRoll*; without our financial backing their service cannot exist!

## Legal Warning

This application is not endorsed or affliated with *CrunchyRoll*. The usage of this application enables episodes to be downloaded for offline convenience which may be forbidden by law in your country. Usage of this application may also cause a violation of the agreed *Terms of Service* between you and the stream provider. A tool is not responsible for your actions; please make an informed decision prior to using this application.

**PLEASE _ONLY_ USE THIS TOOL IF YOU HAVE A _PREMIUM ACCOUNT_**

## Configuration

It is recommended to enable authentication (`-p` and `-u`) so your account permissions and settings are available for use. It is not possible to download non-free material without an account and premium subscription. Furthermore, the default account settings are used when downloading. If you want the highest quality videos, configure these preferences at https://www.crunchyroll.com/acct/?action=video.


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
1. Run in *Terminal*: `npm update -g crunchy`

## Instructions

Use the applicable instructions for the interface of your choice (currently limited to command-line).

### Command-line Interface (`crunchy`)

The [command-line interface](http://en.wikipedia.org/wiki/Command-line_interface) does not have a graphical component and is ideal for automation purposes and headless machines. The interface can run using a sequence of series addresses (the site address containing the episode listing), or with a batch-mode source file. The `crunchy --help` command will produce the following output:

    Usage: crunchy [options]

    Options:

      -h, --help         output usage information
      -V, --version      output the version number
      -p, --pass <s>     The password.
      -u, --user <s>     The e-mail address or username.
      -c, --cache        Disables the cache.
      -m, --merge        Disables merging subtitles and videos.
      -e, --episode <i>  The episode filter.
      -v, --volume <i>   The volume filter.
      -f, --format <s>   The subtitle format. (Default: ass)
      -o, --output <s>   The output path.
      -s, --series <s>   The series override.
      -t, --tag <s>      The subgroup. (Default: CrunchyRoll)

#### Batch-mode

When no sequence of series addresses is provided, the batch-mode source file will be read (which is *CrunchyRoll.txt* in the current work directory. Each line in this file is processed as a seperate command-line statement. This makes it ideal to manage a large sequence of series addresses with variating command-line options or incremental episode updates.

#### Examples

Download in batch-mode:

    crunchy

Download *Fairy Tail* to the current work directory:

    crunchy http://www.crunchyroll.com/fairy-tail

Download *Fairy Tail* to `C:\Anime`:

    crunchy --output C:\Anime http://www.crunchyroll.com/fairy-tail

#### Switches

##### Authentication

* `-p or --pass <s>` sets the password.
* `-u or --user <s>` sets the e-mail address or username.

 _Please remember that login has to be done for each call of Crunchy, as none of the credentials are stored_

##### Disables

* `-c or --cache` disables the cache.
* `-m or --merge` disables merging subtitles and videos.

##### Filters

* `-e or --episode <i>` filters episodes (positive is greater than, negative is smaller than).
* `-v or --volume <i>` filters volumes (positive is greater than, negative is smaller than).

##### Settings

* `-f or --format <s>` sets the subtitle format. (Default: ass)
* `-o or --output <s>` sets the output path.
* `-s or --series <s>` sets the series override.
* `-t or --tag <s>` sets The subgroup. (Default: CrunchyRoll)

## When things goes wrong

First, make sure you have the latest version of Crunchy installed, if you run an older version, the issue you face may have been solved.

Second thing to check, you have to give your credentials (-u and -p parameters) each time you run Crunchy. It does not actually store the token it receive when login and need to relog each time it is called. This may change in the future.

Third, is it a recently released episode? If yes, sometimes CR have issues were the requested format is not available, and Crunchy is not able to get it. When in doubt, try to watch CR website, if it does not work there, Crunchy will not either. This is valid in all cases even on non recently released.

Fourth, sometimes, CR website does weird things, and there are some transient errors, wait a couple of minutes (or hours) and try again. It often solved the issue on my side (yes I know that's not really a way of fixing, but if the error is on CR side, Crunchy can't do anything)

If really nothing works or you find a problem with Crunchy, then you can go and fill an Issue, first read the already open and closed one to make sure you are not reporting an existing problem. If your problem has been already reported, what you can do is to either:
- Add a comment saying you also have the same issue
- Add a Thumbs Up reaction to the original entry in the issue, they will are used as a metric to know how many people are annoyed by that issue
If you find one which correspond and is close, don't hesitate to add a comment, the issue may have not be fully solved.

If there is no comparable opened or close issue, you can create a new one.

### What to put in a bug report
It is really important for me to know:
- on which Operating System you are running Crunchy,
- which anime you want to fetch if it is related to a specific one, 
- The command line you use to run Crunchy
- What message Crunchy is giving you if any

**Please be careful to remove your real account login and password if they appear!**

Also don't hesitate to add labels you feel apropriate on your report.

_Note: You can also use a bug report for a feature requests._

## Developers

More information will be added at a later point. For now the recommendations are:

* Atom with `atom-typescript` and `linter-tslint` (and dependencies).

Since this project uses TypeScript, compile with `node ts` or `npm install`.

#### A note about pull requests:
If you want to help working on this project, Pull request are welcome, but please explain the goal of your changes, and do a pull request per change: you want to add support for _X_, _Y_ and _Z_, make a pull request for X, one for Y and one for Z. I'm not saying a pull request per commit that would be idiotic.
The idea is if your pull request changes lots of thing at the same time, if just a single part can't be accepted, if will delay the acceptation of the whole pull request where some of the feature could be integrated quicker is they were requested alone.
Also if for example the change _Y_ depends on _X_, you can wait for _X_ to be accepted before requesting for _Y_, if they are independant you can send a pull request for each at the same time.
