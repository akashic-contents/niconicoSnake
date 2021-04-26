import { PlayerInfo } from "../StateManager";
import { Food } from "./Food";

export interface MiniMapParameterObject extends g.PaneParameterObject {
	field: {
		width: number;
		height: number;
	};
}

export interface MiniMapUpdateParamterObject {
	yourPlayerInfo: PlayerInfo;
	field: {
		width: number;
		height: number;
	};
	foodList: Food[];
	jewelCommonOffset: g.CommonOffset;
}

/**
 * ミニマップ表示
 */
export class MiniMap extends g.Pane {
	_scale: number;
	_yourPosition: g.FilledRect;
	_foodPosition: g.FilledRect[];
	_jewelPosition: g.FilledRect;

	/**
	 * 利用されていないfoodリソース
	 */
	_unusedFoodResource: g.FilledRect[];

	constructor(param: MiniMapParameterObject) {
		super(param);
		this._scale = this.width / param.field.width;

		this._yourPosition = new g.FilledRect({
			scene: this.scene,
			cssColor: "red",
			width: 8,
			height: 8,
			local: true
		});
		this.append(this._yourPosition);

		this._jewelPosition = new g.FilledRect({
			scene: this.scene,
			cssColor: "yellow",
			width: 8,
			height: 8,
			local: true
		});
		this.append(this._jewelPosition);

		this._foodPosition = [];
		this._unusedFoodResource = [];
	}

	/**
     * 描画内容の更新
     */
	updateMap(param: MiniMapUpdateParamterObject): void {
		this._scale = this.width / param.field.width;
		this._flushFoodsAssign();
		this._updateMapSnake(param);
		this._updateMapFoods(param);
		this._updateMapJewel(param);
	}

	_updateMapSnake(param: MiniMapUpdateParamterObject): void {
		if (!param.yourPlayerInfo.snake) return;
		const snake = param.yourPlayerInfo.snake;
		this._yourPosition.x = this.width / 2 + snake.head.x * this._scale - this._yourPosition.width / 2;
		this._yourPosition.y = this.height / 2 + snake.head.y * this._scale - this._yourPosition.height / 2;
		this._ThinOutModified(this._yourPosition);
	}

	_updateMapFoods(param: MiniMapUpdateParamterObject): void {
		param.foodList.forEach(shownFood => {
			if (this._unusedFoodResource.length){
				const food = this._unusedFoodResource.pop();
				food.x = this.width / 2 + shownFood.food.x * this._scale;
				food.y = this.height / 2 + shownFood.food.y * this._scale;
				food.opacity = 1;
				this._foodPosition.push(food);
			} else {
				// 余っているリソースが無ければ新たに作る
				const food = new g.FilledRect({
					scene: this.scene,
					cssColor: "white",
					width: 2,
					height: 2,
					x: this.width / 2 + shownFood.food.x * this._scale,
					y: this.height / 2 + shownFood.food.y * this._scale,
					local: true
				});
				this._foodPosition.push(food);
				this.append(food);
			}
		});
	}

	_flushFoodsAssign(): void {
		this._foodPosition.forEach(food => {
			food.opacity = 0;
			this._ThinOutModified(food);
			this._unusedFoodResource.push(food);
		});
		this._foodPosition = [];
	}

	_updateMapJewel(param: MiniMapUpdateParamterObject): void {
		this._jewelPosition.x = this.width / 2 + param.jewelCommonOffset.x * this._scale - this._yourPosition.width / 2;
		this._jewelPosition.y = this.height / 2 + param.jewelCommonOffset.y * this._scale - this._yourPosition.height / 2;
		this._ThinOutModified(this._jewelPosition);
	}

	// 親Paneの再描画を間引く
	_ThinOutModified(entity: g.E): void {
		if (g.game.age % 2 !== 0) return;
		entity.modified();
	}
}
