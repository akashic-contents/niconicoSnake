import { Timeline } from "@akashic-extension/akashic-timeline";

export interface WaitingTextParameterObject extends g.EParameterObject {
	font: g.Font;
}

/**
 * タイトルシーンで集計中に表示するテキスト「集計中・・・」
 */
export class WaitingText extends g.E {
	timeline: Timeline;

	constructor(params: WaitingTextParameterObject) {
		super({
			...params,
			width: g.game.width,
			height: 71
		});
		const textLabel = new g.Label({
			scene: this.scene,
			text: "集計中",
			fontSize: 70,
			textColor: "white",
			font: params.font,
			x: 498,
			y: 0
		});
		this.append(textLabel);
		this.timeline = new Timeline(this.scene);
		const duration = 500;
		this.timeline.create(this, { loop: true })
			.wait(duration)
			.call(() => {
				textLabel.text = "集計中・";
				textLabel.invalidate();
			})
			.wait(duration)
			.call(() => {
				textLabel.text = "集計中・・";
				textLabel.invalidate();
			})
			.wait(duration)
			.call(() => {
				textLabel.text = "集計中・・・";
				textLabel.invalidate();
			})
			.wait(duration)
			.call(() => {
				textLabel.text = "集計中";
				textLabel.invalidate();
			});
	}

	destroy(): void {
		this.timeline.destroy();
		super.destroy();
	}
}
