'use strict';

const localeCC: { [id: string]: string; } =
{
  enUS: 'en', enGB: 'en',
  esLA: 'es', esES: 'es',
  ptPT: 'pt', ptBR: 'pt',
  frFR: 'fr',
  deDE: 'de',
  itIT: 'it',
  ruRU: 'ru',
};

export function localeToCC(locale: string): string
{
  let ret = localeCC.enGB;

  if (locale in localeCC)
  {
    ret = localeCC[locale];
  }

  return ret;
}

const dubignore_regexp: { [id: string]: RegExp; } =
{
  en: /\(.*Dub(?:bed)?.*\)|(?:\(RU\))|\(Russian\)/i,
  fr: /\(.*Dub(?:bed)?.*\)|(?:\(RU\))|\(?Doublage.*\)|\(Russian\)?/,
  de: /\(.*isch\)|\(Dubbed\)|\(RU\)|\(Russian\)/
};

export function get_diregexp(config: IConfig): RegExp
{
  let ret = dubignore_regexp.en;

  if (config.crlang in dubignore_regexp)
  {
    ret = dubignore_regexp[config.crlang];
  }

  return ret;
}

const episodes_regexp: { [id: string]: RegExp; } =
{
  en: /Episode\s+((OVA)|(PV )?[S0-9][\-P0-9.]*[a-fA-F]?)\s*$/i,
  fr: /Épisode\s+((OVA)|(PV )?[S0-9][\-P0-9.]*[a-fA-F]?)\s*$/i,
  de: /Folge\s+((OVA)|(PV )?[S0-9][\-P0-9.]*[a-fA-F]?)\s*$/i,
  es: /Episodio\s+((OVA)|(PV )?[S0-9][\-P0-9.]*[a-fA-F]?)\s*$/i,
  it: /Episodio\s+((OVA)|(PV )?[S0-9][\-P0-9.]*[a-fA-F]?)\s*$/i,
  pt: /Episódio\s+((OVA)|(PV )?[S0-9][\-P0-9.]*[a-fA-F]?)\s*$/i,
  ru: /Серия\s+((OVA)|(PV )?[S0-9][\-P0-9.]*[a-fA-F]?)\s*$/i,
};

export function get_epregexp(config: IConfig): RegExp
{
  let ret = episodes_regexp.en;

  if (config.crlang in episodes_regexp)
  {
    ret = episodes_regexp[config.crlang];
  }

  return ret;
}