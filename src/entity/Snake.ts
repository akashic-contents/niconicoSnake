import { Timeline, Tween } from "@akashic-extension/akashic-timeline";
import { OffsetGroup, OffsetGroupParameterObject } from "./OffsetGroup";
import { UserTouchState } from "../types/UserTouchState";
import { Food } from "./Food";
import { AnimationType } from "../types/MessageEventType";
import { localToGlobal } from "../utils/entityUtils";

export interface SnakeParameterObject extends OffsetGroupParameterObject {
	/**
	 * そのSnakeがparent上で配置される座標
	 */
	x: number;
	y: number;
	words: string[];
	font: g.Font;
	angle: number;
	snakeBaseSpeed: number;
	snakeMaxSpeedScale: number;
	snakeMaxKnotLength: number;
	snakeType: SnakeType;
	rebornEffect: boolean;
	onEndRebornEffect?: () => void; // rebornEffectが真の場合のみ使用する
}

export type SnakeType = "A" | "B" | "C" | "D"| "E" | "F" | "G" | "H" | "I";

export interface SnakeUpdateParameterObject {
	angle: number;
	state: UserTouchState;
	field: {
		width: number;
		height: number;
	};
}

/**
 * Snakeクラス
 */
export class Snake extends OffsetGroup {
	headLayer: g.E;
	knotLayer: g.E;
	jewelLayer: g.E;

	effectPaneLayer: g.E;
	effectPaneBackground: g.E;
	effectPane: g.Pane;
	effectPaneBack: g.E; // Paneをsnake.headの位置に置きながらhead座標系を壊さないために、逆変換座標系を挟む

	timeline: Timeline;
	snakeType: SnakeType;
	head: SnakeSegment;
	segments: SnakeSegment[];
	positionHistory: SnakeHistoryElement[]; // 毎フレームのhead座標ログ
	historyDistanceInterval: number; // headPositionHistoryを何コマおきに座標適用するか
	angle: number;
	words: string[];
	rotateState: SnakeRotateState; // Snakeが壁伝いに進む方向
	haveJewel: boolean;
	tweens: {[key: string]: Tween;};

	/**
	 * directionにかかる速度係数
	 */
	_internalVecBaseScale: number;

	/**
	 * _internalVecBaseScaleに対して何倍まで許容されるか
	 */
	_internalVecMaxScaleByBase: number;

	/**
	 * 外部から与えられる可変速度
	 * default: 1
	 */
	_vecScale: number;

	/**
	 * 表示するスネークの最大節数
	 */
	_snakeMaxKnotLength: number;

	constructor(param: SnakeParameterObject) {
		super(param);
		this.timeline = new Timeline(this.parent.scene);
		this.snakeType = param.snakeType;
		this.segments = [];
		this.angle = param.angle;
		this._internalVecBaseScale = param.snakeBaseSpeed;
		this._internalVecMaxScaleByBase = param.snakeMaxSpeedScale;
		this._vecScale = 1;
		this._snakeMaxKnotLength = param.snakeMaxKnotLength;
		this.historyDistanceInterval = Math.round(90 / param.snakeBaseSpeed);
		this.rotateState = SnakeRotateState.noRotate;
		this.words = param.words;
		this.haveJewel = false;
		this.tweens = {};

		if (param.rebornEffect) this._initEffectLayer();
		this._initLayer();
		this._initFromParam(param);
		this._initHead(param);
		this._initBodySegments(param);
		this._applySegmentPositions();

		if (param.rebornEffect) this._initRebornEffect(param);
	}

	update(param: SnakeUpdateParameterObject): void {
		this._evolutionPositionHistory(param);
		this._applySegmentPositions();
		this._adjustHeadDirection(param.angle);
	}

	/**
	 * エサを食べる
	 */
	eatFood(food: Food): void {
		this._addKnot(food);
	}

	/**
	 * お宝を食べる
	 */
	eatJewel(): void {
		this.haveJewel = true;
		this._addJewel();
	}

	/**
	 * お宝を消す
	 */
	removeJewel(): void {
		if (!this.haveJewel) return;
		this.haveJewel = false;
		const jewel = this.segments.pop();
		if (!jewel.destroyed())jewel.destroy();
	}

	/**
	 * スネークの透過度を指定値に変更する
	 */
	modifyOpacity(opacity: number): void {
		this.head.opacity = opacity;
		this.head.modified();
		this.segments.forEach(seg => {
			seg.opacity = opacity;
			seg.modified();
		});
	}

	/**
	 * 点滅アニメーション
	 */
	blinking(): void {
		if (this.tweens[AnimationType.Blinking] != null) return;
		this.tweens[AnimationType.Blinking] = this.timeline.create(this, {loop: true})
			.wait(100)
			.call(() => this.modifyOpacity(1.0))
			.wait(100)
			.call(() => this.modifyOpacity(0.5));
	}

	/**
	 * ダッシュエフェクト
	 */
	dashing(state: UserTouchState): void {
		if (state === UserTouchState.onDoubleTap) {
			if (this.head.dashEffect.visible()) return;
			this.head.dashEffect.show();
		} else {
			if (!this.head.dashEffect.visible()) return;
			this.head.dashEffect.hide();
		}
	}

	/**
	 * 爆破エフェクト
	 */
	explosion(): void {
		const explosionAsset = this.parent.scene.assets.explosion_effect as g.ImageAsset;
		const createEffect = (x: number, y: number): void => {
			const camera = g.game.focusingCamera as g.Camera2D;
			if (!camera) return;
			const margin = 50;
			if (
				x < camera.x - margin ||
				x > camera.x + g.game.width + margin ||
				y < camera.y - margin ||
				y > camera.y + g.game.height + margin
			) return; // 画面外はエフェクトを作らない
			const effect = new g.FrameSprite({
				scene: this.parent.scene,
				src: explosionAsset,
				frames: [0, 1, 2, 3, 4, 5, 6, 7],
				width: 140,
				height: 140,
				srcWidth: 140,
				srcHeight: 140,
				loop: false,
				interval: 100,
				x: x,
				y: y,
				anchorX: 0.5,
				anchorY: 0.5,
				local: true //  生成タイミングが不定になるためentity id採番に影響しないようlocal化
			});
			effect.onFinish.add(() => {
				this.knotLayer.remove(effect);
				if (effect.destroyed())effect.destroy();
			});
			effect.start();
			this.knotLayer.append(effect);
		};

		const deathHeadAsset = this.parent.scene.assets[`snake${this.snakeType}_head_death`] as g.ImageAsset;
		this.head.body._surface = g.SurfaceUtil.asSurface(deathHeadAsset);
		this.head.body.invalidate();
		createEffect(
			this.head.x + this.head.body.x + this.head.body.width / 2,
			this.head.y + this.head.body.y + this.head.body.height / 2
		);

		this.segments.forEach((seg, i) => {
			if (seg.type === SnakeSegmentType.Jewel) {
				seg.body.hide();
				return;
			}

			this.root.scene.setTimeout(() => {
				seg.body.hide();
				if (seg.wordLabel != null) seg.wordLabel.hide();


				createEffect(
					seg.x + seg.body.x + seg.body.width / 2,
					seg.y + seg.body.y + seg.body.height / 2
				);
			}, 100 * i + 100, this);
		});
	}

	/**
	 * Tween削除
	 */
	removeTween(animationType: AnimationType): void {
		if (this.tweens[animationType] == null) return;
		this.timeline.remove(this.tweens[animationType]);
		this.tweens[animationType] = null;
	}

	_initEffectLayer(): void {
		this.effectPaneLayer = new g.E({scene: this.parent.scene});
		this.root.append(this.effectPaneLayer);

		this.effectPaneBackground = new g.E({scene: this.parent.scene});
		this.effectPaneLayer.append(this.effectPaneBackground);
		this.effectPane = new g.Pane({
			scene: this.parent.scene,
			width: 0,
			height: 200, // ユーザ名+snake headでこの程度必要
		});
		this.effectPaneLayer.append(this.effectPane);
		this.effectPaneBack = new g.E({scene: this.parent.scene});
		this.effectPane.append(this.effectPaneBack);
	}

	_clearEffectPane(): void {
		this.effectPane.width = 0;
		this.effectPane.height = 0;
		this.effectPane.destroy();
	}

	/**
	 * Layer初期化
	 */
	_initLayer(): void {
		this.knotLayer = new g.E({scene: this.parent.scene});
		this.root.append(this.knotLayer);
		this.headLayer = new g.E({scene: this.parent.scene});
		this.root.append(this.headLayer);
		this.jewelLayer = new g.E({scene: this.parent.scene});
		this.root.append(this.jewelLayer);
	}

	/**
	 * paramからそれらしいhistoryを作る
	 */
	_initFromParam(param: SnakeParameterObject): void {
		const isRightVec = param.angle === 0;

		this.positionHistory = [];
		// あたかも初期化前からheadPositionHistoryが蓄積されていたように振舞わせる
		// SegmentとSegmentの間には historyDistanceInterval フレーム数だけ間隔を設ける
		param.words.forEach((_, index) => {
			const segmentIndex = index;
			for (let i = 0; i < this.historyDistanceInterval; i++) {
				const frame = segmentIndex * this.historyDistanceInterval + i;
				this.positionHistory.push({
					x: param.x + this._internalVecBaseScale * frame * (isRightVec ? -1 : 1), // 過去の位置なので顔の向きと反対のベクトルを適用する
					y: param.y,
					angle: this.angle
				});
			}
		});
	}

	_initHead(param: SnakeParameterObject): void {
		this.head = new SnakeSegment({
			scene: this.parent.scene,
			x: param.x,
			y: param.y,
			angle: param.angle,
			assetId: `snake${this.snakeType}_head_alive`,
			type: SnakeSegmentType.Head
		});
		this.headLayer.append(this.head);
	}

	_initBodySegments(param: SnakeParameterObject): void {
		const revWords = param.words.slice();
		revWords.reverse();
		revWords.forEach((word) => {
			const segment = new SnakeSegment({
				scene: this.parent.scene,
				x: 0, // applyPositionsするので0で良い
				y: 0,
				angle: param.angle,
				assetId: `snake${this.snakeType}_body`,
				word: word,
				font: param.font,
				type: SnakeSegmentType.Knot
			});
			this.segments.unshift(segment);
			this.knotLayer.append(segment);
		});
	}

	_initRebornEffect(param: SnakeParameterObject): void {
		const isRightVec = param.angle === 0; // 右向きの初期化かどうか。真右または真左方向のみとりうるangleと仮定して扱う

		// Effect Layerの位置初期化
		if (isRightVec) {
			this.effectPane.x = this.head.x + this.head.body.x + 200;
			this.effectPane.y = this.head.y + this.head.body.y;
		} else {
			this.effectPane.x = this.head.x + this.head.body.x;
			this.effectPane.y = this.head.y + this.head.body.y;
		}

		const prevFrame = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
		const centerFrame = new Array<number>(25).fill(10);
		const postFrame = [11, 12, 13, 14, 15, 16, 17];
		const portalFrames = prevFrame.concat(centerFrame, postFrame);

		// 演出の初期化
		const portalAsset = param.parent.scene.assets.snake_reborn as g.ImageAsset;
		const portalTextAsset = param.parent.scene.assets.snake_reborn_text as g.ImageAsset;
		const portal = new g.FrameSprite({
			scene: param.parent.scene,
			src: portalAsset,
			frames: portalFrames,
			width: 468,
			height: 370,
			srcWidth: 468,
			srcHeight: 370,
			loop: false,
			interval: 100,
			scaleX: isRightVec ? -1 : 1,
			x: isRightVec ? this.effectPane.x + 380 : this.effectPane.x - 480,
			y: this.effectPane.y - 188
		});
		portal.start();
		this.effectPaneBackground.append(portal);

		const portalText = new g.Sprite({
			scene: param.parent.scene,
			src: portalTextAsset,
			x: isRightVec ? portal.x - 420 : portal.x + 300,
			y:portal.y
		});
		this.effectPaneBackground.append(portalText);

		this._drawOnPaneLayer(); // 描画をPaneに移す

		const updateHandler = (): void => {
			this._updateEffctPaneLayerPosition(isRightVec);
		};
		portal.onUpdate.add(updateHandler, this);

		param.parent.scene.setTimeout(() => {
			portal.destroy();
			portalText.destroy();
			this._drawOnNormalLayer();
			this._clearEffectPane(); // Paneをwipeする
			param.onEndRebornEffect();
		}, portalFrames.length * 100, this);
	}

	_evolutionPositionHistory(param: SnakeUpdateParameterObject): void {
		const currentHeadPositionX = this.head.x;
		const currentHeadPositionY = this.head.y;

		let vecScale = this._internalVecBaseScale;
		if (param.state === UserTouchState.onDoubleTap){
			vecScale *= this._internalVecMaxScaleByBase;
		}

		const rad = param.angle / 180 * Math.PI;
		this.head.x += Math.sin(rad) * vecScale;
		this.head.y += (- Math.cos(rad)) * vecScale;
		this.head.angle = param.angle;

		// フィールド壁判定
		this._checkFieldBoundary(currentHeadPositionX, currentHeadPositionY, rad, param.field.width, vecScale);

		this._appendNewPositionHistory(param);
	}

	/**
	 * フィールドの壁判定
	 */
	_checkFieldBoundary(
		currentHeadPositionX: number, currentHeadPositionY: number,
		rad: number, fieldWidth: number, vecScale: number
	): void {
		const limitRadius = fieldWidth / 2;
		if (Math.pow(this.head.x, 2) + Math.pow(this.head.y, 2) >= Math.pow(limitRadius, 2)) {
			let vX = 1;
			let vY = (1 - currentHeadPositionX * vX) / currentHeadPositionY;

			if (this.rotateState === SnakeRotateState.noRotate) {
				// 壁衝突時に外積を求め、回転の向きを定める
				const check = currentHeadPositionX * (- Math.cos(rad)) - currentHeadPositionY * Math.sin(rad);
				if (check > 0) this.rotateState = SnakeRotateState.onClockwise;
				else this.rotateState = SnakeRotateState.onCounterClockwise;
			}

			if ((this.head.y >= 0) && this.rotateState === SnakeRotateState.onClockwise ||
				(this.head.y <= 0) && this.rotateState === SnakeRotateState.onCounterClockwise){
				vX = -vX;
				vY = -vY;
			}

			if (this.rotateState === SnakeRotateState.onClockwise &&
				((this.head.x > 0 && this.head.y > 0 && vX < 0 && vY < 0) ||
				(this.head.x < 0 && this.head.y < 0 && vX > 0 && vY > 0))){
				vX = -vX;
				vY = -vY;
			}

			const tangentLineNorm = Math.sqrt(Math.abs(Math.pow(vX, 2) + Math.pow(vY, 2)));
			this.head.x = currentHeadPositionX + (vX / tangentLineNorm) * vecScale;
			this.head.y = currentHeadPositionY + (vY / tangentLineNorm) * vecScale;

			const norm = Math.sqrt(Math.abs(Math.pow(this.head.x, 2) + Math.pow(this.head.y, 2)));
			this.head.x -= (norm - limitRadius)/norm * this.head.x;
			this.head.y -= (norm - limitRadius)/norm * this.head.y;

			const acos = Math.acos(vX / Math.sqrt(Math.pow(vX, 2) + Math.pow(vY, 2)));
			this.head.angle = (((this.rotateState === SnakeRotateState.onClockwise) ?
				((this.head.x <= 0) ? -acos : acos) * 180 / Math.PI + 90:
				((this.head.x >= 0) ? -acos : acos) * 180 / Math.PI + 90)
				+ 360) % 360;
		} else {
			this.rotateState = SnakeRotateState.noRotate;
		}
		this.head.modified();
	}

	_appendNewPositionHistory(param: SnakeUpdateParameterObject): void {
		const currentHeadPositionX = this.head.x;
		const currentHeadPositionY = this.head.y;
		const currentHeadAngle = this.angle;

		// 先頭に新しい座標をつける
		let appendPositionHistory: SnakeHistoryElement[] = [];

		// ダッシュ中は補完フレームを増やす
		// maxSpeedScaleに応じて増やし、整数倍に限る
		if (param.state === UserTouchState.onDoubleTap
				&& !!this.positionHistory[0] && this._internalVecMaxScaleByBase > 1) {
			const diff: SnakeHistoryElement = {
				x: (currentHeadPositionX - this.positionHistory[0].x) / this._internalVecMaxScaleByBase,
				y: (currentHeadPositionY - this.positionHistory[0].y) / this._internalVecMaxScaleByBase,
				angle: (currentHeadAngle - this.positionHistory[0].angle) / this._internalVecMaxScaleByBase
			};

			for (let i = 1; i < this._internalVecMaxScaleByBase; i++) { // _internalVecMaxScaleByBase - 1回だけ追加する
				let intervalElement = {
					x: this.positionHistory[0].x + diff.x * i,
					y: this.positionHistory[0].y + diff.y * i,
					angle: this.positionHistory[0].angle + diff.angle * i
				};
				appendPositionHistory.push(intervalElement);
			}
			appendPositionHistory = appendPositionHistory.reverse();
		}

		appendPositionHistory = [{
			x: currentHeadPositionX,
			y: currentHeadPositionY,
			angle: currentHeadAngle
		}].concat(appendPositionHistory);

		this.positionHistory = appendPositionHistory.concat(this.positionHistory);

		// positionHistoryの長さを制限する
		const maxHistoryLenth = this.historyDistanceInterval * (this._snakeMaxKnotLength + 5);
		if (this.positionHistory.length > maxHistoryLenth) this.positionHistory.length = maxHistoryLenth;
	}

	_updateEffctPaneLayerPosition(isRightVec: boolean): void {
		if (isRightVec) {
			this.effectPane.width += this._internalVecBaseScale;
			this.effectPane.modified();
		} else {
			this.effectPane.x = this.head.x + this.head.body.x - 100;
			this.effectPane.width += this._internalVecBaseScale;
			this.effectPane.modified();
		}
		this.effectPane.y = this.head.y + this.head.body.y - 100;


		this.effectPaneBack.x = - this.effectPane.x;
		this.effectPaneBack.y = - this.effectPane.y;
		this.effectPaneBack.modified();
	}

	/**
	 * 現在の状態に応じてSnake全体を前に動かす
	 */
	_applySegmentPositions(): void {
		const camera = g.game.focusingCamera as g.Camera2D;
		const margin = 50;
		// 各SnakeSegmentに位置を反映する
		this.segments.forEach((segment, index) => {
			const frame = (index + 1) * this.historyDistanceInterval;
			const positionBase = this.positionHistory[frame] ? this.positionHistory[frame] : this.head;
			segment.x = positionBase.x;
			segment.y = positionBase.y;
			segment.angle = positionBase.angle;
			segment.modified();
			if (camera) {
				if (
					segment.x < camera.x - margin ||
					segment.x > camera.x + g.game.width + margin ||
					segment.y < camera.y - margin ||
					segment.y > camera.y + g.game.height + margin
				) {
					segment.hide();
				} else {
					segment.show();
				}
			}
		});
	}

	/**
	 * スネークの顔の向きを調整する
	 */
	_adjustHeadDirection(angle: number): void {
		if (angle >= 0 && angle < 180){
			this.head.scaleX = -1;
		} else {
			this.head.scaleX = 1;
		}
		this.head.modified();
	}

	/**
	 * 節の追加
	 */
	_addKnot(food: Food): void {
		this.words.push(food.word);
		const tmpSegments: SnakeSegment[] = []; // this.segments の逆順でSnakeSegmentを一時的に保持

		this.segments.forEach(seg => {
			if (seg.type !== SnakeSegmentType.Knot) return;
			if (!seg.destroyed()) {
				this.knotLayer.remove(seg);
				tmpSegments.unshift(seg);
			}
		});

		if (this.haveJewel){
			this.segments = [this.segments[this.segments.length - 1]];
		} else {
			this.segments = [];
		}

		const segment = new SnakeSegment({
			scene: this.parent.scene,
			x: 0, // applyPositionsするので0で良い
			y: 0,
			angle: this.angle,
			assetId: this.haveJewel ? "snake_body_gold" : `snake${this.snakeType}_body`,
			word: food.word,
			font: food.font,
			type: SnakeSegmentType.Knot
		});
		this.segments.unshift(segment);
		this.knotLayer.append(segment);

		tmpSegments.forEach(seg => {
			if (
				this.segments.length - (this.haveJewel ? 1 : 0) >= this._snakeMaxKnotLength &&
				seg.type === SnakeSegmentType.Knot
			) return;
			this.segments.unshift(seg);
			this.knotLayer.append(seg);
		});
	}

	/**
	 * お宝の追加
	 */
	_addJewel(): void {
		const segment = new SnakeSegment({
			scene: this.parent.scene,
			x: 0, // applyPositionsするので0で良い
			y: 0,
			angle: this.angle,
			assetId: "main_jewel_body",
			type: SnakeSegmentType.Jewel
		});
		this.segments.push(segment);
		this.jewelLayer.append(segment);
	}

	_changeDrawLayer(layer: g.E): void {
		this.head.remove();
		this.segments.forEach((segment) => {
			segment.remove();
		});

		layer.append(this.head);
		this.segments.forEach((segment) => {
			layer.append(segment);
			segment.modified();
		});
	}

	_drawOnPaneLayer(): void {
		this._changeDrawLayer(this.effectPaneBack);
	}

	_drawOnNormalLayer(): void {
		this.head.remove();
		this.segments.forEach((segment) => {
			segment.remove();
		});

		this.headLayer.append(this.head);
		this.segments.forEach((segment) => {
			this.knotLayer.append(segment);
			segment.modified();
		});
	}
}


export interface SnakeSegmentsParameterObject extends g.EParameterObject {
	assetId: string;
	type: SnakeSegmentType;
	word?: string;
	font?: g.Font;
	angle?: number;
}

/**
 * Snakeの体節単位のクラス
 */
export class SnakeSegment extends g.E {
	body: g.Sprite;
	word: string;
	wordLabel: g.Label;
	type: SnakeSegmentType;
	dashEffect: g.Sprite;

	constructor(param: SnakeSegmentsParameterObject) {
		super(param);
		this.type = param.type;
		this.word = param.word != null ? param.word : "";
		this.wordLabel = null;
		this.dashEffect = null;
		this._init(param);
	}

	render(renderer: g.Renderer, camera?: g.Camera): void {
		if (camera) {
			const cam = g.game.focusingCamera as g.Camera2D;
			const margin = 50;
			const globalOffset = localToGlobal(this); // 移動するのでキャッシュできない

			if (
				globalOffset.x >= cam.x - margin &&
				globalOffset.x <= cam.x + g.game.width + margin &&
				globalOffset.y >= cam.y - margin &&
				globalOffset.y <= cam.y + g.game.height + margin
			) {
				// do nothing
			} else {
				return; // modifiedフラグはカメラに入るまで保持する
			}
		}
		super.render(renderer, camera);
	}
	_init(param: SnakeSegmentsParameterObject): void {
		const asset = (this.scene.assets[param.assetId] as g.ImageAsset);
		this.body = new g.Sprite({
			scene: this.scene,
			src: asset,
			width: asset.width,
			height: asset.height,
			anchorX: 0.5,
			anchorY: 0.5,
			x: 0,
			y: 0
		});

		switch (param.type) {
		case SnakeSegmentType.Head:
			this.body.x += 20;
			this.body.angle = 90;
			this.append(this.body);

			const dashEffectAsset =  (this.scene.assets.main_dash_eff as g.ImageAsset);
			this.dashEffect = new g.Sprite({
				scene: this.scene,
				src: dashEffectAsset,
				width: dashEffectAsset.width,
				height: dashEffectAsset.height,
				x: 5,
				y: 55,
				anchorX: 0.5,
				anchorY: 0.5,
				angle: 90,
				hidden: true
			});
			this.append(this.dashEffect);
			break;
		case SnakeSegmentType.Knot:
			this.wordLabel = new g.Label({
				scene: this.scene,
				font: param.font,
				text: param.word,
				fontSize: 50,
				textColor: "white",
				anchorX: 0.5,
				anchorY: 0.5,
				angle: -this.angle
			});
			this.append(this.body);
			this.append(this.wordLabel);
			break;
		case SnakeSegmentType.Jewel:
			this.body.angle -= this.angle;
			this.append(this.body);
			break;
		default:
			// do nothing
		}
	}
}

/**
 * スネークのheadを伝う動きのためのヒストリ型
 */
interface SnakeHistoryElement extends g.CommonOffset {
	angle: number;
}

/**
 * スネークが壁伝いに進む方向
 */
export enum SnakeRotateState {
	/**
	 * 時計回り
	 */
	onClockwise = "onClockwise",

	/**
	 * 反時計回り
	 */
	onCounterClockwise  = "onCounterClockwise",

	/**
	 * 壁に接触していない
	 */
	noRotate = "noRotate"
}

/**
 * SnakeSegmentの種類
 */

export enum SnakeSegmentType {
	/**
	 * 頭
	 */
	Head = "Head",

	/**
	 * 節
	 */
	Knot = "Knot",

	/**
	 * お宝
	 */
	Jewel = "Jewel"
}
