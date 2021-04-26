import { Timeline } from "@akashic-extension/akashic-timeline";
import { Label } from "@akashic-extension/akashic-label";
import { clampString } from "../commonUtils/utils";

export interface PopupNoticeParameterObject extends g.EParameterObject {
	noticeType: NoticeType;
	font: g.Font;
	name: string;
}

export enum NoticeType {
	/**
	 * キル通知
	 */
	Kill = "Kill",

	/**
	 * お宝ゲット通知
	 */
	Jewel = "Jewel",

	/**
	 * お宝チャンス通知
	 */
	Chance = "Chance"
}

export class PopupNotice extends g.E{
	timeline: Timeline;
	font: g.Font;
	name: string;
	label: Label;

	constructor(param: PopupNoticeParameterObject){
		super(param);
		this.timeline = new Timeline(this.scene);
		this.font = param.font;
		this.name = clampString(param.name, 10, "…");

		switch (param.noticeType){
		case NoticeType.Kill:
			this._createKillNotice();
			break;
		case NoticeType.Jewel:
			this._createJewelNotice();
			break;
		case NoticeType.Chance:
			this._createChanceNotice();
			break;
		default:
			// do nothing
		}
	}

	up(nextIdx: number): void {
		this.timeline.create(this).moveTo(852, noticeY[nextIdx], 150);
	}

	fadeInUp(): void {
		this.timeline.create(this).moveTo(852, 478, 100).con().to({opacity: 0.9}, 150);
		this.timeline.create(this).wait(5000).fadeOut(150);
	}

	fadeOutUp(): void {
		this.timeline.create(this).moveTo(852, 178, 100).con().fadeOut(150);
	}

	_createKillNotice(): void {
		const killPopSpriteAsset = (this.scene.assets.main_rpop_head_kill as g.ImageAsset);
		const killPopSprite = new g.Sprite({
			scene: this.scene,
			src: killPopSpriteAsset,
			width: killPopSpriteAsset.width,
			height: killPopSpriteAsset.height,
			x: this.width - killPopSpriteAsset.width
		});
		this.append(killPopSprite);

		const nameArea = this._fillInBlanks(killPopSprite.x, this.name);
		this._createLabel(nameArea);
	}

	_createJewelNotice(): void {
		const jewelPopSpriteAsset = (this.scene.assets.main_rpop_head_jewel as g.ImageAsset);
		const jewelPopSprite = new g.Sprite({
			scene: this.scene,
			src: jewelPopSpriteAsset,
			width: jewelPopSpriteAsset.width,
			height: jewelPopSpriteAsset.height,
			x: this.width - jewelPopSpriteAsset.width
		});
		this.append(jewelPopSprite);

		const nameArea = this._fillInBlanks(jewelPopSprite.x, this.name);
		this._createLabel(nameArea);
	}

	_createChanceNotice(): void {
		const chancePopSpriteAsset = (this.scene.assets.red_rpop_head_chance as g.ImageAsset);
		const chancePopSprite = new g.Sprite({
			scene: this.scene,
			src: chancePopSpriteAsset,
			width: chancePopSpriteAsset.width,
			height: chancePopSpriteAsset.height,
			x: this.width - chancePopSpriteAsset.width
		});
		this.append(chancePopSprite);
		this._createChanceLabel(chancePopSprite.x, "フィールド上にお宝が落ちています！");
	}

	_fillInBlanks(rightX: number, name: string): {nameAreaX: number; nameAreaWidth: number;} {
		const popBodyLength = Math.ceil(this.font.measureText(name).width * 18 / (this.font.size * 40));
		const popBodySpriteAsset = (this.scene.assets.main_rpop_body as g.ImageAsset);
		for (let i = 1; i <= popBodyLength; i++){
			const body = new g.Sprite({
				scene: this.scene,
				src: popBodySpriteAsset,
				width: popBodySpriteAsset.width,
				height: popBodySpriteAsset.height,
				x: rightX - popBodySpriteAsset.width * i
			});
			this.append(body);
		}

		const popTailSpriteAsset = (this.scene.assets.main_rpop_tail as g.ImageAsset);
		const tail = new g.Sprite({
			scene: this.scene,
			src: popTailSpriteAsset,
			width: popTailSpriteAsset.width,
			height: popTailSpriteAsset.height,
			x: rightX - popBodySpriteAsset.width * popBodyLength - popTailSpriteAsset.width
		});
		this.append(tail);

		return {
			nameAreaX: rightX - popBodySpriteAsset.width * popBodyLength,
			nameAreaWidth: popBodyLength * 40
		};
	}

	_createLabel(param: {nameAreaX: number; nameAreaWidth: number;}): void {
		this.label = new Label({
			scene: this.scene,
			text: this.name,
			textColor: "white",
			font: this.font,
			fontSize: 18,
			width: param.nameAreaWidth,
			x: param.nameAreaX,
			y: 12,
			trimMarginTop: true,
			textAlign: "right"
		});
		this.append(this.label);
	}

	_createChanceLabel(rightX: number, text: string): void {
		const popBodySpriteAsset = (this.scene.assets.red_rpop_body as g.ImageAsset);
		for (let i = 1; i <= 4; i++){
			const body = new g.Sprite({
				scene: this.scene,
				src: popBodySpriteAsset,
				width: popBodySpriteAsset.width,
				height: popBodySpriteAsset.height,
				x: rightX - popBodySpriteAsset.width * i
			});
			this.append(body);
		}

		const popTailSpriteAsset = (this.scene.assets.red_rpop_tail as g.ImageAsset);
		const tail = new g.Sprite({
			scene: this.scene,
			src: popTailSpriteAsset,
			width: popTailSpriteAsset.width,
			height: popTailSpriteAsset.height,
			x: rightX - popBodySpriteAsset.width * 4 - popTailSpriteAsset.width
		});
		this.append(tail);

		this.label = new Label({
			scene: this.scene,
			text: text,
			textColor: "white",
			font: this.font,
			fontSize: 16,
			width: 8 * 40,
			x: rightX - popBodySpriteAsset.width * 4 - 56,
			y: 12,
			trimMarginTop: true,
			textAlign: "right"
		});
		this.append(this.label);
	}
}

export const noticeY = [478, 428, 378, 328, 278, 228];
