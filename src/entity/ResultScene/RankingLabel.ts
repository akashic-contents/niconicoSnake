import { Tween } from "@akashic-extension/akashic-timeline";
import { Label } from "@akashic-extension/akashic-label";
import { clampString } from "../../commonUtils/utils";
import { ResultScene } from "../../scene/ResultScene/ResultScene";

export interface RankingLabelParameterObject extends g.PaneParameterObject {
	resultNumFont: g.BitmapFont;
	resultNumRedFont: g.BitmapFont;
	rankingPlayerIdList: {playerId: string; count: number;}[];
}

export class RankingLabel extends g.Pane {
	scene: ResultScene;
	_root: g.E;
	_resultNumFont: g.BitmapFont;
	_resultNumRedFont: g.BitmapFont;

	_rankingPlayerIdList: {playerId: string; count: number;}[];
	_scrollTween: Tween;
	_scrollTimeUnit: number;

	constructor(param: RankingLabelParameterObject){
		super(param);
		this._resultNumFont = param.resultNumFont;
		this._resultNumRedFont = param.resultNumRedFont;
		this._rankingPlayerIdList = param.rankingPlayerIdList;
		this._scrollTimeUnit = 30;
		this._scrollTween = null;
		this._init();
	}

	scroll(speedType: ScrollSpeedType = ScrollSpeedType.Normal): void {
		switch (speedType){
		case ScrollSpeedType.Normal:
			this._scrollTimeUnit = 30;
			break;
		case ScrollSpeedType.High:
			this._scrollTimeUnit = 3;
			break;
		default:
			// do nothing
		}

		const createScrollTween = (): void => {
			const moveDistance = 53 * this._rankingPlayerIdList.length + 137 - 50;
			this._scrollTween = this.scene.timeline
				.create(this._root, {loop: true})
				.wait(200 * this._scrollTimeUnit)
				.moveTo(0, -moveDistance, (moveDistance + this._root.y) * this._scrollTimeUnit)
				.call(() => {
					this._root.y = 470;
					this._root.modified();
				})
				.moveTo(0, 0, (437 - 137) * this._scrollTimeUnit);
		};

		if (this._scrollTween != null){
			this.scene.timeline.remove(this._scrollTween);
			this._scrollTween = null;
			if (this._root.y > 0 && this._root.y <= 470){
				// 一通り表示が終わり、下から名前が上がってきている間に速度変更した場合
				this._scrollTween = this.scene.timeline
					.create(this._root)
					.moveTo(0, 0, (300 * this._root.y / 470) * this._scrollTimeUnit)
					.call(() => {
						this.scene.timeline.remove(this._scrollTween);
						this._scrollTween = null;
						createScrollTween();
					});
			} else {
				// ランキングスクロール中に速度変更した場合
				const moveDistance = 53 * this._rankingPlayerIdList.length + 137 - 50;
				this._scrollTween = this.scene.timeline
					.create(this._root)
					.moveTo(0, -moveDistance, (moveDistance + this._root.y) * this._scrollTimeUnit)
					.call(() => {
						this._root.y = 470;
						this._root.modified();
					})
					.moveTo(0, 0, (437 - 137) * this._scrollTimeUnit)
					.call(() => {
						this.scene.timeline.remove(this._scrollTween);
						this._scrollTween = null;
						createScrollTween();
					});
			}
		} else {
			createScrollTween();
		}

	}

	setInitialPosition(): void {
		this._root.x = 0;
		this._root.y = 0;
		this._root.modified();

		if (this._scrollTween != null){
			this.scene.timeline.remove(this._scrollTween);
			this._scrollTween = null;
		}
	}

	_init(): void {
		this._createRoot();
		this._createRankLabels();
		this._createRankingNames();
		this._createCountLabels();
	}

	_createRoot(): void {
		this._root = new g.E({ scene: this.scene });
		this.append(this._root);
	}

	_createRankLabels(): void {
		this._rankingPlayerIdList.forEach((_, rank) => {
			const rankLabel = new Label({
				scene: this.scene,
				text: `${rank + 1}`,
				font: (rank === 0) ? this._resultNumRedFont : this._resultNumFont,
				fontSize: 36,
				width: this._resultNumFont.defaultGlyphWidth * 3,
				x: 40, // デザイン仕様
				y: 137 - 50 + 53 * rank, // デザイン仕様
				textAlign: "right"
			});
			this._root.append(rankLabel);

			const unitLabelAsset = (this.scene.assets.result_unit_i_b as g.ImageAsset);
			const unitRedLabelAsset = (this.scene.assets.result_unit_i_r as g.ImageAsset);
			const unitLabel = new g.Sprite({
				scene: this.scene,
				src: (rank === 0) ? unitRedLabelAsset : unitLabelAsset,
				x: 278 - 151, // デザイン仕様
				y: 143 - 50 + 53 * rank, // デザイン仕様
			});
			this._root.append(unitLabel);
		});
	}

	_createRankingNames(): void {
		this._rankingPlayerIdList.forEach((data, rank) => {
			const name = clampString(this.scene.stateManager.playerList[data.playerId].user.name, 14, "…");
			const rankingName = new Label({
				scene: this.scene,
				text: `${name}`,
				textColor: "white",
				font: this.scene.stateManager.resource.font,
				fontSize: 34,
				width: 978,
				x: 359 - 151, // デザイン仕様
				y: 137 - 52 + 53 * rank  // デザイン仕様
			});
			this._root.append(rankingName);
		});
	}

	_createCountLabels(): void {
		this._rankingPlayerIdList.forEach((data, rank) => {
			const countLabel = new Label({
				scene: this.scene,
				text: `${data.count}`,
				font: (rank === 0) ? this._resultNumRedFont : this._resultNumFont,
				fontSize: 36,
				width: this._resultNumFont.defaultGlyphWidth * 3,
				x: 955 - 151, // デザイン仕様
				y: 137 - 50 + 53 * rank, // デザイン仕様
				textAlign: "right"
			});
			this._root.append(countLabel);
		});
	}
}

export enum ScrollSpeedType {
	Normal = "Normal",
	High = "High"
}
