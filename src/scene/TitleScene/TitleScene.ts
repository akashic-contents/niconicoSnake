import { SceneBase } from "../SceneBase";
import { StateManager } from "../../StateManager";
import { TitleBehavior } from "./TitleBehavior";
import { joinRequestSequence, startRecruitmentSequence } from "../../utils/joinSequence";
import { BigButton } from "../../entity/TitleScene/BigButton";
import { RecruitmentCountDown } from "../../entity/TitleScene/RecruitmentCountDown";
import { WaitingText } from "../../entity/TitleScene/WaitingText";
import { HowtoText } from "../../entity/TitleScene/HowtoText";

export function createTitleScene(stateManager: StateManager): SceneBase {
	const assetIds: string[] = [
		"frame_howto",
		"btn_frame_join",
		"btn_frame_join_disable",
	];

	const titleScene = new TitleScene({
		game: g.game,
		stateManager: stateManager,
		assetIds: assetIds
	});
	return titleScene;
}

export interface TitleSceneParameterObject extends g.SceneParameterObject {
	stateManager: StateManager;
}

export class TitleScene extends SceneBase {
	stateManager: StateManager;
	root: g.E;
	howtoText: HowtoText;
	preparationText: g.Label;
	startButton: BigButton;
	joinButton: BigButton;
	waitingText: WaitingText;
	countDown: RecruitmentCountDown;
	lotteryResultText: g.Label;
	_isApplied: boolean; // 応募したかどうか

	constructor(param: TitleSceneParameterObject){
		super(param);
		this.stateManager = param.stateManager;
		this._isApplied = false;

		this.onLoad.add(() => {
			this.createRoot();
			this.createBackground();
			this.setBehavior(new TitleBehavior({
				scene: this,
				stateManager: this.stateManager
			}));
			this.setMessageEventListener();
			this.createHowtoText();
			this.createStartButton();
			this.createPreparationText();

			if (this.stateManager.sessionParameter.config.debug) this.createDebugButton();
		});
	}

	createRoot(): void {
		this.root = new g.E({ scene: this });
		this.append(this.root);
	}

	createBackground(): void {
		const backgroundRect = new g.FilledRect({
			scene: this,
			width: g.game.width,
			height: g.game.height,
			cssColor: "rgba(0,6,43,0.70)" // 色指定はデザイン指示より
		});
		this.root.append(backgroundRect);
	}

	resetScene(): void {
		if (this.lotteryResultText) {
			this.lotteryResultText.destroy();
		}
		this.createStartButton();
		this.createPreparationText();
	}

	createHowtoText(): void {
		const howtoText = new HowtoText({
			scene: this,
			y: 48,
			text: this.stateManager.sessionParameter.howtoMessage
		});
		this.root.append(howtoText);
	}

	createStartButton(): void {
		if (!this.stateManager.isBroadcaster) return;
		this.startButton = new BigButton({
			scene: this,
			text: "参加者受付を開始する",
			textColor: "white",
			font: this.stateManager.resource.font,
			x: g.game.width / 2,
			y: 482, // 手調整 (レイアウト指示+30)
			anchorX: 0.5,
			anchorY: 0.0,
			touchable: true,
			local: true
		});
		this.startButton.onPointUp.add(() => {
			this.startButton.destroy();
			startRecruitmentSequence();
		});
		this.root.append(this.startButton);
	}

	createPreparationText(): void {
		if (this.stateManager.isBroadcaster) return;
		this.preparationText = this._createBitTextLabel("放送者が準備中です");
	}

	createJoinButton(): void {
		if (this.stateManager.isBroadcaster) {
			if (this.startButton && !this.startButton.destroyed()) {
				this.startButton.destroy();
			}
			return;
		}
		this.preparationText.destroy();
		this.joinButton = new BigButton({
			scene: this,
			text: "参加する",
			textColor: "white",
			font: this.stateManager.resource.font,
			x: g.game.width / 2,
			y: 440, // 手調整 (レイアウト指示書+80)
			anchorX: 0.5,
			anchorY: 0.0,
			touchable: true,
			local: true
		});
		this.joinButton.pointUp.addOnce((event) => {
			this.joinButton.toDisable("参加受付完了");
			this._isApplied = true; // リロード時は実行されない
			joinRequestSequence(event.player);
		});
		this.root.append(this.joinButton);
	}

	createWaitingText(): void {
		this.waitingText = new WaitingText({
			scene: this,
			font: this.stateManager.resource.font,
			y: 510 // 手調整 (レイアウト指示+30)
		});
		this.root.append(this.waitingText);
	}

	createDebugButton(): void {
		const RANDOM_CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";
		const join10Button = new g.Label({
			scene: this,
			font: this.stateManager.resource.font,
			text: "join10bot",
			fontSize: 30,
			textColor: "black",
			touchable: true,
			x: 10,
			y: 10
		});
		join10Button.onPointDown.add(() => {
			join10Button.opacity = 0.5;
			join10Button.textColor = "red";
			join10Button.invalidate();
		});
		join10Button.onPointUp.add(() => {
			join10Button.opacity = 1;
			join10Button.textColor = "black";
			join10Button.invalidate();
			if (!this.stateManager.applicantList) return; // 参加者受付を開始していない

			for (let i = 0; i < 10; i++) {
				let name = "";
				const nameLength = Math.floor(Math.random() * 15) + 1;
				for (let i = 0; i < nameLength; i++){
					name += RANDOM_CHARS[Math.floor(Math.random() * RANDOM_CHARS.length)];
				}

				joinRequestSequence({
					id: Math.round(Math.random() * 1000).toString(),
					name: name
				});
			}
		});
		this.root.append(join10Button);
	}

	setRecruitmentTimer(startTime: number): void {
		this.countDown = new RecruitmentCountDown({
			scene: this,
			font: this.stateManager.resource.font,
			y: 594 // 手調整 (レイアウト指示+80)
		});
		const entrySec = this.stateManager.sessionParameter.entrySec;
		this.countDown.setTime(entrySec);
		this.root.append(this.countDown);

		const checkTimeUp: () => void = () => {
			const fpsTime = g.game.age - startTime;
			this.countDown.setTime(entrySec - fpsTime / g.game.fps);
			if (fpsTime > entrySec * g.game.fps) {
				this.tallyUp();
				this.update.remove(checkTimeUp);
			}
		};
		this.onUpdate.add(checkTimeUp);
	}

	tallyUp(): void {
		if (!this.stateManager.isBroadcaster) {
			this.joinButton.destroy();
		}
		this.countDown.destroy();
		this.createWaitingText();
	}

	showLotteryResult(numPlayers: number): void {
		this.waitingText.destroy();
		// 応募者がいない場合 (1人は放送者)
		if (numPlayers <= 1) {
			this.lotteryResultText = this._createBitTextLabel("参加者が集まりませんでした");
			return;
		}
		// 放送者の場合
		if (this.stateManager.isBroadcaster) {
			this.lotteryResultText = this._createBitTextLabel("参加者が決定しました");
			return;
		}
		// 当選者の場合
		if (g.game.selfId in this.stateManager.playerList) {
			this.lotteryResultText = this._createBitTextLabel("当選しました");
			return;
		}
		// 応募したが落選した場合
		// NOTE: タイトルで参加後リロードすると応募していない扱いになる
		if (this._isApplied) {
			this.lotteryResultText = this._createBitTextLabel("落選しました");
			return;
		}
		// 応募していない場合
		this.lotteryResultText = this._createBitTextLabel("参加者が決定しました");
	}

	_createBitTextLabel(text: string, top: number = 510): g.Label {
		const label = new g.Label({
			scene: this,
			text: text,
			font: this.stateManager.resource.font,
			fontSize: 73,
			textColor: "white",
			textAlign: "center",
			x: g.game.width / 2,
			y: top,
			anchorX: 0.5,
			anchorY: 0,
			local: true
		});
		this.root.append(label);
		return label;
	}
}
