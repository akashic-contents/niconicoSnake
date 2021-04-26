export interface GameConfig {
	field: {
		/**
		 * 円形フィールド半径[px]
		 * 参加人数に依存
		 */
		radius: number[];

		/**
		 * 毎秒縮小するフィールド半径[px]
		 */
		narrowRadiusPerSec: number;

		/**
		 * 背景透過度
		 */
		bgOpacity: number;
	};

	food: {
		/**
		 * 出現間隔[ミリ秒]
		 */
		interval: number;

		/**
		 * 一度に出るエサの数
		 * フィールドの大きさに依存
		 */
		volume: number[];
	};

	snake: {
		/**
		 * ダッシュ継続時間
		 */
		dashingTime: number;

		/**
		 * 基本速度
		 */
		baseSpeed: number;

		/**
		 * 最大速度
		 * 基本速度に対する倍率。2なら最大2倍速
		 */
		maxSpeedScale: number;

		/**
		 * 毎フレームごとのダッシュゲージ回復量
		 * ゲージ最大値は dashingTime * g.game.fps
		 * ダッシュ中の毎フレームごとのゲージ消費量は 1
		 */
		amountDashingGaugeRecoveryPerFrame: number;

		/**
		 * リスポーン時の名前として使える最大長文字数
		 */
		maxNameLength: number;

		/**
		 * 表示するスネークの最大節数
		 */
		maxKnotLength: number;

		/**
		 * 一般会員のリスポーン回数
		 */
		respawnTimes: number;

		/**
		 * プレミアム会員のリスポーン回数
		 */
		premiumRespawnTimes: number;

		/**
		 * 無敵時間[ミリ秒]
		 */
		invincibleTime: number;
	};

	time: {
		/**
		 * 制限時間の有無
		 */
		isTimeBased: boolean;

		/**
		 * 制限時間
		 */
		limit: number;
	};

	userInput: {
		/**
		 * 操作が移動方向に反映されるpointDown位置からの移動距離の閾値
		 */
		pointMoveDistance: number;

		/**
		 * ダブルタップ判定される時間の閾値
		 * g.game.ageの経過時間がこの閾値以下の場合はダブルタップとみなされる
		 */
		doublePointDuration: number;

		/**
		 * 移動方向の分割数（整数）
		 * 増やすほど細かい方向制御できるがイベント頻度が増える
		 */
		radianFineness: number;
	};

	audio: {
		/**
		 * オーディオマスターボリューム
		 */
		audioVolume: number;
	};

	//* * デバッグ用途のみで使う */
	debug?: {
		/**
		 * 抽選をスキップして、一人プレイでゲーム開始（デバック用）
		 */
		skipLottery: boolean;

		/**
         * ランダムに利用されるプレイヤー名
         */
		playerNames: string[];

		/**
		 * デバッグ時のオーディオマスターボリューム
		 */
		audioVolume: number;

		/**
		 * 人数によるゲーム終了条件を無効にする
		 */
		banEndingGameByNumberOfPlayers: boolean;

	};
}
