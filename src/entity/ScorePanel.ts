import { Timeline, Tween, Easing } from "@akashic-extension/akashic-timeline";
import { Label } from "@akashic-extension/akashic-label";

export interface ScorePanelParameterObject extends g.EParameterObject {
	score: number;
	backgroundImage: g.ImageAsset;
}

export class ScorePanel extends g.E {
	bg: g.Sprite;
	timeline: Timeline;
	scoreFont: g.BitmapFont;
	label: Label;
	scoreUpTween: Tween;

	constructor(param: ScorePanelParameterObject){
		super(param);
		this.timeline = new Timeline(this.scene);
		this.scoreUpTween = null;
		this.bg = new g.Sprite({
			scene: param.scene,
			src: param.backgroundImage
		});
		this.append(this.bg);
		this._createLabel(param.score);
	}

	updateScore(score: number): void {
		this.label.text = `${score}`;
		this.label.invalidate();
	}

	swell(): void {
		if (this.scoreUpTween != null) return;
		this.scoreUpTween = this.timeline.create(this)
			.to({scaleY: 0.9}, 200)
			.to({scaleY: 1.25}, 400, Easing.easeOutCubic)
			.to({scaleY: 1.0}, 200, Easing.easeInExpo)
			.call(() => {
				this.timeline.remove(this.scoreUpTween);
				this.scoreUpTween = null;
			});
	}

	_createLabel(score: number): void {
		const scoreFontGlyph = JSON.parse((this.scene.assets.main_num_score_glyph as g.TextAsset).data);
		this.scoreFont = new g.BitmapFont({
			src: this.scene.assets.main_num_score as g.ImageAsset,
			map: scoreFontGlyph,
			defaultGlyphWidth: 16,
			defaultGlyphHeight: 28
		});
		this.label = new Label({
			scene: this.scene,
			text: `${score}`,
			font: this.scoreFont,
			fontSize: 28,
			width: 16 * 3,
			x: 121,
			y: 21,
			textAlign: "center"
		});
		this.append(this.label);
	}
}
