import {Composition} from 'remotion';
import {ShortVideo, defaultProps, FPS, type VideoProps} from './ShortVideo';
import '@fontsource/noto-sans-jp/700.css';
import '@fontsource/noto-sans-jp/900.css';
import {
  TimelineComposition,
  defaultProject,
  projectDurationFrames,
  type TimelineProject,
} from './timeline/TimelineComposition';

export const Root = () => {
  return (
    <>
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
      <Composition
        id="Timeline"
        component={TimelineComposition}
        width={defaultProject.width}
        height={defaultProject.height}
        fps={defaultProject.fps}
        durationInFrames={90}
        defaultProps={{project: defaultProject}}
        calculateMetadata={async ({props}) => {
          const {project} = props as {project: TimelineProject};
          return {
            width: project.width,
            height: project.height,
            fps: project.fps,
            durationInFrames: projectDurationFrames(project),
            props: {project},
          };
        }}
      />
    </>
  );
};
