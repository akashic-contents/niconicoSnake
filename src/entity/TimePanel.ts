import { Label } from "@akashic-extension/akashic-label";

export interface TimePanelParameterObject extends g.EParameterObject {
	remainTime: number;
	backgroundImage: g.ImageAsset;
}

export class TimePanel extends g.E {
	bg: g.Sprite;
	timeFont: g.BitmapFont;
	timeRedFont: g.BitmapFont;
	label: Label;

	constructor(param: TimePanelParameterObject){
		super(param);
		this.bg = new g.Sprite({
			scene: param.scene,
			src: param.backgroundImage
		});
		this.append(this.bg);
		this._createLabel(param.remainTime);
	}

	updateTime(remainTime: number): void {
		if (remainTime <= 10){
			this.label.font = this.timeRedFont;
		}
		this.label.text = `${remainTime}`;
		this.label.invalidate();
	}

	_createLabel(remainTime: number): void {
		const timeFontGlyph = JSON.parse((this.scene.assets.main_num_time_glyph as g.TextAsset).data);
		this.timeFont = new g.BitmapFont({
			src: this.scene.assets.main_num_time_c as g.ImageAsset,
			map: timeFontGlyph,
			defaultGlyphWidth: 34,
			defaultGlyphHeight: 58
		});
		this.timeRedFont = new g.BitmapFont({
			src: this.scene.assets.main_num_time_r as g.ImageAsset,
			map: timeFontGlyph,
			defaultGlyphWidth: 34,
			defaultGlyphHeight: 58
		});
		this.label = new Label({
			scene: this.scene,
			text: `${remainTime}`,
			font: this.timeFont,
			fontSize: 58,
			width: this.width,
			y: 63,
			textAlign: "center"
		});
		this.append(this.label);
	}
}
