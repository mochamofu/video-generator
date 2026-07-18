import {Config} from '@remotion/cli/config';

// サンドボックス/CI等でChromiumを差し替えたい場合は REMOTION_BROWSER にパスを入れる。
// 未指定ならRemotionが自前のHeadless Shellを使う(ローカルPCはこちら)。
if (process.env.REMOTION_BROWSER) {
  Config.setBrowserExecutable(process.env.REMOTION_BROWSER);
}
Config.setOverwriteOutput(true);
Config.setVideoImageFormat('jpeg');
Config.setConcurrency(2);
