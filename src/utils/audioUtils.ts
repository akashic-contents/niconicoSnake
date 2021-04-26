import { GameConfig } from "../config/GameConfig";

/**
 * 対象のオーディオをパラメータで指定したボリュームに設定する
 * @param audioPlayer : 対象の g.AudioPlayer
 * @param config : セッションパラメータのコンフィグ
 */
export function changeAudioMasterVolume(audioPlayer: g.AudioPlayer, config: GameConfig): void {
	if (audioPlayer == null) return;
	if (
		!!config.debug && config.debug.audioVolume
	){
		audioPlayer.changeVolume(config.debug.audioVolume);
	} else {
		audioPlayer.changeVolume(config.audio.audioVolume);
	}
}
