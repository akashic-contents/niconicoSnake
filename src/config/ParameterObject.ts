import { GameConfig } from "./GameConfig";

export interface SnakeGameMainParameterObject extends g.GameMainParameterObject {
	sessionParameter: SnakeGameSessionParameter;
	broadcasterPlayer: g.Player;
}

export interface SnakeGameSessionParameter {
	/**
	 * 参加者受付時間
	 */
	entrySec?: number;

	/**
	 * 参加可能最大人数
	 */
	numPlayers?: number;

	/**
	 * あそびかたの説明文言
	 */
	howtoMessage?: string;

	/**
	 * プレミアム会員の当選ウェイト
	 */
	premiumWeight?: number;

	/**
	 * ゲーム関連
	 */
	config?: GameConfig;
}
