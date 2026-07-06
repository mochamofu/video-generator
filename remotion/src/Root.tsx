import {Composition} from 'remotion';
import {ShortVideo, defaultProps, FPS, type VideoProps} from './ShortVideo';

export const Root = () => {
  return (
    <Composition
      id="ShortVideo"
      component={ShortVideo}
      width={1080}
      height={1920}
      fps={FPS}
      durationInFrames={300}
      defaultProps={defaultProps}
      calculateMetadata={async ({props}) => {
        const p = props as VideoProps;
        return {
          durationInFrames: Math.max(30, Math.ceil(p.total * FPS)),
          props,
        };
      }}
    />
  );
};
