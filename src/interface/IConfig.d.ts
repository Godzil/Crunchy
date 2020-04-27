interface IConfig {
  // Authentication
  pass?: string;
  user?: string;
  // Disables
  cache?: boolean;
  merge?: boolean;
  episodes?: string;
  // Settings
  crlang?: string;
  sublang?: any;
  format?: string;
  output?: string;
  series?: string;
  nametmpl?: string;
  tag?: string;
  ignoredub?: boolean;
  resolution?: string;
  video_format?: string;
  video_quality?: string;
  rebuildcrp?: boolean;
  batch?: string;
  verbose?: boolean;
  debug?: boolean;
  unlog?: boolean;
  retry?: number;
  sleepTime?: number;
  // Login options
  userAgent?: string;
  logUsingApi?: boolean;
  logUsingCookie?: boolean;
  crSessionUrl?: string;
  crDeviceType?: string;
  crAPIVersion?: string;
  crLocale?: string;
  crSessionKey?: string;
  crLoginUrl?: string;
  // Generated values
  crDeviceId?: string;
  crSessionId?: string;
}
