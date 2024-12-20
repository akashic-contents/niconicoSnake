import { Label } from "@akashic-extension/akashic-label";
import { Timeline, Easing } from "@akashic-extension/akashic-timeline";
import { SceneBase } from "../SceneBase";
import type { StateManagerLike, SnakeCollisionInfo } from "../../StateManagerLike";
import { AudioType, PlayerState } from "../../StateManagerLike";
import { MainGameBehavior } from "./MainGameBehavior";
import { UserTouchState } from "../../types/UserTouchState";
import {
	InitPlayerLayoutData,
	MessageEventDataChangeUserTouchState,
	MessageEventType,
	PlayerInitLayoutList,
	MessageEventDataRespawnSnake,
	MessageEventDataRespawnAngelSnake,
	AccountData,
	MessageEventDataRemainTime,
	CountDownType,
	MessageEventDataPreventUsertouch,
	PreventType,
	MessageEventDataAnimation,
	AnimationType,
	ScopeType,
	MessageEventDataDestroySnake
} from "../../types/MessageEventType";
import { Field } from "../../entity/Field";
import { Snake, SnakeSegmentType } from "../../entity/Snake";
import { snakeAssetIds, uiAssetIds, fontAssetIds, audioAssetIds, effectAssetIds } from "../../assetIds";
import { Food, FoodElement } from "../../entity/Food";
import { Jewel } from "../../entity/Jewel";
import { clampString, stringToArray } from "../../commonUtils/utils";
import { PopupNotice, NoticeType } from "../../entity/PopupNotice";
import { ScorePanel } from "../../entity/ScorePanel";
import { TimePanel } from "../../entity/TimePanel";
import { MiniMap } from "../../entity/MiniMap";
import { DashingGauge } from "../../entity/DashingGauge";
import { checkStateRole, StateRoleType } from "../../utils/StateRoleChecker";

export function createMainGameScene(stateManager: StateManagerLike): SceneBase {
	const foodCharsAsset = g.game.assets.foodAvailableChars as g.TextAsset;
	const foodChars: string[] = JSON.parse(foodCharsAsset.data).foodAvailableChars;

	const assetIds: string[] = [];
	assetIds.push(...snakeAssetIds);
	assetIds.push(...uiAssetIds);
	assetIds.push(...fontAssetIds);
	assetIds.push(...audioAssetIds);
	assetIds.push(...effectAssetIds);
	const mainGameScene = new MainGameScene({
		game: g.game,
		stateManager: stateManager,
		assetIds: assetIds,
		foodChars: foodChars
	});
	return mainGameScene;
}

export interface MainGameSceneParameterObject extends g.SceneParameterObject {
	stateManager: StateManagerLike;
	foodChars: string[]; // ランダム出現するエサとして利用できる文字
}

export class MainGameScene extends SceneBase {
	stateManager: StateManagerLike;
	timeline: Timeline;
	foodChars: string[];
	root: g.E;

	// 描画レイヤー構造
	bgLayer: g.E; // 背景画像
	foodLayer: g.E; // エサ描画
	snakeLayer: g.E; // スネーク描画
	userFollowingLayer: g.E; // カメラ追従
	noticeLayer: g.E; // 通知描画

	touchArea: g.E; // スネーク操作のためのタッチイベントの取得。できるかぎりエンティティレイヤーの最上位に置く。ローカル
	stage: Field;

	// 流量制御
	lastKillNoticeAge: number;
	killNoticeCount: number;
	maxKillNoticeCount: number;

	// ローカル情報群
	localParameter: {
		noticeList: PopupNotice[];
		remainGameTimer: g.TimerIdentifier;
		remainTime: number;
		timePanel: TimePanel;
		killCountPanel: ScorePanel;
		lengthCountPanel: ScorePanel;
		preKillCount: number;
		preLengthCount: number;
		rankingPanel: g.Sprite;
		topPlayerLabelList: Label[];
		broadcasterRankLabel: Label;
		yourRankLabel: Label;
		lastPointUpTime: number; 	// 最後に poinUp された時の g.game.age
		startDoubleTapTime: number;
		dashingGauge: number;
		dashingGaugeBar: DashingGauge;
		respawnButton: g.Sprite;     // リスポーンボタン
		broadcasterDisplayViewing: g.Label;
		playerCountRank: number;     // プレイヤー人数のランク分け
		miniMap: MiniMap;
		jewelPop: g.Sprite;			// お宝獲得時のポップアップ
		pointDownMarker: g.Sprite;	// pointdown位置を表すUI
	};

	constructor(param: MainGameSceneParameterObject){
		super(param);
		this.stateManager = param.stateManager;
		this.timeline = new Timeline(this);
		this.foodChars = param.foodChars;
		this.localParameter = {
			noticeList: [],
			remainGameTimer: null,
			remainTime: this.stateManager.sessionParameter.config.time.limit,
			timePanel: null,
			killCountPanel: null,
			lengthCountPanel: null,
			preKillCount: 0,
			preLengthCount: 0,
			rankingPanel: null,
			topPlayerLabelList: [],
			broadcasterRankLabel: null,
			yourRankLabel: null,
			lastPointUpTime: -this.stateManager.sessionParameter.config.snake.dashingTime * g.game.fps,
			startDoubleTapTime: -this.stateManager.sessionParameter.config.snake.dashingTime * g.game.fps,
			dashingGauge: this.stateManager.sessionParameter.config.snake.dashingTime * g.game.fps,
			dashingGaugeBar: null,
			respawnButton: null,
			broadcasterDisplayViewing: null,
			playerCountRank: 0,
			miniMap: null,
			jewelPop: null,
			pointDownMarker: null,
		};
		this.lastKillNoticeAge = this.game.age;
		this.killNoticeCount = 0;
		this.maxKillNoticeCount = 2;

		this.onLoad.add(() => {
			this.setBehavior(new MainGameBehavior({
				scene: this,
				stateManager: this.stateManager
			}));
			this.setMessageEventListener();

			if (g.game.isActiveInstance()) this.stateManager.setupInitLayout();
		});
		this.onUpdate.add(() => {
			this._updateScene();
			this._updateDeadSnakeCamera();
			if (
				!!g.game.selfId && !!this.stateManager.playerList[g.game.selfId] &&
				!!this.stateManager.playerList[g.game.selfId].uiState
			){
				this._updateInPlayer();
			}
			if (g.game.isActiveInstance()) {
				this._updateInActiveInstance();
			}
			if (!!g.game.selfId && !this.stateManager.playerList[g.game.selfId]){
				this._updateInNonPlayer();
			}
		});
		this._setInterval();
	}

	init(playerInitLayoutList: PlayerInitLayoutList): void {
		this._applyInitPlayerLayoutData(playerInitLayoutList);
		this._createRoot();
		this._createBackground();
		this._createTouchArea();
		this._createPlayersSnakes(playerInitLayoutList);
		this._createDashGaugeBar();
		this._createUserNameLabels();
		this._createTimeView();
		this._createRankingView();
		this._createScoreView();
		this._createBroadcasterDisplayView();
		this._initJewel();
		this._createMiniMapView();
		this._createPointdownView();
		this._playBGM();
		this._setSE();
		if (
			!!this.stateManager.sessionParameter.config.debug &&
			this.stateManager.sessionParameter.config.debug.skipLottery
		){
			this._createDebugView();
		}
	}

	setCountDownIntervalInActiveInstance(): void {
		if (
			this.localParameter.remainGameTimer != null ||
			!this.stateManager.sessionParameter.config.time.isTimeBased
		) return;
		this.localParameter.remainGameTimer = this.setInterval(() => {
			if (this.localParameter.remainTime == null) {
				if (this.localParameter.remainGameTimer != null) {
					this.clearInterval(this.localParameter.remainGameTimer);
					this.localParameter.remainGameTimer = null;
				}
				return;
			}
			if (this.localParameter.remainTime <= 0) {
				if (this.localParameter.remainGameTimer != null) {
					this.clearInterval(this.localParameter.remainGameTimer);
					this.localParameter.remainGameTimer = null;
				}

				this.stateManager.gameEndProcedure();
			}
			const time = --this.localParameter.remainTime;
			if (time >= 0) {
				const message: MessageEventDataRemainTime = {
					messageType: MessageEventType.updateRemainTime,
					messageData: {
						remainTime: time
					}
				};
				g.game.raiseEvent(new g.MessageEvent(message));
			}
		}, 1000);
	}

	receivePlayersInConflict(playersInConflict: SnakeCollisionInfo[]): void {
		playersInConflict.forEach(info => {
			const deadPlayerId = info.deadPlayerId;
			const killerPlayerId = info.killerPlayerId;
			if (
				!!this.stateManager.playerList[deadPlayerId] &&
				!!this.stateManager.playerList[deadPlayerId].snake &&
				this.stateManager.playerList[deadPlayerId].state === PlayerState.playing
			){
				++this.stateManager.playerList[killerPlayerId].killCount;

				// SE再生
				if (
					deadPlayerId === g.game.selfId ||
					killerPlayerId === g.game.selfId ||
					(
						this._isAudience(g.game.selfId) &&
						(
							deadPlayerId === this.stateManager.broadcaster.id ||
							killerPlayerId === this.stateManager.broadcaster.id
						)
					)
				){
					// 頭衝突時に2重にSEが再生されることを防ぐ
					this.stateManager.audioAssets[AudioType.Collision].stop();
					this.stateManager.playAudioAtParamVolume(AudioType.Collision);
				}

				// キル通知作成
				if (g.game.age === this.lastKillNoticeAge) {
					this.killNoticeCount++;
				} else {
					this.lastKillNoticeAge = g.game.age;
					this.killNoticeCount = 0;
				}
				if (this.killNoticeCount < this.maxKillNoticeCount) {
					const killNotice = this._createNotice(NoticeType.Kill, killerPlayerId);
					this._addNotice(killNotice);
				}

				// ユーザー名ラベルをhide
				this.stateManager.userNameLabels[deadPlayerId].hide();

				// ポップ、ダッシュゲージをhide
				if (deadPlayerId === g.game.selfId){
					this.localParameter.jewelPop.opacity = 0.0;
					this.localParameter.dashingGaugeBar.hide();
				}

				this._dropSnakeBody(deadPlayerId);
				this.stateManager.playerList[deadPlayerId].state = PlayerState.staging;
				this.stateManager.playerList[deadPlayerId].snake.explosion();
			}
		});
	}

	manageSnakeDestructionInActiveInstance(playersInConflict: SnakeCollisionInfo[]): void {
		playersInConflict.forEach(info => {
			const deadPlayerId = info.deadPlayerId;
			if (
				!!this.stateManager.playerList[deadPlayerId] &&
				!!this.stateManager.playerList[deadPlayerId].snake &&
				this.stateManager.playerList[deadPlayerId].state === PlayerState.staging
			){
				// キルされた時の演出
				this.setTimeout(() => {
					this._snakeDestructionEventFlow(deadPlayerId);
				}, 100 * (this.stateManager.playerList[deadPlayerId].snake.segments.length + 1) + 800); // 爆破エフェクトが終わるまで待機
			}
		});
	}

	snakeDestructionProcedure(deadPlayerId: string): void {
		if (
			!!this.stateManager.playerList[deadPlayerId] &&
			!!this.stateManager.playerList[deadPlayerId].snake &&
			this.stateManager.playerList[deadPlayerId].state === PlayerState.staging
		){
			this.stateManager.playerList[deadPlayerId].destroySnake();

			if (this.stateManager.isGameOver) return;

			// 「放送者画面視聴中」
			if (deadPlayerId === g.game.selfId){
				if (this._isAudience(g.game.selfId)) {
					this.localParameter.broadcasterDisplayViewing.show();
				}
			}

			if (deadPlayerId === g.game.selfId){
				if ( this.stateManager.isBroadcaster ) {
					// 放送者リスポーンボタン表示
					if (this.stateManager.playerList[deadPlayerId].respawnTimes > 0) this._createRespawnView();
					else this._createAngelSnakeView();
				} else {
					// 視聴者リスポーンボタン表示
					if (this.stateManager.playerList[deadPlayerId].respawnTimes > 0) this._createRespawnView();
					else this._createUnableRespawnView();
				}
			}
		}
	}

	modifyBroadcasterAngelSnake(): void {
		const angelSnake = this.stateManager.playerList[this.stateManager.broadcaster.id].snake;
		angelSnake.head.body._surface = g.SurfaceUtil.asSurface(this.assets[`snake${angelSnake.snakeType}_head_death`] as g.ImageAsset);
		angelSnake.head.opacity = 0.5;
		angelSnake.head.body.invalidate();
		angelSnake.segments.forEach(seg => {
			seg.body._surface = g.SurfaceUtil.asSurface(this.assets.snake_body_death as g.ImageAsset);
			seg.opacity = 0.5;
			seg.body.invalidate();
		});
	}

	switchGoldenSnake(ownerId: string, stolenPlayerId: string): void {
		if (!this.stateManager.playerList[ownerId].snake) return;
		if (stolenPlayerId != null){
			const stolenSnake = this.stateManager.playerList[stolenPlayerId].snake;
			stolenSnake.head.body._surface =
				g.SurfaceUtil.asSurface(this.assets[`snake${stolenSnake.snakeType}_head_alive`] as g.ImageAsset);
			stolenSnake.head.body.invalidate();
			stolenSnake.segments.forEach(seg => {
				if (seg.type === SnakeSegmentType.Jewel) return;
				seg.body._surface = g.SurfaceUtil.asSurface(this.assets[`snake${stolenSnake.snakeType}_body`] as g.ImageAsset);
				seg.body.invalidate();
			});
		}
		const jewelOwnerSnake = this.stateManager.playerList[ownerId].snake;
		jewelOwnerSnake.head.body._surface =
			g.SurfaceUtil.asSurface(this.assets[`snake${jewelOwnerSnake.snakeType}_head_gold`] as g.ImageAsset);
		jewelOwnerSnake.head.body.invalidate();
		jewelOwnerSnake.segments.forEach(seg => {
			if (seg.type === SnakeSegmentType.Jewel) return;
			seg.body._surface = g.SurfaceUtil.asSurface(this.assets.snake_body_gold as g.ImageAsset);
			seg.body.invalidate();
		});

		// お宝ゲット通知
		const jewelNotice = this._createNotice(NoticeType.Jewel, ownerId);
		this._addNotice(jewelNotice);

		// お宝ゲットポップアップ/SE再生
		if (
			ownerId === g.game.selfId ||
			(this._isAudience(g.game.selfId) && ownerId === this.stateManager.broadcaster.id)
		){
			this.stateManager.playAudioAtParamVolume(AudioType.Jewel);
			this.timeline.create(this.localParameter.jewelPop)
				.moveBy(0, -120, 200).con().fadeIn(150)
				.wait(1000)
				.moveBy(0, 120, 200).con().fadeOut(150);
		}
	}

	rewriteRanking(rankingAccountData: AccountData[]): void {
		// 初期化（5人未満になった場合などにランキングがおかしくなるのを避ける）
		this.localParameter.topPlayerLabelList.forEach(label => {
			label.hide();
		});
		const numRanks = Math.min(rankingAccountData.length, 5);
		for (let rank = 0; rank < numRanks; ++rank) {
			const name = clampString(rankingAccountData[rank].name, 10, "…");
			const label = this.localParameter.topPlayerLabelList[rank];
			if (label.text !== name) {
				label.text = name;
				label.invalidate();
			}
			label.show();
		}
		let broadcasterRank = -1;
		rankingAccountData.forEach((account, i) => {
			if (broadcasterRank !== -1) return;
			if (account.id === this.stateManager.broadcaster.id) broadcasterRank = i;
		});
		this.localParameter.broadcasterRankLabel.text = (broadcasterRank !== -1) ? `${broadcasterRank + 1}` : "-";
		this.localParameter.broadcasterRankLabel.invalidate();

		if (
			!this.stateManager.isBroadcaster &&
			!!this.stateManager.playerList[g.game.selfId]
		){
			let yourRank = -1;
			rankingAccountData.forEach((account, i) => {
				if (yourRank!==-1) return;
				if (account.id === g.game.selfId) yourRank = i;
			});
			const yourRankLabel = this.localParameter.yourRankLabel;
			const yourRankText = (yourRank !== -1) ? `${yourRank + 1}` : "-";
			if (yourRankLabel.text !== yourRankText) {
				yourRankLabel.text = yourRankText;
				yourRankLabel.invalidate();
			}
		}
	}

	rewriteTime(remainTime: number): void {
		if (!this.stateManager.sessionParameter.config.time.isTimeBased) return;
		this.localParameter.remainTime = remainTime;
		this.localParameter.timePanel.updateTime(remainTime);
	}

	showCountDown(countDownType: CountDownType): void {
		let countDownAsset: g.ImageAsset;
		switch (countDownType){
		case CountDownType.Start:
			this.stateManager.playAudioAtParamVolume(AudioType.Start);
			countDownAsset = (this.assets.main_count_start as g.ImageAsset);
			break;
		case CountDownType.Three:
			this.stateManager.playAudioAtParamVolume(AudioType.Count);
			countDownAsset = (this.assets.main_count_3 as g.ImageAsset);
			break;
		case CountDownType.Two:
			this.stateManager.playAudioAtParamVolume(AudioType.Count);
			countDownAsset = (this.assets.main_count_2 as g.ImageAsset);
			break;
		case CountDownType.One:
			this.stateManager.playAudioAtParamVolume(AudioType.Count);
			countDownAsset = (this.assets.main_count_1 as g.ImageAsset);
			break;
		default:
			// do nothing
		}

		const countDown = new g.Sprite({
			scene: this,
			src: countDownAsset,
			x: g.game.width / 2,
			y: g.game.height / 2,
			anchorX: 0.5,
			anchorY: 0.5,
			opacity: 0.0
		});
		this.userFollowingLayer.append(countDown);
		this.timeline.create(countDown).fadeIn(450, Easing.easeInExpo).wait(500).call(() => {
			this.userFollowingLayer.remove(countDown);
			if (!countDown.destroyed()) countDown.destroy();
		});
	}

	showFinishView(): void {
		this.stateManager.playAudioAtParamVolume(AudioType.Finish);

		const countDown = new g.Sprite({
			scene: this,
			src: (this.assets.main_count_finish as g.ImageAsset),
			x: g.game.width / 2,
			y: g.game.height / 2,
			anchorX: 0.5,
			anchorY: 0.5,
			opacity: 0.0
		});
		this.userFollowingLayer.append(countDown);
		this.timeline.create(countDown).fadeIn(450, Easing.easeInExpo);

		// リスポーンボタンが表示されていたら消す
		if (this.localParameter.respawnButton != null){
			this.localParameter.respawnButton.destroy();
			this.localParameter.respawnButton = null;
		}
	}

	showBroadcasterDisplayViewing(): void {
		if (
			this.stateManager.isBroadcaster ||
			this.stateManager.isGameOver
		) return;
		const panel = new g.Sprite({
			scene: this,
			src: (this.assets.main_deathpop as g.ImageAsset),
			x: g.game.width / 2,
			y: g.game.height / 2,
			anchorX: 0.5,
			anchorY: 0.5,
			opacity: 0.0
		});
		this.userFollowingLayer.append(panel);
		this.timeline.create(panel)
			.fadeIn(450, Easing.easeInExpo)
			.wait(2000)
			.fadeOut(450)
			.call(() => {
				if (!panel.destroyed()){
					this.remove(panel);
					panel.destroy();
				}
			});
	}

	_updateScene(): void {
		Object.keys(this.stateManager.playerList).forEach(playerId => {
			if (
				!this.stateManager.playerList[playerId] ||
				!this.stateManager.playerList[playerId].camera ||
				!this.stateManager.playerList[playerId].snake
			) return;

			const snake = this.stateManager.playerList[playerId].snake;
			const state = this.stateManager.playerList[playerId].uiState.state;

			if (checkStateRole(this.stateManager.playerList[playerId].state, StateRoleType.CanMoveType)) {
				// スネークの向き調整　サーバーインスタンスでのみ実行
				this._manageSnakeHeadOnServerInstance(playerId, snake, state);

				// スネークの移動
				this._updateSnake(playerId, snake, state);
			}

			// カメラの追従
			const playerCamera = this.stateManager.playerList[playerId].camera;
			if (!playerCamera) {
				console.log("camera not found! id:", playerId);
				return;
			}

			playerCamera.x = snake.head.x - g.game.width / 2;
			playerCamera.y = snake.head.y - g.game.height / 2;
			playerCamera.modified();

			// タッチレイヤーの追従
			if (playerId === g.game.selfId) {
				this.userFollowingLayer.x = playerCamera.x;
				this.userFollowingLayer.y = playerCamera.y;
				this.userFollowingLayer.modified();
			}

			if (this.stateManager.userNameLabels[playerId].visible()){
				this.stateManager.userNameLabels[playerId].x = snake.head.x - 150 - this.userFollowingLayer.x;
				this.stateManager.userNameLabels[playerId].y = snake.head.y - 100 - this.userFollowingLayer.y;
				this.stateManager.userNameLabels[playerId].modified();
			}
		});

		this._updateDashGauge();
		this._updateFieldRadius();
	}

	//* * ゲーム参加者でのみ実行するupdateトリガー処理 */
	_updateInPlayer(): void {
		// ダッシュゲージ処理
		switch (this.stateManager.playerList[g.game.selfId].uiState.state) {
		case UserTouchState.onDoubleTap:
			this._checkStopDashing();
			this.localParameter.dashingGauge = Math.max(0, this.localParameter.dashingGauge - 1);
			break;
		default:
			this.localParameter.dashingGauge = Math.min(
				this.stateManager.sessionParameter.config.snake.dashingTime * g.game.fps,
				this.localParameter.dashingGauge + this.stateManager.sessionParameter.config.snake.amountDashingGaugeRecoveryPerFrame
			);
		}

		// スコアカウント、ミニマップ処理
		switch (this.stateManager.playerList[g.game.selfId].state){
		case PlayerState.playing:
			this._updateKillCount(g.game.selfId);
			this._updateLengthCount(g.game.selfId);
			this._updateMiniMap(g.game.selfId);
			break;
		case PlayerState.dead:
			this._updateKillCount(this.stateManager.broadcaster.id);
			this._updateLengthCount(this.stateManager.broadcaster.id);
			this._updateMiniMap(this.stateManager.broadcaster.id);
			break;
		case PlayerState.ghost:
			this._updateKillCount(this.stateManager.broadcaster.id);
			this._updateLengthCount(this.stateManager.broadcaster.id);
			this._updateMiniMap(this.stateManager.broadcaster.id);
			break;
		case PlayerState.invincible:
			this._updateKillCount(g.game.selfId);
			this._updateLengthCount(g.game.selfId);
			this._updateMiniMap(g.game.selfId);
			break;
		case PlayerState.staging:
			this._updateKillCount(g.game.selfId);
			this._updateLengthCount(g.game.selfId);
			this._updateMiniMap(g.game.selfId);
			break;
		default:
				// do nothing
		}
	}

	//* * サーバーインスタンスでのみ実行するupdateトリガー処理 */
	_updateInActiveInstance(): void {
		this.stateManager.checkEatenFoods(this.stage.nowWidth / 2);
		this.stateManager.checkEatenJewel();
		this.stateManager.checkSnakeCollision();
		this.stateManager.checkGameEnd();
		this.stateManager.updateRanking();
		this.stateManager.checkJewelOutsideField(this.stage.nowWidth / 2);
	}

	//* * ゲーム不参加者でのみ実行するupdateトリガー処理 */
	_updateInNonPlayer(): void {
		this._updateNonPlayerCamera();
		this._updateKillCount(this.stateManager.broadcaster.id);
		this._updateLengthCount(this.stateManager.broadcaster.id);
		this._updateMiniMap(this.stateManager.broadcaster.id);
	}

	_updateSnake(playerId: string, snake: Snake, state: UserTouchState): void {
		const deg = ((
			this.stateManager.playerList[playerId].uiState.direction /
				this.stateManager.sessionParameter.config.userInput.radianFineness
		) * 360 + 90) % 360;
		const field = { width: this.stage.nowWidth, height: this.stage.nowHeight };
		snake.update({angle: deg, state: state, field: field});
	}

	_updateDeadSnakeCamera(): void {
		Object.keys(this.stateManager.playerList).forEach(playerId => {
			if (
				playerId !== this.stateManager.broadcaster.id &&
				this.stateManager.playerList[playerId].state === PlayerState.dead
			){
				const playerCamera = this.stateManager.playerList[playerId].camera;
				if (!playerCamera) {
					console.log("camera not found! id:", playerId);
					return;
				}

				const broadcasterId = this.stateManager.broadcaster.id;
				if (!!this.stateManager.playerList[broadcasterId].snake){
					playerCamera.x = this.stateManager.playerList[broadcasterId].snake.head.x - g.game.width / 2;
					playerCamera.y = this.stateManager.playerList[broadcasterId].snake.head.y - g.game.height / 2;
					playerCamera.modified();
				}

				if (playerId === g.game.selfId) {
					this.userFollowingLayer.x = playerCamera.x;
					this.userFollowingLayer.y = playerCamera.y;
					this.userFollowingLayer.modified();
				}
			}
		});
	}

	_updateNonPlayerCamera(): void {
		const playerCamera = this.stateManager.playerList[this.stateManager.broadcaster.id].camera;
		if (!playerCamera) return;

		this.userFollowingLayer.x = playerCamera.x;
		this.userFollowingLayer.y = playerCamera.y;
		this.userFollowingLayer.modified();
	}

	_updateKillCount(targetPlayerId: string): void {
		const score = this.stateManager.playerList[targetPlayerId].killCount;
		this.localParameter.killCountPanel.updateScore(score);

		if (!this._isAudience(g.game.selfId)){
			// 放送者画面に遷移した後に、前のキル数 preKillCount が更新されてしまい、リスポーン時に誤って演出が再生されてしまうのを防ぐ PR#195
			if (score > this.localParameter.preKillCount){
				this.localParameter.killCountPanel.swell();
			}
			this.localParameter.preKillCount = score;
		}
	}

	_updateLengthCount(targetPlayerId: string): void {
		if (
			!this.stateManager.playerList[targetPlayerId].snake ||
			this.stateManager.playerList[targetPlayerId].state === PlayerState.dead
		) return;

		const score = this.stateManager.playerList[targetPlayerId].snake.words.length;
		this.localParameter.lengthCountPanel.updateScore(score);
		if (
			score > this.localParameter.preLengthCount &&
			( score % 10 === 0 || (this.localParameter.preLengthCount % 10) > (score % 10)) // 新たな score が 10の倍数を飛び越えるケースがあるため
		){
			this.localParameter.lengthCountPanel.swell();
		}
		this.localParameter.preLengthCount = score;
	}

	_updateMiniMap(targetPlayerId: string): void {
		let nowOwnerId = this.stateManager.jewelData.ownerId;
		let jewelCommonOffset: g.CommonOffset;
		if (nowOwnerId != null) {
			// お宝所有者がいる場合
			if (!checkStateRole(this.stateManager.playerList[nowOwnerId].state, StateRoleType.CanDropType)) return;
			const segments =  this.stateManager.playerList[nowOwnerId].snake.segments;
			const jewel = segments[segments.length - 1];
			if (!jewel || jewel.type !== SnakeSegmentType.Jewel) return;
			jewelCommonOffset = {
				x: jewel.x + jewel.body.x,
				y: jewel.y + jewel.body.y
			};
		} else {
			jewelCommonOffset = {
				x: this.stateManager.jewelData.jewel.jewel.x,
				y: this.stateManager.jewelData.jewel.jewel.y
			};
		}
		this.localParameter.miniMap.updateMap({
			yourPlayerInfo: this.stateManager.playerList[targetPlayerId],
			field: {
				width: this.stage.nowWidth,
				height: this.stage.nowHeight
			},
			foodList: this.stateManager.foodList,
			jewelCommonOffset: jewelCommonOffset
		});
	}

	_updateFieldRadius(): void {
		if (
			!this.stateManager.sessionParameter.config.debug ||
			!this.stateManager.sessionParameter.config.debug.skipLottery
		){
			const newPlayerCountRank = this.stateManager.dividePlayerCountIntoTiers();
			if (newPlayerCountRank > this.localParameter.playerCountRank){
				this.localParameter.playerCountRank = newPlayerCountRank;
			}
		}

		this.stage.narrowArea(
			Math.max(
				this.stage.nowWidth - 2 * this.stateManager.sessionParameter.config.field.narrowRadiusPerSec / g.game.fps,
				2 * this.stateManager.sessionParameter.config.field.radius[this.localParameter.playerCountRank]
			)
		);
	}

	_updateDashGauge(): void {
		if (!this.localParameter.dashingGaugeBar.visible()) return;
		if (
			this.localParameter.dashingGauge >= this.stateManager.sessionParameter.config.snake.dashingTime * g.game.fps &&
			this.localParameter.dashingGaugeBar.opacity === 1.0
		){
			this.timeline.create(this.localParameter.dashingGaugeBar).fadeOut(200);
		} else if (
			this.localParameter.dashingGauge < this.stateManager.sessionParameter.config.snake.dashingTime * g.game.fps &&
			this.localParameter.dashingGaugeBar.opacity === 0.0
		){
			this.timeline.create(this.localParameter.dashingGaugeBar).fadeIn(200);
		}
		this.localParameter.dashingGaugeBar.updateGauge(this.localParameter.dashingGauge / g.game.fps);
	}

	/**
	 * 定期的に実行する処理
	 */
	_setInterval(): void {
		this.setInterval(() => {
			// Foodを撒く
			if (
				Object.keys(this.stateManager.playerList)
					.filter((playerId) => {
						return checkStateRole(
							this.stateManager.playerList[playerId].state,
							StateRoleType.CanCountType
						);
					}).length > 0 &&
				this.stateManager.foodList.length <= this.stateManager.maxFoodListLength
			) {
				// 生き残ってるSnakeがいれば
				for (let i = 0; i < this.stateManager.sessionParameter.config.food.volume[this.localParameter.playerCountRank]; i++) {
					const foodAppearanceLength =
						this.stateManager.sessionParameter.config.field.radius[this.localParameter.playerCountRank] / 2;
					const food = this._createFood({
						x: g.game.random.generate() * foodAppearanceLength * 2 - foodAppearanceLength,
						y: g.game.random.generate() * foodAppearanceLength * 2 - foodAppearanceLength,
						word: this.foodChars[g.game.random.get(0, this.foodChars.length - 1)]
					});
					this.stateManager.waitingFoodList.push(food);
				}
			}
		}, this.stateManager.sessionParameter.config.food.interval);
	}

	_applyInitPlayerLayoutData(playerInitLayoutList: PlayerInitLayoutList): void {
		Object.keys(playerInitLayoutList).forEach(playerId => {
			const layoutData = playerInitLayoutList[playerId];
			this.stateManager.playerList[playerId].uiState = {
				direction: layoutData.direction,
				state: layoutData.state
			};
		});
	}

	_createRoot(): void {
		this.root = new g.E({ scene: this });
		this.append(this.root);

		this.bgLayer = new g.E({ scene: this });
		this.root.append(this.bgLayer);
		this.foodLayer = new g.E({ scene: this });
		this.root.append(this.foodLayer);
		this.snakeLayer = new g.E({ scene: this });
		this.root.append(this.snakeLayer);
		this.userFollowingLayer = new g.E({ scene: this });
		this.root.append(this.userFollowingLayer);
		this.noticeLayer = new g.E({ scene: this });
		this.userFollowingLayer.append(this.noticeLayer);
	}

	_createBackground(): void {
		this.localParameter.playerCountRank = this.stateManager.dividePlayerCountIntoTiers();

		if (
			!!this.stateManager.sessionParameter.config.debug &&
			this.stateManager.sessionParameter.config.debug.skipLottery
		) this.localParameter.playerCountRank = 0;

		const fieldRadius = this.stateManager.sessionParameter.config.field.radius[this.localParameter.playerCountRank];
		const bg = new g.FilledRect({
			scene: this,
			cssColor: "#001144",
			x: -fieldRadius * 2,
			y: -fieldRadius * 2,
			width: fieldRadius * 4,
			height: fieldRadius * 4,
			opacity: this.stateManager.sessionParameter.config.field.bgOpacity
		});
		this.bgLayer.append(bg);
		this.stage = new Field({
			scene: this,
			width: fieldRadius * 2,
			height: fieldRadius * 2,
			x: -fieldRadius,
			y: -fieldRadius,
			opacity: this.stateManager.sessionParameter.config.field.bgOpacity
		});
		this.bgLayer.append(this.stage);
	}

	_createTouchArea(): void {
		this.touchArea = new g.E({
			scene: this,
			width: g.game.width,
			height: g.game.height,
			local: true,
			touchable: true
		});
		this.userFollowingLayer.append(this.touchArea);

		this.touchArea.onPointDown.add((event) => {
			if (
				!this.stateManager.playerList[g.game.selfId] ||
				this.stateManager.playerList[g.game.selfId].preventType === PreventType.TouchState ||
				!checkStateRole(this.stateManager.playerList[g.game.selfId].state, StateRoleType.CanOperateType)
			) return;

			const doublePointDuration = this.stateManager.sessionParameter.config.userInput.doublePointDuration;
			const touchPoint: g.CommonOffset = {
				x: event.point.x - g.game.width / 2,
				y: event.point.y - g.game.height / 2
			};
			const deg = calculateRadFromPoint(touchPoint).deg;
			const userInput = this.stateManager.sessionParameter.config.userInput;
			const directionUnit = 360 / (userInput.radianFineness);
			const direction = Math.floor((deg + 180) / directionUnit);

			let touchState = UserTouchState.onPoint;
			if (g.game.age - this.localParameter.lastPointUpTime <= doublePointDuration * g.game.fps) {
				this.localParameter.startDoubleTapTime = g.game.age;
				touchState = UserTouchState.onDoubleTap;

				if (checkStateRole(this.stateManager.playerList[g.game.selfId].state, StateRoleType.CanSoundType)) {
					this.stateManager.playAudioAtParamVolume(AudioType.Dash);
				}
			}

			const message: MessageEventDataChangeUserTouchState = {
				messageType: MessageEventType.changeUserTouchState,
				messageData: {
					id: g.game.selfId,
					newDirection: direction,
					newState: touchState
				}
			};
			g.game.raiseEvent(new g.MessageEvent(message));

			if (checkStateRole(this.stateManager.playerList[g.game.selfId].state, StateRoleType.CanOperateType)) {
				this.localParameter.pointDownMarker.x = event.point.x;
				this.localParameter.pointDownMarker.y = event.point.y;
				this.localParameter.pointDownMarker.modified();
				this.localParameter.pointDownMarker.show();
			}
		});
		this.touchArea.onPointMove.add((event) => {
			if (
				!this.stateManager.playerList[g.game.selfId] ||
				this.stateManager.playerList[g.game.selfId].uiState.state === UserTouchState.onDoubleTap ||
				this.stateManager.playerList[g.game.selfId].uiState.state === UserTouchState.onHold ||
				!checkStateRole(this.stateManager.playerList[g.game.selfId].state, StateRoleType.CanOperateType)
			){
				return;
			}
			if (this.stateManager.playerList[g.game.selfId].preventType === PreventType.TouchState) return;

			const userInput = this.stateManager.sessionParameter.config.userInput;
			const degAndNorm = calculateRadFromPoint(event.startDelta);

			// 操作の移動量が大きければ移動入力と解釈する
			if (degAndNorm.norm > userInput.pointMoveDistance) {
				const currentDirection = this.stateManager.playerList[g.game.selfId].uiState.direction;
				const directionUnit = 360 / (userInput.radianFineness);
				const newDirection = Math.floor((degAndNorm.deg + 180) / directionUnit);

				if (currentDirection !== newDirection) {
					const message: MessageEventDataChangeUserTouchState = {
						messageType: MessageEventType.changeUserTouchState,
						messageData: {
							id: g.game.selfId,
							newDirection: newDirection,
							newState: UserTouchState.onPoint
						}
					};
					g.game.raiseEvent(new g.MessageEvent(message));
				}
			}
		});
		this.touchArea.onPointUp.add(() => {
			if (!this.stateManager.playerList[g.game.selfId]) return;
			if (this.stateManager.playerList[g.game.selfId].preventType === PreventType.TouchState) return;
			this.stateManager.audioAssets[AudioType.Dash].stop();
			this.localParameter.lastPointUpTime = g.game.age;
			const message: MessageEventDataChangeUserTouchState = {
				messageType: MessageEventType.changeUserTouchState,
				messageData: {
					id: g.game.selfId,
					newState: UserTouchState.noPoint
				}
			};
			g.game.raiseEvent(new g.MessageEvent(message));
			this.localParameter.pointDownMarker.hide();
		});
	}

	_createDashGaugeBar(): void {
		const dashGaugeBaseAsset = (this.assets.main_dash_base as g.ImageAsset);
		this.localParameter.dashingGaugeBar = new DashingGauge({
			scene: this,
			width: dashGaugeBaseAsset.width,
			height: dashGaugeBaseAsset.height,
			src: dashGaugeBaseAsset,
			x: g.game.width / 2,
			y: g.game.height / 2 + 80,
			anchorX: 0.5,
			anchorY: 0.5,
			opacity: 0.0,
			maxGaugeAmount:  this.stateManager.sessionParameter.config.snake.dashingTime
		});
		this.userFollowingLayer.append(this.localParameter.dashingGaugeBar);
	}

	_createUserNameLabels(): void {
		Object.keys(this.stateManager.playerList).forEach(playerId => {
			this.stateManager.userNameLabels[playerId] = new Label({
				scene: this,
				text: clampString(this.stateManager.playerList[playerId].user.name, 10, "…"),
				textColor: "white",
				font: this.stateManager.resource.font,
				fontSize: 20,
				width: 300,
				x: this.stateManager.playerList[playerId].snake.head.x - 150 - this.userFollowingLayer.x,
				y: this.stateManager.playerList[playerId].snake.head.y - 100 - this.userFollowingLayer.y,
				textAlign: "center"
			});
			this.userFollowingLayer.append(this.stateManager.userNameLabels[playerId]);
		});
	}

	_createTimeView(): void {
		if (!this.stateManager.sessionParameter.config.time.isTimeBased) return;
		const timePanelAsset = (this.assets.main_base_time as g.ImageAsset);
		this.localParameter.timePanel = new TimePanel({
			scene: this,
			width: timePanelAsset.width,
			height: timePanelAsset.height,
			x: 5,
			y: 5,
			backgroundImage: timePanelAsset,
			remainTime: this.localParameter.remainTime,
			local: true
		});
		this.userFollowingLayer.append(this.localParameter.timePanel);
	}

	_createRankingView(): void {
		const rankingPanelAsset = (this.assets.main_rank_base as g.ImageAsset);
		this.localParameter.rankingPanel = new g.Sprite({
			scene: this,
			width: rankingPanelAsset.width,
			height: rankingPanelAsset.height,
			y: 590,
			src: rankingPanelAsset,
			local: true
		});
		this.userFollowingLayer.append(this.localParameter.rankingPanel);

		for (let rank=1; rank<=5; ++rank) {
			const rankIconAsset = (this.assets[`main_rank_${rank}`] as g.ImageAsset);
			const rankIcon = new g.Sprite({
				scene: this,
				src: rankIconAsset,
				x: 55 + 361 * ((rank - 1) % 3),
				y: (608 - this.localParameter.rankingPanel.y) + 53 * Math.floor((rank - 1) / 3),
				local: true
			});
			this.localParameter.rankingPanel.append(rankIcon);

			const ranker = new Label({
				scene: this,
				text: "",
				textColor: "white",
				font: this.stateManager.resource.font,
				fontSize: 24,
				width: 24 * 12,
				x: 127 + 361 * ((rank - 1) % 3),
				y: (614 - this.localParameter.rankingPanel.y) + 53 * Math.floor((rank - 1) / 3),
				local: true
			});
			this.localParameter.topPlayerLabelList.push(ranker);
			this.localParameter.rankingPanel.append(ranker);
		}

		const rankBroadcasterIconAsset = (this.assets.main_rank_host as g.ImageAsset);
		const rankBroadcasterIcon = new g.Sprite({
			scene: this,
			src: rankBroadcasterIconAsset,
			x: 761,
			y: 661 - this.localParameter.rankingPanel.y,
			local: true
		});
		this.localParameter.rankingPanel.append(rankBroadcasterIcon);

		this.localParameter.broadcasterRankLabel = new Label({
			scene: this,
			text: "",
			textColor: "white",
			font: this.stateManager.resource.font,
			fontSize: 26,
			width: 26 * 2,
			x: 860,
			y: 667 - this.localParameter.rankingPanel.y,
			textAlign: "center",
			local: true
		});
		this.localParameter.rankingPanel.append(this.localParameter.broadcasterRankLabel);

		if (!this.stateManager.isBroadcaster){
			const rankYouIconAsset = (this.assets.main_rank_you as g.ImageAsset);
			const rankYouIcon = new g.Sprite({
				scene: this,
				src: rankYouIconAsset,
				x: 968,
				y: 661 - this.localParameter.rankingPanel.y,
				local: true
			});
			this.localParameter.rankingPanel.append(rankYouIcon);

			this.localParameter.yourRankLabel = new Label({
				scene: this,
				text: "-",
				textColor: "white",
				font: this.stateManager.resource.font,
				fontSize: 26,
				width: 26 * 2,
				x: 1049,
				y: 667 - this.localParameter.rankingPanel.y,
				textAlign: "center",
				local: true
			});
			this.localParameter.rankingPanel.append(this.localParameter.yourRankLabel);
		}

		this._createRankingButton();
	}

	_createRankingButton(): void {
		const rankingButtonOffAsset = (this.assets.main_btn_rank_off as g.ImageAsset);
		const rankingButtonOffTappedAsset = (this.assets.main_btn_rank_off_diff as g.ImageAsset);
		const rankingButtonOnAsset = (this.assets.main_btn_rank_on as g.ImageAsset);
		const rankingButtonOnTappedAsset = (this.assets.main_btn_rank_on_diff as g.ImageAsset);
		const rankingButton = new g.Sprite({
			scene: this,
			src: rankingButtonOffAsset,
			x: 1127,
			y: 560,
			touchable: true,
			local: true,
			tag: ButtonState.Off
		});
		rankingButton.onPointDown.add(() => {
			this.stateManager.playAudioAtParamVolume(AudioType.Select);

			switch (rankingButton.tag){
			case ButtonState.Off:
				rankingButton._surface = g.SurfaceUtil.asSurface(rankingButtonOffTappedAsset);
				rankingButton.invalidate();
				break;
			case ButtonState.On:
				rankingButton._surface = g.SurfaceUtil.asSurface(rankingButtonOnTappedAsset);
				rankingButton.invalidate();
				break;
			default:
				// do nothing
			}
		});
		rankingButton.onPointUp.add(() => {
			switch (rankingButton.tag){
			case ButtonState.Off:
				this.localParameter.rankingPanel.hide();
				rankingButton.tag = ButtonState.On;
				rankingButton._surface = g.SurfaceUtil.asSurface(rankingButtonOnAsset);
				rankingButton.invalidate();
				break;
			case ButtonState.On:
				this.localParameter.rankingPanel.show();
				rankingButton.tag = ButtonState.Off;
				rankingButton._surface = g.SurfaceUtil.asSurface(rankingButtonOffAsset);
				rankingButton.invalidate();
				break;
			default:
				// do nothing
			}
		});
		this.userFollowingLayer.append(rankingButton);
	}

	_createScoreView(): void {
		const killCountPanelAsset = (this.assets.main_base_kill as g.ImageAsset);
		this.localParameter.killCountPanel = new ScorePanel({
			scene: this,
			width: killCountPanelAsset.width,
			height: killCountPanelAsset.height,
			x: 197,
			y: 5,
			backgroundImage: killCountPanelAsset,
			score: 0,
			local: true
		});
		this.userFollowingLayer.append(this.localParameter.killCountPanel);

		const lengthCountPanelAsset = (this.assets.main_base_length as g.ImageAsset);
		this.localParameter.lengthCountPanel = new ScorePanel({
			scene: this,
			width: lengthCountPanelAsset.width,
			height: lengthCountPanelAsset.height,
			x: 447,
			y: 5,
			backgroundImage: lengthCountPanelAsset,
			score: 0,
			local: true
		});
		this.userFollowingLayer.append(this.localParameter.lengthCountPanel);
	}

	_createBroadcasterDisplayView(): void {
		this.localParameter.broadcasterDisplayViewing = new g.Label({
			scene: this,
			font: this.stateManager.resource.font,
			textColor: "white",
			fontSize: 54,
			text: "放送者画面視聴中…",
			textAlign: "center",
			x: g.game.width / 2,
			y: 80,
			anchorX: 0.5,
			anchorY: 0.0,
			hidden: !this._isAudience(g.game.selfId)
		});
		this.userFollowingLayer.append(this.localParameter.broadcasterDisplayViewing);
	}

	_createMiniMapView(): void {
		const miniMapBaseAsset = (this.assets.main_map_base as g.ImageAsset);
		this.localParameter.miniMap = new MiniMap({
			scene: this,
			width: miniMapBaseAsset.width,
			height: miniMapBaseAsset.height,
			x: 1063,
			y: 5,
			field: {
				width: this.stage.nowWidth,
				height: this.stage.nowHeight
			},
			backgroundImage: miniMapBaseAsset,
			local: true
		});
		this.userFollowingLayer.append(this.localParameter.miniMap);
	}

	_createPointdownView(): void {
		const baseAsset = (this.assets.field_base as g.ImageAsset);
		this.localParameter.pointDownMarker = new g.Sprite({
			scene: this,
			src: baseAsset,
			opacity: 0.5,
			anchorX: 0.5,
			anchorY: 0.5,
			hidden: true,
			local: true
		});
		this.userFollowingLayer.append(this.localParameter.pointDownMarker);
	}

	_playBGM(): void {
		// BGM再生
		this.stateManager.audioAssets[AudioType.GameBGM] = (this.assets.snake_bgm as g.AudioAsset);
		this.stateManager.playAudioAtParamVolume(AudioType.GameBGM);
	}

	_setSE(): void {
		this.stateManager.audioAssets[AudioType.Count] = (this.assets.SE_count as g.AudioAsset);
		this.stateManager.audioAssets[AudioType.Start] = (this.assets.SE_start as g.AudioAsset);
		this.stateManager.audioAssets[AudioType.Finish] = (this.assets.SE_finish as g.AudioAsset);
		this.stateManager.audioAssets[AudioType.Collision] = (this.assets.SE_collision as g.AudioAsset);
		this.stateManager.audioAssets[AudioType.Dash] = (this.assets.SE_dash as g.AudioAsset);
		this.stateManager.audioAssets[AudioType.Jewel] = (this.assets.SE_jewel as g.AudioAsset);
		this.stateManager.audioAssets[AudioType.Select] = (this.assets.SE_select as g.AudioAsset);
	}

	_createRespawnView(): void {
		const respawnButtonOffAsset = (this.assets.main_btn_spawn_off as g.ImageAsset);
		const respawnButtonOnAsset = (this.assets.main_btn_spawn_on as g.ImageAsset);
		this.localParameter.respawnButton = new g.Sprite({
			scene: this,
			src: respawnButtonOffAsset,
			width: respawnButtonOffAsset.width,
			height: respawnButtonOffAsset.height,
			x: 30, // デザイン仕様
			y: 460, // デザイン仕様
			local: true,
			touchable: true
		});
		this.localParameter.respawnButton.onPointDown.add(() => {
			this.localParameter.respawnButton._surface = g.SurfaceUtil.asSurface(respawnButtonOnAsset);
			this.localParameter.respawnButton.invalidate();
		});
		this.localParameter.respawnButton.onPointUp.add(() => {
			this.localParameter.respawnButton._surface = g.SurfaceUtil.asSurface(respawnButtonOffAsset);
			this.localParameter.respawnButton.touchable = false; // 二度押し防止
			this.localParameter.respawnButton.invalidate();
			if (!this.stateManager.playerList[g.game.selfId].snake){
				const respawnMessage: MessageEventDataRespawnSnake = {
					messageType: MessageEventType.respawnSnake,
				};
				g.game.raiseEvent(new g.MessageEvent(respawnMessage));

				const preventTouchMessage: MessageEventDataPreventUsertouch = {
					messageType: MessageEventType.preventUsertouch,
					messageData: {
						playerId: g.game.selfId,
						preventType: PreventType.TouchState
					}
				};
				g.game.raiseEvent(new g.MessageEvent(preventTouchMessage));
			}
		});
		this.userFollowingLayer.append(this.localParameter.respawnButton);
	}

	_createAngelSnakeView(): void {
		const respawnButtonOffAsset = (this.assets.main_btn_spawn_off_angel as g.ImageAsset);
		const respawnButtonOnAsset = (this.assets.main_btn_spawn_on_angel as g.ImageAsset);
		this.localParameter.respawnButton = new g.Sprite({
			scene: this,
			src: respawnButtonOffAsset,
			width: respawnButtonOffAsset.width,
			height: respawnButtonOffAsset.height,
			x: 30, // デザイン仕様
			y: 460, // デザイン仕様
			local: true,
			touchable: true
		});
		this.localParameter.respawnButton.onPointDown.add(() => {
			this.localParameter.respawnButton._surface = g.SurfaceUtil.asSurface(respawnButtonOnAsset);
			this.localParameter.respawnButton.invalidate();
		});
		this.localParameter.respawnButton.onPointUp.add(() => {
			this.localParameter.respawnButton._surface = g.SurfaceUtil.asSurface(respawnButtonOffAsset);
			this.localParameter.respawnButton.invalidate();
			if (!this.stateManager.playerList[g.game.selfId].snake){
				const message: MessageEventDataRespawnAngelSnake = {
					messageType: MessageEventType.respawnBroadcasterAngelSnake,
				};
				g.game.raiseEvent(new g.MessageEvent(message));
			}
		});
		this.userFollowingLayer.append(this.localParameter.respawnButton);
	}

	_createUnableRespawnView(): void {
		const unableRespawnButtonAsset = (this.assets.main_btn_spawn_unable as g.ImageAsset);
		this.localParameter.respawnButton = new g.Sprite({
			scene: this,
			src: unableRespawnButtonAsset,
			width: unableRespawnButtonAsset.width,
			height: unableRespawnButtonAsset.height,
			x: 30, // デザイン仕様
			y: 460, // デザイン仕様
			local: true
		});
		this.userFollowingLayer.append(this.localParameter.respawnButton);
	}

	_createNotice(noticeType: NoticeType, playerId?: string): PopupNotice {
		const notice = new PopupNotice({
			scene: this,
			width: 428,
			height: 40,
			x: 848,
			y: 528,
			opacity: 0,
			noticeType: noticeType,
			font: this.stateManager.resource.font,
			name: (noticeType === NoticeType.Chance) ? "" : this.stateManager.playerList[playerId].user.name,
			local: true
		});
		this.noticeLayer.append(notice);
		return notice;
	}

	_addNotice(newNotice: PopupNotice): void {
		// noticeList := [0-> fadeIn] [1] [2] [3] [4] [5] [6-> fadeOut] [7:Wait for it to be destroyed]
		this.localParameter.noticeList.unshift(newNotice);
		if (this.localParameter.noticeList.length === 8){
			const outdatedNotice = this.localParameter.noticeList.pop();
			this.noticeLayer.remove(outdatedNotice);
			if (!outdatedNotice.destroyed())outdatedNotice.destroy();
		}
		this.localParameter.noticeList.forEach((notice, i) => {
			if (i===0)notice.fadeInUp();
			else if (i===6)notice.fadeOutUp();
			else notice.up(i);
		});
	}

	_createDebugView(): void {
		const label = new Label({
			scene: this,
			font: this.stateManager.resource.font,
			text: "デバッグ中...",
			textColor: "red",
			fontSize: 36,
			width: 280,
		});
		this.userFollowingLayer.append(label);

		const downPlayerCountRankLabel = new Label({
			scene: this,
			font: this.stateManager.resource.font,
			text: "縮小",
			textColor: "white",
			fontSize: 36,
			width: 280,
			y: 70,
			touchable: true
		});
		downPlayerCountRankLabel.onPointUp.add(() => {
			this.localParameter.playerCountRank = Math.min(4, this.localParameter.playerCountRank + 1);
		});
		this.userFollowingLayer.append(downPlayerCountRankLabel);
	}

	_createTmpSnake(playerId: string, layoutData: InitPlayerLayoutData): Snake {
		const words = stringToArray(layoutData.name)
			.slice(0, Math.min(layoutData.name.length, this.stateManager.sessionParameter.config.snake.maxNameLength));
		if (words.length < this.stateManager.sessionParameter.config.snake.maxNameLength) {
			const blankCount = this.stateManager.sessionParameter.config.snake.maxNameLength - words.length;
			for (let i = 0; i < blankCount; ++i) words.push("　");
		}

		const snake = new Snake({
			parent: this.snakeLayer,
			x: layoutData.position.x,
			y: layoutData.position.y,
			angle: (
				layoutData.direction / this.stateManager.sessionParameter.config.userInput.radianFineness
			) * 360,
			words: words,
			snakeBaseSpeed: this.stateManager.sessionParameter.config.snake.baseSpeed,
			snakeMaxSpeedScale: this.stateManager.sessionParameter.config.snake.maxSpeedScale,
			snakeMaxKnotLength: this.stateManager.sessionParameter.config.snake.maxKnotLength,
			font: this.stateManager.resource.font,
			snakeType: this.stateManager.playerList[playerId].snakeType,
			rebornEffect: false
		});
		return snake;
	}

	_createPlayersSnakes(playerInitLayoutList: PlayerInitLayoutList): void {
		Object.keys(playerInitLayoutList).forEach(playerId => {
			const tmpSnake = this._createTmpSnake(playerId, playerInitLayoutList[playerId]);
			this.stateManager.setCameraAndSnake(playerId, tmpSnake);
		});
		// ゲーム不参加者の場合
		if (!!g.game.selfId && !this.stateManager.playerList[g.game.selfId]){
			g.game.focusingCamera = this.stateManager.playerList[this.stateManager.broadcaster.id].camera;
		}
	}

	_checkStopDashing(): void{
		const dashingTime = this.stateManager.sessionParameter.config.snake.dashingTime;
		if (
			this.localParameter.dashingGauge <= 0 ||
			(g.game.age - this.localParameter.startDoubleTapTime) > dashingTime * g.game.fps
		){
			this.stateManager.audioAssets[AudioType.Dash].stop();
			const message: MessageEventDataChangeUserTouchState = {
				messageType: MessageEventType.changeUserTouchState,
				messageData: {
					id: g.game.selfId,
					newState: UserTouchState.onHold
				}
			};
			g.game.raiseEvent(new g.MessageEvent(message));
		}
	}

	_snakeDestructionEventFlow(deadPlayerId: string): void {
		if (
			this.stateManager.isGameOver ||
			deadPlayerId === this.stateManager.broadcaster.id
		) {
			const message: MessageEventDataDestroySnake = {
				messageType: MessageEventType.destroySnake,
				messageData: {
					deadPlayerId: deadPlayerId
				}
			};
			g.game.raiseEvent(new g.MessageEvent(message));
		} else {
			// 「放送者画面に切り替わります」表示
			const message: MessageEventDataAnimation = {
				messageType: MessageEventType.animation,
				messageData: {
					animationType: AnimationType.ToBroadcasterView,
					scope: ScopeType.One,
					playerId: deadPlayerId
				}
			};
			g.game.raiseEvent(new g.MessageEvent(message));

			this.setTimeout(() => {
				const message: MessageEventDataDestroySnake = {
					messageType: MessageEventType.destroySnake,
					messageData: {
						deadPlayerId: deadPlayerId
					}
				};
				g.game.raiseEvent(new g.MessageEvent(message));
			}, 3000);
		}
	}

	_manageSnakeHeadOnServerInstance(playerId: string, snake: Snake, state: UserTouchState): void {
		if (
			g.game.isActiveInstance() &&
			Math.pow(snake.head.x, 2) + Math.pow(snake.head.y, 2) >= Math.pow(this.stage.nowWidth / 2, 2)
		){
			// 壁沿い走行時は自動でスネークの顔の向きが変わるため、PlayerList#uiState#directionも更新する
			this._adjustSnakeHeadAlongWall(playerId, snake.head.angle + 90, state);
		}
	}

	_adjustSnakeHeadAlongWall(playerId: string, angle: number, state: UserTouchState): void {
		const radianFineness = this.stateManager.sessionParameter.config.userInput.radianFineness;
		const currentDirection = this.stateManager.playerList[playerId].uiState.direction;
		const directionUnit = 360 / radianFineness;
		const newDirection = Math.floor((angle + 180) / directionUnit) % radianFineness;

		if (currentDirection !== newDirection) {
			const message: MessageEventDataChangeUserTouchState = {
				messageType: MessageEventType.changeUserTouchState,
				messageData: {
					id: playerId,
					newDirection: newDirection,
					newState: state,
					canPlaySE: false
				}
			};
			g.game.raiseEvent(new g.MessageEvent(message));
		}
	}

	_createFood(foodElement: FoodElement): Food {
		const food = new Food({
			parent: this.foodLayer,
			x: foodElement.x,
			y: foodElement.y,
			font: this.stateManager.resource.font,
			word: foodElement.word
		});
		return food;
	}

	_initJewel(): void {
		const playerCountRank = this.stateManager.dividePlayerCountIntoTiers();
		const fieldRadius = this.stateManager.sessionParameter.config.field.radius[playerCountRank] - 50;
		const lengthOfSquareInField = Math.floor(fieldRadius / Math.sqrt(2)) * 2;
		const jewel = this._createJewel({
			x: g.game.random.generate() * lengthOfSquareInField - lengthOfSquareInField / 2,
			y: g.game.random.generate() * lengthOfSquareInField - lengthOfSquareInField / 2
		});
		this.stateManager.jewelData = {
			jewel: jewel,
			ownerId: null // 落ちている時は、所有者はいない
		};

		const jewelPopAsset = (this.assets.main_jewel_pop as g.ImageAsset);
		this.localParameter.jewelPop = new g.Sprite({
			scene: this,
			src: jewelPopAsset,
			x: g.game.width / 2,
			y: g.game.height / 2,
			anchorX: 0.5,
			anchorY: 0.5,
			opacity: 0.0
		});
		this.userFollowingLayer.append(this.localParameter.jewelPop);
	}

	_createJewel(jewelElement: g.CommonOffset): Jewel {
		const jewel = new Jewel({
			parent: this.snakeLayer,
			x: jewelElement.x,
			y: jewelElement.y
		});
		return jewel;
	}

	_isAudience(playerId: string): boolean {
		return (
			!!playerId &&
			(
				!this.stateManager.playerList[playerId] ||
				(
					playerId !== this.stateManager.broadcaster.id &&
					!!this.stateManager.playerList[playerId] &&
					checkStateRole(this.stateManager.playerList[playerId].state, StateRoleType.IsAudienceType)
				)
			)
		);
	}

	_stopAllAudio(): void {
		Object.keys(this.stateManager.audioAssets).forEach(audioType => {
			this.stateManager.audioAssets[audioType].stop();
		});
	}

	_dropSnakeBody(deadPlayerId: string): void {
		if (
			!!this.stateManager.playerList[deadPlayerId] &&
			!!this.stateManager.playerList[deadPlayerId].snake &&
			checkStateRole(this.stateManager.playerList[deadPlayerId].state, StateRoleType.CanDropType)
		){
			const deadSnake = this.stateManager.playerList[deadPlayerId].snake;
			// 節をエサとして落とす
			deadSnake.segments.forEach(seg => {
				if (seg.type === SnakeSegmentType.Jewel) return;
				const food = this._createFood({
					x: seg.x + seg.body.x + seg.body.width / 2,
					y: seg.y + seg.body.y + seg.body.height / 2,
					word: seg.word
				});
				this.stateManager.waitingFoodList.push(food);
			});

			// お宝を落とす
			if (deadSnake.haveJewel) {
				const jewel = this._createJewel({
					x: deadSnake.segments[deadSnake.segments.length - 1].x + deadSnake.segments[deadSnake.segments.length - 1].body.x,
					y: deadSnake.segments[deadSnake.segments.length - 1].y + deadSnake.segments[deadSnake.segments.length - 1].body.y
				});
				this.stateManager.jewelData = {
					jewel: jewel,
					ownerId: null // 落ちている時は、所有者はいない
				};

				// お宝チャンス通知作成
				const chanceNotice = this._createNotice(NoticeType.Chance);
				this._addNotice(chanceNotice);
			}
		}
	}
}

export enum ButtonState {
	On = "On",
	Off = "Off"
}

function calculateRadFromPoint(startDelta: g.CommonOffset): {deg: number; norm: number;} {
	const pointNorm = Math.sqrt(Math.abs(Math.pow(startDelta.x, 2) + Math.pow(startDelta.y, 2)));
	const pointDirectionFromCenterNormalized = {
		x: startDelta.x / pointNorm,
		y: startDelta.y / pointNorm
	};

	// 3時の方向から時計回りの360度でアングルを得る（x→y↓座標系）
	const deg = Math.atan2(
		- pointDirectionFromCenterNormalized.y,
		- pointDirectionFromCenterNormalized.x

	) * 180 / Math.PI;

	return {
		deg: deg,
		norm: pointNorm
	};
}
