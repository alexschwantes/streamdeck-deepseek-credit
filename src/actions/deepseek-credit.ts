import { action, SingletonAction, WillAppearEvent } from "@elgato/streamdeck";

/**
 * Shows remaining DeepSeek API credit and peak / off-peak pricing on a key.
 */
@action({ UUID: "com.example.deepseek-credit.status" })
export class DeepSeekCredit extends SingletonAction {
	override onWillAppear(ev: WillAppearEvent): Promise<void> {
		return ev.action.setTitle("DeepSeek");
	}
}
