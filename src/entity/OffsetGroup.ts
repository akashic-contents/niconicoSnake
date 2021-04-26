export interface OffsetGroupParameterObject {
	/**
     * Snakeが生成するSnakeSegmentのappend先
     * Snake#rootとの位置関係が変わらないことを暗黙の前提にする
     * MainGameScene#snakeLayerを想定している
     */
	parent: g.E;
}

export class OffsetGroup {
	/**
     * parnetにappendされるが、動かさない
     * Snakeに紐づいたEntityをまとめて削除したい、（他のSnakeとの座標整合性を無視して）動かしたいときだけ使う
     */
	root: g.E;

	/**
     * ParameterObjectで与えられるparent
     */
	parent: g.E;

	constructor(param: OffsetGroupParameterObject) {
		this.parent = param.parent;

		this.root = new g.E({
			scene: this.parent.scene
		});
		this.parent.append(this.root);
	}

	destroy(): void {
		this.root.destroy();
	}
}
