import { PlayerInfo } from "../StateManager";

/**
 * ゲーム中のプレイヤーの状態を管理する構造体
 */
export interface PlayerList {
	// akashicのplayer.idをユニークなIDとして使う
	[key: string]: PlayerInfo;
}
