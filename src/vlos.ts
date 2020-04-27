'use strict';

export default {getMedia};

function getMedia(vlosScript: string, seasonTitle: string, seasonNumber: string): IEpisodePage
{
  let vlosMedia: IVlosScript;

  function f(script: string) {
    /* We need to scope things */

    /* This is what will give us the medias */
    function VilosPlayer() {
      this.load = function(a: string, b: any, c: any)
      {
        vlosMedia = this.config.media;
        vlosMedia.series = this.config.analytics.media_reporting_parent;
      };
      this.config = {};
      this.config.player = {};
      this.config.player.pause_screen = {};
      this.config.language = '';
    }

    /* Let's stub what the script need */
    const window = {
      WM: {
        UserConsent: {
          getUserConsentAdvertisingState(): string { return ''; }
        }
      }
    };
    const document = {
      getElementsByClassName(a: any): any { return {length: 0}; },
    };
    const localStorage = {
      getItem(a: any): any { return null; },
    };
    const $ = {
      cookie(a: any) { /* nothing */ },
    };

    /*
      Evil ugly things. Need to run the script from a somewhat untrusted source.
      Need to find a better way of doing.
     */
    // tslint:disable-next-line:no-eval
    eval(script);

  }
  f(vlosScript);

  if (vlosMedia === undefined)
  {
    console.error('Error fetching vlos data - aborting - Please report the error if happen again.');
    process.exit(-1);
  }

  return {
    episode: vlosMedia.metadata.episode_number,
    id: vlosMedia.metadata.id,
    series: vlosMedia.series.title,
    season: seasonTitle,
    title: vlosMedia.metadata.title,
    swf: '',
    volume: seasonNumber,
    filename: '',
    media: vlosMedia,
  };
}
