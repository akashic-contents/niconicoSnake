import { Label } from "@akashic-extension/akashic-label";
import { localToGlobal } from "../utils/entityUtils";
import { OffsetGroup, OffsetGroupParameterObject } from "./OffsetGroup";

export interface FoodElement extends g.CommonOffset {
	word: string;
}

export interface FoodParameterObject extends OffsetGroupParameterObject {
	x: number;
	y: number;
	word: string;
	font: g.Font;
}

export class Food extends OffsetGroup {
	food: g.Sprite;
	wordLabel: Label;
	x: number;
	y: number;
	word: string;
	font: g.Font;

	constructor(param: FoodParameterObject) {
		super(param);



		this.font = param.font;
		this.word = param.word;
		this.x = param.x;
		this.y = param.y;
		this._init();
	}

	_init(): void {
		const foodAsset = (this.parent.scene.assets.main_feed as g.ImageAsset);
		this.food = new g.Sprite({
			scene: this.parent.scene,
			x: this.x,
			y: this.y,
			width: foodAsset.width,
			height: foodAsset.height,
			anchorX: 0.5,
			anchorY: 0.5,
			src: foodAsset
		});

		let foodOffset: g.CommonOffset; // Foodは移動しない前提で座標計算を使いまわす
		this.food.render = (renderer: g.Renderer, camera?: g.Camera) => {
			if (camera) {
				const cam = g.game.focusingCamera as g.Camera2D;
				const margin = 50;
				if (!foodOffset) foodOffset = localToGlobal(this);

				if (
					foodOffset.x >= cam.x - margin &&
					foodOffset.x <= cam.x + g.game.width + margin &&
					foodOffset.y >= cam.y - margin &&
					foodOffset.y <= cam.y + g.game.height + margin
				) {
					// do nothing
				} else {
					return; // modifiedフラグはカメラに入るまで保持する
				}
			}
			g.Sprite.prototype.render.call(this.food, renderer, camera); // ugh
		};

		this.root.append(this.food);

		// ラベルを作成。本当に作成したらtrueを返す
		const createLabel = (): boolean => {
			const camera = g.game.focusingCamera as g.Camera2D;
			const margin = 50;
			if (camera) {
				if (
					this.x >= camera.x - margin &&
					this.x <= camera.x + g.game.width + margin &&
					this.y >= camera.y - margin &&
					this.y <= camera.y + g.game.height + margin
				) {
					this.wordLabel = new Label({
						scene: this.root.scene,
						y: (foodAsset.height - 25) / 2,
						font: this.font,
						text: this.word,
						width: foodAsset.width,
						fontSize: 25,
						textColor: "black",
						textAlign: "center",
						trimMarginTop: true,
						local: true // 生成タイミングが不定になるためentity id採番に影響しないようlocal化
					});
					this.food.append(this.wordLabel);
					return true;
				}
			}
			return false;
		};
		this.root.scene.setTimeout(() => {
			if (!this.root.scene || this.root.destroyed()) return; // 消費された場合
			this.root.onUpdate.add(createLabel); // createLabel が true を返して解除
		}, 50 + Math.random() * 500);
	}
}
