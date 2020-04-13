interface IConfigTask {
  address: string;
  retry: number;
  episode_min: IEpisodeNumber;
  episode_max: IEpisodeNumber;
}
