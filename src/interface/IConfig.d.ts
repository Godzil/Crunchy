interface IConfig {
  // Authentication
  pass?: string;
  user?: string;
  // Disables
  cache?: boolean;
  merge?: boolean;
  // Filters
  episode?: number;
  volume?: number;
  // Settings
  format?: string;
  output?: string;
  series?: string;
  filename?: string;
  tag?: string;
  resolution?: string;
  video_format?: string;
  video_quality?: string;
  rebuildcrp?: boolean;
  batch?: string;
  verbose?: boolean;
}
