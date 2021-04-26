import { Label } from "@akashic-extension/akashic-label";
import { Timeline } from "@akashic-extension/akashic-timeline";
import { SceneBase } from "../SceneBase";
import { StateManager, AudioType } from "../../StateManager";
import { ResultBehavior } from "./ResultBehavior";
import { clampString } from "../../commonUtils/utils";
import { MessageEventType, MessageEventDataNextRankingType, MessageEventDataScrollSpeed } from "../../types/MessageEventType";
import { resultAssetIds } from "../../assetIds";
import { RankingLabel, ScrollSpeedType } from "../../entity/ResultScene/RankingLabel";
import { ResultLogData } from "../../types/ResultLogData";

export function createResultScene(stateManager: StateManager): SceneBase {
	const assetIds = [];
	assetIds.push(...resultAssetIds);
	const resultScene = new ResultScene({
		game: g.game,
		stateManager: stateManager,
		assetIds: assetIds
	});
	return resultScene;
}

export interface ResultSceneParameterObject extends g.SceneParameterObject {
	stateManager: StateManager;
}

export class ResultScene extends SceneBase {
	stateManager: StateManager;
	timeline: Timeline;
	root: g.E;

	resultNumFont: g.BitmapFont;
	resultNumRedFont: g.BitmapFont;

	baseRanking: g.Sprite;
	showRankingType: RankingType;
	lengthRanking: g.E;
	lengthRankingLabel: RankingLabel;
	killRanking: g.E;
	killRankingLabel: RankingLabel;

	constructor(param: ResultSceneParameterObject){
		super(param);
		this.stateManager = param.stateManager;
		this.timeline = new Timeline(this);

		this.onLoad.add(() => {
			this.setBehavior(new ResultBehavior({
				scene: this,
				stateManager: this.stateManager
			}));
			this.setMessageEventListener();
			if (g.game.isActiveInstance()) this.stateManager.setupResultRanking();
		});
	}

	init(
		lengthRankingPlayerIdList:  {playerId: string; count: number;}[],
		killRankingPlayerIdList:  {playerId: string; count: number;}[],
		jewelOwnerId: string
	): void {
		this._createFont();
		this._createRoot();
		this._playBGM();
		this._createBaseRanking();
		this._createLengthRanking(lengthRankingPlayerIdList);
		this._createKillRanking(killRankingPlayerIdList);
		this._createJewelOwnerLabel(jewelOwnerId);

		if (this.stateManager.isBroadcaster){
			this._createNextButton();
			this._createBackButton();
		} else {
			this._createUnableButton();
		}

		// ログ出力
		if (g.game.isActiveInstance()){
			try {
				this._sendResultLog(
					lengthRankingPlayerIdList,
					killRankingPlayerIdList,
					jewelOwnerId
				);
			} catch (e) {
				console.error(e);
			}
		}
	}

	changeShownRankingType(nextRankingType: RankingType): void {
		switch (nextRankingType){
		case RankingType.Length:
			this.lengthRankingLabel.setInitialPosition();
			this.lengthRankingLabel.scroll();
			this.killRanking.hide();
			this.lengthRanking.show();
			this.showRankingType = RankingType.Length;
			break;
		case RankingType.Kill:
			this.killRankingLabel.setInitialPosition();
			this.killRankingLabel.scroll();
			this.lengthRanking.hide();
			this.killRanking.show();
			this.showRankingType = RankingType.Kill;
			break;
		default:
			// do nothing
		}
	}

	changeScrollSpeed(rankingType: RankingType, speedType: ScrollSpeedType): void {
		switch (rankingType){
		case RankingType.Length:
			this.lengthRankingLabel.scroll(speedType);
			break;
		case RankingType.Kill:
			this.killRankingLabel.scroll(speedType);
			break;
		default:
			// do nothing
		}
	}

	_createFont(): void {
		const resultFontGlyph = JSON.parse((this.assets.result_glyph as g.TextAsset).data);
		this.resultNumFont = new g.BitmapFont({
			src: this.assets.result_num_b as g.ImageAsset,
			map: resultFontGlyph,
			defaultGlyphWidth: 24,
			defaultGlyphHeight: 36
		});
		this.resultNumRedFont = new g.BitmapFont({
			src: this.assets.result_num_r as g.ImageAsset,
			map: resultFontGlyph,
			defaultGlyphWidth: 24,
			defaultGlyphHeight: 36
		});
	}

	_createRoot(): void {
		this.root = new g.E({ scene: this });
		this.append(this.root);
	}

	_playBGM(): void {
		this.stateManager.audioAssets[AudioType.Intro] = (this.assets.snake_result_intro as g.AudioAsset);
		this.stateManager.playAudioAtParamVolume(AudioType.Intro);

		this.setTimeout(() => {
			this.stateManager.audioAssets[AudioType.ResultBGM] = (this.assets.snake_result as g.AudioAsset);
			this.stateManager.playAudioAtParamVolume(AudioType.ResultBGM);
		}, this.stateManager.audioAssets[AudioType.Intro].duration);
	}

	_createBaseRanking(): void {
		const baseRankingAsset = (this.assets.result_base_ranking as g.ImageAsset);
		this.baseRanking = new g.Sprite({
			scene: this,
			src: baseRankingAsset,
			width: baseRankingAsset.width,
			height: baseRankingAsset.height,
			x: 151, // デザイン仕様
			y: 50,  // デザイン仕様
		});
		this.root.append(this.baseRanking);
	}

	_createLengthRanking(lengthRankingPlayerIdList: {playerId: string; count: number;}[]): void {
		this.showRankingType = RankingType.Length;
		this.lengthRanking = new g.E({ scene: this });
		this.root.append(this.lengthRanking);

		this.lengthRankingLabel = new RankingLabel({
			scene: this,
			width: 978,
			height: 470 - 14,
			x: 151, // デザイン仕様
			y: 50,  // デザイン仕様
			touchable: this.stateManager.isBroadcaster,
			resultNumFont: this.resultNumFont,
			resultNumRedFont: this.resultNumRedFont,
			rankingPlayerIdList: lengthRankingPlayerIdList
		});

		if (this.stateManager.isBroadcaster) {
			this.lengthRankingLabel.onPointDown.add(() => {
				const message: MessageEventDataScrollSpeed = {
					messageType: MessageEventType.changeScrollSpeed,
					messageData: {
						rankingType: RankingType.Length,
						speedType: ScrollSpeedType.High
					}
				};
				g.game.raiseEvent(new g.MessageEvent(message));
			});
			this.lengthRankingLabel.onPointUp.add(() => {
				const message: MessageEventDataScrollSpeed = {
					messageType: MessageEventType.changeScrollSpeed,
					messageData: {
						rankingType: RankingType.Length,
						speedType: ScrollSpeedType.Normal
					}
				};
				g.game.raiseEvent(new g.MessageEvent(message));
			});
		}
		this.lengthRanking.append(this.lengthRankingLabel);

		this.lengthRankingLabel.scroll();

		const lengthRankingTitleAsset = (this.assets.result_title_length as g.ImageAsset);
		const lengthRankingTitle = new g.Sprite({
			scene: this,
			src: lengthRankingTitleAsset,
			x: 220,
			y: 5
		});
		this.lengthRanking.append(lengthRankingTitle);
	}

	_createKillRanking(killRankingPlayerIdList: {playerId: string; count: number;}[]): void {
		this.killRanking = new g.E({ scene: this, hidden: true });
		this.root.append(this.killRanking);

		this.killRankingLabel = new RankingLabel({
			scene: this,
			width: 978,
			height: 470 - 14,
			x: 151, // デザイン仕様
			y: 50,  // デザイン仕様
			touchable: this.stateManager.isBroadcaster,
			resultNumFont: this.resultNumFont,
			resultNumRedFont: this.resultNumRedFont,
			rankingPlayerIdList: killRankingPlayerIdList
		});

		if (this.stateManager.isBroadcaster) {
			this.killRankingLabel.onPointDown.add(() => {
				const message: MessageEventDataScrollSpeed = {
					messageType: MessageEventType.changeScrollSpeed,
					messageData: {
						rankingType: RankingType.Kill,
						speedType: ScrollSpeedType.High
					}
				};
				g.game.raiseEvent(new g.MessageEvent(message));
			});
			this.killRankingLabel.onPointUp.add(() => {
				const message: MessageEventDataScrollSpeed = {
					messageType: MessageEventType.changeScrollSpeed,
					messageData: {
						rankingType: RankingType.Kill,
						speedType: ScrollSpeedType.Normal
					}
				};
				g.game.raiseEvent(new g.MessageEvent(message));
			});
		}
		this.killRanking.append(this.killRankingLabel);

		const killRankingTitleAsset = (this.assets.result_title_kill as g.ImageAsset);
		const killRankingTitle = new g.Sprite({
			scene: this,
			src: killRankingTitleAsset,
			x: 220,
			y: 5
		});
		this.killRanking.append(killRankingTitle);
	}

	_createJewelOwnerLabel(ownerId: string): void {
		const ownerBaseAsset = (this.assets.result_base_treasure as g.ImageAsset);
		const ownerBase = new g.Sprite({
			scene: this,
			src: ownerBaseAsset,
			x: 281, // デザイン仕様
			y: 530, // デザイン仕様
		});
		this.root.append(ownerBase);

		let ownerLabelText = "";
		if (ownerId == null){
			ownerLabelText += "お宝保持者はいませんでした";
		} else {
			ownerLabelText += clampString(this.stateManager.playerList[ownerId].user.name, 14, "…");
		}

		const ownerLabel = new Label({
			scene: this,
			text: ownerLabelText,
			textColor: "white",
			font: this.stateManager.resource.font,
			fontSize: 34,
			width: ownerBaseAsset.width,
			x: 281,
			y: 612,
			textAlign: "center"
		});
		this.root.append(ownerLabel);
	}

	_createNextButton(): void {
		const nextButtonOffAsset = (this.assets.result_btn_next_off as g.ImageAsset);
		const nextButtonOnAsset = (this.assets.result_btn_next_on as g.ImageAsset);
		const button = new g.Sprite({
			scene: this,
			src: nextButtonOffAsset,
			width: nextButtonOffAsset.width,
			height: nextButtonOffAsset.height,
			x: 1138,
			y: 552,
			touchable: true,
			local: true
		});
		button.onPointDown.add(() => {
			this.stateManager.playAudioAtParamVolume(AudioType.Select);
			button._surface = g.SurfaceUtil.asSurface(nextButtonOnAsset);
			button.invalidate();
		});
		button.onPointUp.add(() => {
			button._surface = g.SurfaceUtil.asSurface(nextButtonOffAsset);
			button.invalidate();
			let nextRankingType: RankingType;
			switch (this.showRankingType){
			case RankingType.Length:
				nextRankingType = RankingType.Kill;
				break;
			case RankingType.Kill:
				nextRankingType = RankingType.Length;
				break;
			default:
				// do nothing
			}

			const message: MessageEventDataNextRankingType = {
				messageType: MessageEventType.nextRankingType,
				messageData: {
					nextRankingType: nextRankingType
				}
			};
			g.game.raiseEvent(new g.MessageEvent(message));
		});
		this.root.append(button);
	}

	_createBackButton(): void {
		const backButtonOffAsset = (this.assets.result_btn_back_off as g.ImageAsset);
		const backButtonOnAsset = (this.assets.result_btn_back_on as g.ImageAsset);
		const button = new g.Sprite({
			scene: this,
			src: backButtonOffAsset,
			width: backButtonOffAsset.width,
			height: backButtonOffAsset.height,
			x: 1013,
			y: 552,
			touchable: true,
			local: true
		});
		button.onPointDown.add(() => {
			this.stateManager.playAudioAtParamVolume(AudioType.Select);
			button._surface = g.SurfaceUtil.asSurface(backButtonOnAsset);
			button.invalidate();
		});
		button.onPointUp.add(() => {
			button._surface = g.SurfaceUtil.asSurface(backButtonOffAsset);
			button.invalidate();
			let nextRankingType: RankingType;
			switch (this.showRankingType){
			case RankingType.Length:
				nextRankingType = RankingType.Kill;
				break;
			case RankingType.Kill:
				nextRankingType = RankingType.Length;
				break;
			default:
				// do nothing
			}

			const message: MessageEventDataNextRankingType = {
				messageType: MessageEventType.nextRankingType,
				messageData: {
					nextRankingType: nextRankingType
				}
			};
			g.game.raiseEvent(new g.MessageEvent(message));
		});
		this.root.append(button);
	}

	_createUnableButton(): void {
		const backButtonAsset = (this.assets.result_btn_back_off_unable as g.ImageAsset);
		const nextButtonAsset = (this.assets.result_btn_next_off_unable as g.ImageAsset);
		const backButton = new g.Sprite({
			scene: this,
			src: backButtonAsset,
			width: backButtonAsset.width,
			height: backButtonAsset.height,
			x: 1013,
			y: 552,
			local: true
		});
		this.root.append(backButton);

		const nextButton = new g.Sprite({
			scene: this,
			src: nextButtonAsset,
			width: nextButtonAsset.width,
			height: nextButtonAsset.height,
			x: 1138,
			y: 552,
			local: true
		});
		this.root.append(nextButton);
	}

	_sendResultLog(
		lengthRankingPlayerIdList:  {playerId: string; count: number;}[],
		killRankingPlayerIdList:  {playerId: string; count: number;}[],
		jewelOwnerId: string
	): void {
		const logData: ResultLogData[] = [];

		lengthRankingPlayerIdList.forEach((data, rank) => {
			const userId = data.playerId;
			const killRankingIndex = killRankingPlayerIdList.findIndex(({playerId}) => playerId === userId);

			logData.push({
				rank: rank + 1,
				userId: userId,
				score: data.count,
				params: {
					userId: userId,
					userName: this.stateManager.playerList[userId].user.name,
					isPremium: this.stateManager.playerList[userId].user.isPremium,
					lengthCount: data.count,
					lengthRank: rank + 1,
					words: this.stateManager.playerList[userId].lastWords,
					killCount: killRankingPlayerIdList[killRankingIndex].count,
					killRank: killRankingIndex + 1,
					haveJewel: (jewelOwnerId != null && userId === jewelOwnerId)
				}
			});
		});

		if (g.game.external && g.game.external.send) {
			g.game.external.send({
				type: "multi:result",
				sessionId: g.game.playId,
				data: logData
			});
		}
	}
}

export enum RankingType {
	Length = "Length",
	Kill = "Kill"
}
