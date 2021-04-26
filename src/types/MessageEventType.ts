import { PlayerInfo, SnakeCollisionInfo, EatenFoodInfo } from "../StateManager";
import { UserTouchState } from "./UserTouchState";
import { RankingType } from "../scene/ResultScene/ResultScene";
import { ScrollSpeedType } from "../entity/ResultScene/RankingLabel";

export enum MessageEventType {
	// ----------
	// 募集～抽選画面のイベント
	// ----------

	/**
	 * 放送者が参加者募集を開始する。
	 * startRecruitmentのタイミングは生主のユーザーアクションによって決定される。
	 */
	startRecruitment = "startRecruitment",

	/**
	 * 参加者募集状態にする。
	 */
	waitRecruitment = "waitRecruitment",

	/**
	 * 視聴者がゲーム参加を希望する。
	 */
	joinRequest = "joinRequest",

	/**
     * 抽選結果を全インスタンスに共有する。
     */
	lotteryResult = "lotteryResult",

	/**
	 * 参加者が集まらなかった時に募集をやりなおす
	 */
	restartRecruitment = "restartRecruitment",

	/**
	 * ゲーム開始を全インスタンスに通知する。
	 */
	startGame = "startGame",

	// ----------
	// ゲーム画面のイベント
	// ----------

	/**
	 * ゲーム画面の初期化を通知する。
	 */
	initMainGame = "initMainGame",

	/**
	 * 全スネーク・指定したスネークの無敵状態を解除し、PlayerStateをPlayingにセットすることを通知する。
	 */
	setPlaying = "setPlaying",

	/**
	 * ユーザによって操作状態が変わったことを通知する。
	 */
	changeUserTouchState = "changeUserTouchState",

	/**
	 * 衝突したプレイヤーを全インスタンスに通知する。
	 */
	sendPlayersInConflict = "sendPlayersInConflict",

	/**
	 * リスポーンしたプレイヤーのスネークを全インスタンスに通知する。
	 */
	respawnSnake = "respawnSnake",

	/**
	 * お宝のリスポーンを全インスタンスに通知する。
	 */
	respawnJewel = "respawnJewel",

	/**
	 * エサが食べられた情報を全インスタンスに通知する。
	 */
	eatenFoods = "eatenFoods",

	/**
	 * 放送者のスネークが天使スネークになったことを全インスタンスに通知する。
	 */
	respawnBroadcasterAngelSnake = "respawnBroadcasterAngelSnake",

	/**
	 * お宝所有者の更新情報を全インスタンスに通知する。
	 */
	updateJewelOwner = "updateJewelOwner",

	/**
	 * ランキング情報を全インスタンスに通知する。
	 */
	rankingAccountData = "rankingAccountData",

	/**
	 * 残りの制限時間を全インスタンスに通知する。
	 */
	updateRemainTime = "updateRemainTime",

	/**
	 * アニメーション開始を通知する。
	 */
	animation = "animation",

	/**
	 * カウントダウン表示を全インスタンスに通知する。
	 */
	countDown = "countDown",

	/**
	 * ユーザによる操作状態の変更を全インスタンスに通知する。
	 */
	preventUsertouch = "preventUsertouch",

	/**
	 * あるスネークをdestroyすることを全インスタンスに通知する。
	 */
	destroySnake = "destroySnake",

	/**
	 * ゲーム終了手続き開始を全インスタンスに通知する。
	 */
	finishGame = "finishGame",

	/**
	 * リザルト画面遷移を全インスタンスに通知する。
	 */
	startResult = "startResult",

	// ----------
	// リザルト画面のイベント
	// ----------

	/**
	 * リザルト画面の初期化を全インスタンスに通知する。
	 */
	initResult = "initResult",

	/**
	 * 次に表示するランキングの種類を全インスタンスに通知する。
	 */
	nextRankingType = "nextRankingType",

	/**
	 * ランキングスクロール速度変更を全インスタンスに通知する。
	 */
	changeScrollSpeed = "changeScrollSpeed"
}

export interface MessageEventData {
	messageType: MessageEventType;
}

export interface AccountData {
	id: string;
	name: string;
	isPremium: boolean;
}

export interface JoinPlayerUserData {
	player: g.Player;
	user: AccountData;
}

export interface InitPlayerLayoutData {
	/**
	 * 初期位置
	 */
	position: g.CommonOffset;

	/**
	 * 初期状態
	 */
	state: UserTouchState;

	/**
	 * 方向（0~radianFineness-1）
	 */
	direction: number;

	/**
	 * ユーザー名
	 */
	name: string;
}

/**
 * プレイヤーの初期配置一覧
 */
export interface PlayerInitLayoutList {
	[key: string]: InitPlayerLayoutData;
}

// ----------
// 募集～抽選画面のイベント
// ----------

/**
 * 参加募集を開始し、全インスタンスに募集開始時間を共有する。
 */
export interface MessageEventDataWaitRecruitment extends MessageEventData {
	messageType: MessageEventType.waitRecruitment;
	messageData: {
		startTime: number;
	};
}

/**
 * 募集を開始し、放送者のアカウント情報を通知する。
 */
export interface MessageEventDataStartRecruitment extends MessageEventData {
	messageType: MessageEventType.startRecruitment;
	messageData: {
		broadcasterUser: AccountData;
	};
}

/**
 * 参加を希望したプレイヤーを通知する。
 */
export interface MessageEventDataJoinRequest extends MessageEventData {
	messageType: MessageEventType.joinRequest;
	messageData: {
		joinPlayer: g.Player;
		joinUser: AccountData;
	};
}

/**
 * 当選したプレイヤーを通知する。
 */
export interface MessageEventDataLotteryResult extends MessageEventData {
	messageType: MessageEventType.lotteryResult;
	messageData: {
		playerList: {[key: string]: PlayerInfo;};
		numPlayers: number;
	};
}

// ----------
// ゲーム画面のイベント
// ----------

/**
 * ゲーム画面の初期化を通知する。
 */
export interface MessageEventDataInitMainGame extends MessageEventData {
	messageType: MessageEventType.initMainGame;
	messageData: {
		playerInitLayoutList: PlayerInitLayoutList;
	};
}

/**
 * 全スネークの無敵状態を解除し、ゲームスタートを通知する。
 */
export interface MessageEventDataSetPlaying extends MessageEventData {
	messageType: MessageEventType.setPlaying;
	messageData: {
		scope: ScopeType;
		playerId?: string;
	};
}

/**
 * ユーザの操作状態を更新する。
 */
export interface MessageEventDataChangeUserTouchState extends MessageEventData {
	messageType: MessageEventType.changeUserTouchState;
	messageData: {
		/**
		 * 更新するユーザーのid
		 */
		id?: string;

		/**
	 	 * 方向（0~radianFineness-1）
	 	 */
		newDirection?: number;

		/**
		 * 操作状態
		 */
		newState: UserTouchState;

		/**
		 * 汎用なSE発火可能フラグ
		 */
		canPlaySE?: boolean;
	};
};

/**
 * 衝突したプレイヤーを全インスタンスに通知する。
 */
export interface MessageEventDataPlayersInConflict extends MessageEventData {
	messageType: MessageEventType.sendPlayersInConflict;
	messageData: {
		playersInConflict: SnakeCollisionInfo[];
	};
}

/**
 * リスポーンしたプレイヤーのスネークを全インスタンスに通知する。
 */
export interface MessageEventDataRespawnSnake extends MessageEventData {
	messageType: MessageEventType.respawnSnake;
}

/**
 * お宝のリスポーンを全インスタンスに通知する。
 */
export interface MessageEventDataRespawnJewel extends MessageEventData {
	messageType: MessageEventType.respawnJewel;
	messageData: {
		position: g.CommonOffset;
	};
}

/**
 * エサが食べられた情報を全インスタンスに通知する。
 */
export interface MessageEventDataEatenFoods extends MessageEventData {
	messageType: MessageEventType.eatenFoods;
	messageData: {
		eatenFoodInfo: EatenFoodInfo[];
		noEatenFoodIndexList: number[]; // データ削減のためにインデックスを通知する。
		fieldRadius: number;
	};
}

/**
 * 放送者のスネークが天使スネークになったことを全インスタンスに通知する。
 */
export interface MessageEventDataRespawnAngelSnake extends MessageEventData {
	messageType: MessageEventType.respawnBroadcasterAngelSnake;
}

/**
 * お宝所有者の更新情報を全インスタンスに通知する。
 */
export interface MessageEventDataJewelOwner extends MessageEventData {
	messageType: MessageEventType.updateJewelOwner;
	messageData: {
		/**
		 * お宝をゲットしたプレイヤーのid
		 */
		ownerId: string;
	};
}

/**
 * ランキング情報を全インスタンスに通知する。
 */
export interface MessageEventDataRanking extends MessageEventData {
	messageType: MessageEventType.rankingAccountData;
	messageData: {
		/**
		 * ランキングで利用するAccountData配列（snakeの節の長さについて降順）
		 */
		rankingAccountData: AccountData[];
	};
}

/**
 * 残りの制限時間を全インスタンスに通知する。
 */
export interface MessageEventDataRemainTime extends MessageEventData {
	messageType: MessageEventType.updateRemainTime;
	messageData: {
		/**
		 * 残りの制限時間
		 */
		remainTime: number;
	};
}

/**
 * アニメーション開始を通知する。
 */
export interface MessageEventDataAnimation extends MessageEventData {
	messageType: MessageEventType.animation;
	messageData: {
		animationType: AnimationType;
		scope: ScopeType;
		playerId?: string;
	};
}

/**
 * カウントダウン表示を全インスタンスに通知する。
 */
export interface MessageEventDataCountDown extends MessageEventData {
	messageType: MessageEventType.countDown;
	messageData: {
		countDownType: CountDownType;
	};
}

/**
 * ユーザによる操作状態の変更を全インスタンスに通知する。
 */
export interface MessageEventDataPreventUsertouch extends MessageEventData {
	messageType: MessageEventType.preventUsertouch;
	messageData: {
		preventType: PreventType;
		playerId: string;
	};
}

/**
 * あるスネークをdestroyすることを全インスタンスに通知する。
 */
export interface MessageEventDataDestroySnake extends MessageEventData {
	messageType: MessageEventType.destroySnake;
	messageData: {
		deadPlayerId: string;
	};
}

/**
 * ゲーム終了手続き開始を全インスタンスに通知する。
 */
export interface MessageEventDataFinishGame extends MessageEventData {
	messageType: MessageEventType.finishGame;
}

/**
 * リザルト画面遷移を全インスタンスに通知する。
 */
export interface MessageEventDataStartResult extends MessageEventData {
	messageType: MessageEventType.startResult;
}

// ----------
// リザルト画面のイベント
// ----------

export interface MessageEventDataInitResult extends MessageEventData {
	messageType: MessageEventType.initResult;
	messageData: {
		/**
		 * 長さランキング用のプレイヤーデータ（降順）
		 */
		lengthRankingPlayerIdList: {playerId: string; count: number;}[];

		/**
		 * キルランキング用のプレイヤーデータ（降順）
		 */
		killRankingPlayerIdList: {playerId: string; count: number;}[];

		/**
		 * お宝保持者のプレイヤーId（保持者がいない場合は null）
		 */
		jewelOwnerId: string;
	};
}

/**
 * 次に表示するランキングの種類を全インスタンスに通知する。
 */
export interface MessageEventDataNextRankingType extends MessageEventData {
	messageType: MessageEventType.nextRankingType;
	messageData: {
		nextRankingType: RankingType;
	};
}

/**
 * ランキングスクロール速度変更を全インスタンスに通知する。
 */
export interface MessageEventDataScrollSpeed extends MessageEventData {
	messageType: MessageEventType.changeScrollSpeed;
	messageData: {
		rankingType: RankingType;
		speedType: ScrollSpeedType;
	};
}

/**
 * 対象Scopeの種類
 */
export enum ScopeType {
	/**
	 * 全員対象
	 */
	All = "All",

	/**
	 * ある特定の一人対象
	 */
	One = "One"
}

/**
 * Animationの種類
 */
export enum AnimationType {
	/**
	 * 透過度変更によりスネークを点滅させる
	 */
	Blinking = "Blinking",

	/**
	 * スネークを見えなくして「放送者画面に切り替わります」を表示
	 */
	ToBroadcasterView = "ToBroadcasterView"
}

/**
 * カウントダウン表示の種類
 */
export enum CountDownType {
	Start = "Start",
	Finish = "Finish",
	One = "One",
	Two = "Two",
	Three = "Three"
}

export enum PreventType {
	TouchState = "TouchState",
	None = "None"
}
