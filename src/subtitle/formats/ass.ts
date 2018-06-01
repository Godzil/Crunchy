'use strict';
import xml2js = require('xml2js');

/**
 * Converts an input buffer to a SubStation Alpha subtitle.
 */
export default function(input: string|Buffer, done: (err: Error, subtitle?: string) => void)
{
  xml2js.parseString(input.toString(), {
    explicitArray: false,
    explicitRoot: false
  }, (err: Error, xml: ISubtitle) =>
  {
    if (err)
    {
      return done(err);
    }

    try
    {
      done(null, script(xml) + '\n' +
          style(xml.styles) + '\n' +
          event(xml.events));
    } catch (err)
    {
      done(err);
    }
  });
}

/**
 * Converts the event block.
 */
function event(block: ISubtitleEvent): string
{
  const format = 'Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text';

  return '[Events]\n' +
         'Format: ' + format + '\n' + [].concat(block.event).map((style) => ('Dialogue: 0,' +
              style.$.start + ',' +
              style.$.end + ',' +
              style.$.style + ',' +
              style.$.name + ',' +
              style.$.margin_l + ',' +
              style.$.margin_r + ',' +
              style.$.margin_v + ',' +
              style.$.effect + ',' +
              style.$.text)).join('\n') + '\n';
}

/**
 * Converts the script block.
 */
function script(block: ISubtitle): string
{

  return '[Script Info]\n' +
         'Title: ' + block.$.title + '\n' +
         'ScriptType: v4.00+\n' +
         'WrapStyle: ' + block.$.wrap_style + '\n' +
         'PlayResX: ' + block.$.play_res_x + '\n' +
         'PlayResY: ' + block.$.play_res_y + '\n' +
         'Subtitle ID: ' + block.$.id + '\n' +
         'Language: ' + block.$.lang_string + '\n' +
         'Created: ' + block.$.created + '\n';
}

/**
 * Converts the style block.
 */
function style(block: ISubtitleStyle): string
{
  const format = 'Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,' +
               'OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,' +
               'ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,' +
               'MarginL,MarginR,MarginV,Encoding';

  return '[V4+ Styles]\n' +
         'Format: ' + format + '\n' + [].concat(block.style).map((style) => 'Style: ' +
              style.$.name + ',' +
              style.$.font_name + ',' +
              style.$.font_size + ',' +
              style.$.primary_colour + ',' +
              style.$.secondary_colour + ',' +
              style.$.outline_colour + ',' +
              style.$.back_colour + ',' +
              style.$.bold + ',' +
              style.$.italic + ',' +
              style.$.underline + ',' +
              style.$.strikeout + ',' +
              style.$.scale_x + ',' +
              style.$.scale_y + ',' +
              style.$.spacing + ',' +
              style.$.angle + ',' +
              style.$.border_style + ',' +
              style.$.outline + ',' +
              style.$.shadow + ',' +
              style.$.alignment + ',' +
              style.$.margin_l + ',' +
              style.$.margin_r + ',' +
              style.$.margin_v + ',' +
              style.$.encoding).join('\n') + '\n';
}
