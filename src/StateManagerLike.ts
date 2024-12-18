import type { Label } from "@akashic-extension/akashic-label";
import type { SnakeGameSessionParameter } from "./config/ParameterObject";
import type { Food } from "./entity/Food";
import type { JewelData } from "./entity/Jewel";
import type { AccountData, AnimationType, JoinPlayerUserData, PreventType, ScopeType } from "./types/MessageEventType";
import type { PlayerList } from "./types/PlayerList";
import type { PlayerInfo } from "./StateManager";
import type { Snake } from "./entity/Snake";
import type { UserTouchState } from "./types/UserTouchState";

export interface StateManagerLike {
	sessionParameter: SnakeGameSessionParameter;
	broadcaster: g.Player;
	broadcasterData: AccountData;
	isBroadcaster: boolean;
	startTime: number;
	resource: {
		font: g.Font;
	};
	randomGenerator: g.XorshiftRandomGenerator;
	audioAssets: {[key: string]: g.AudioAsset;};
	applicantList: JoinPlayerUserData[];
	playerList: PlayerList;
	userNameLabels: {[key: string]: Label;};
	topPlayerList: PlayerInfo[];
	foodList: Food[];
	waitingFoodList: Food[];
	jewelData: JewelData;
	maxFoodListLength: number;
	isGameOver: boolean;

	createResource(): void;
	changeTitleScene(): void;
	changeMainGameScene(): void;
	changeResultScene(): void;
	setPlayerList(playerList: {[key: string]: PlayerInfo;}): void;
	startRecruitment(broadcasterData: AccountData): void;
	receiveJoinRequest(player: g.Player, user: AccountData): void;
	startLottery(): void;
	startGame(): void;
	restartRequruitment(): void;
	setupInitLayout(): void;
	setCameraAndSnake(playerId: string, snake: Snake): void;
	applyTouchState(playerId: string, state: UserTouchState, direction?: number): void;
	endInvincibleTime(scope: ScopeType, playerId?: string): void;
	setCountDown(): void;
	applyPlayingStateForAllSnakes(): void;
	applyPlayingStateForOneSnake(playerId: string): void;
	setPlayerState(playerId: string, state: PlayerState): void;
	animateAllSnakes(animationType: AnimationType): void;
	animateOneSnake(animationType: AnimationType, playerId: string): void;
	checkSnakeCollision(): void;
	checkEatenFoods(fieldRadius: number): void;
	updateRanking(): void;
	applyEatenFoods(eatenFoodInfo: EatenFoodInfo[], noEatenFoodIndexList: number[], fieldRadius: number): void;
	checkEatenJewel(): void;
	checkJewelOutsideField(fieldRadius: number): void;
	setRespawnJewel(position: g.CommonOffset): void;
	applyEatenJewel(ownerId: string): void;
	setRespawnSnake(playerId: string, snakeLayer: g.E, nowRadius: number): void;
	setBroadcasterAngelSnake(snakeLayer: g.E, nowRadius: number): void;
	applyPreventUserTouch(playerId: string, preventType: PreventType): void;
	checkGameEnd(): void;
	gameEndProcedure(): void;
	playAudioAtParamVolume(audioType: AudioType): void;
	setupResultRanking(): void;
	dividePlayerCountIntoTiers(): number;
}

export enum PlayerState {
	/**
     * 不可視な天使（ゴースト）として参加している
     */
	ghost = "ghost",

	/**
     * 盤面に影響を持つスネークを操作している
     */
	playing = "playing",

	/**
     * join済みだがゴーストもスネークも操作していない
     */
	dead = "dead",

	/**
	 * 無敵状態（当たり判定なし）
	 * ゲーム開始・リスポン直後に即死するのを避けるための状態で、ghostとは区別される
	 * 生きているプレイヤーとしてカウントされる
	 */
	invincible = "invincible",

	/**
	 * 演出中の状態（当たり判定なし）
	 * キルされた時などに演出を行うための状態
	 * 生きているプレイヤーとしてカウントされる
	 */
	staging = "staging"

	/**
     * joinを押してないプレイヤーはPlayerStateが生成されないため、これを表現する種別はない
     */
}

export interface SnakeCollisionInfo{
	/**
	 * 倒されたプレイヤーのid
	 */
	deadPlayerId: string;

	/**
	 * deadPlayerIdを倒したプレイヤーのid
	 */
	killerPlayerId: string;
}

export interface EatenFoodInfo{
	/**
	 * エサを食べたプレイヤーのid
	 */
	eaterId: string;

	/**
	 * 食べられたエサのindex
	 */
	eatenIndex: number; // データ削減のためFoodを使わない
}

export enum AudioType {
	// ----------
	// ゲーム画面のオーディオ
	// ----------

	/**
	 * ゲーム画面BGM
	 */
	GameBGM = "GameBGM",

	/**
	 * ３２１カウントダウン時のSE
	 */
	Count = "Count",

	/**
	 * ゲーム開始時のSE
	 */
	Start = "Start",

	/**
	 * ゲーム終了時のSE
	 */
	Finish = "Finish",

	/**
	 * 衝突時のSE
	 */
	Collision = "Collision",

	/**
	 * ダッシュ時のSE
	 */
	Dash = "Dash",

	/**
	 * お宝ゲット時のSE
	 */
	Jewel = "Jewel",

	/**
	 * 選択時のSE
	 */
	Select = "Select",

	// ----------
	// リザルト画面のオーディオ
	// ----------

	/**
	 * イントロ
	 */
	Intro = "Intro",

	/**
	 * リザルト画面BGM
	 */
	ResultBGM = "ResultBGM"
}
