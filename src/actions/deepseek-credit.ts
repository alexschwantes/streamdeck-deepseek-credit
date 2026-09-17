import streamDeck, {
	action,
	type DidReceiveSettingsEvent,
	type KeyAction,
	type KeyDownEvent,
	SingletonAction,
	type WillAppearEvent,
} from "@elgato/streamdeck";

import { BalanceStore } from "../balance-store.ts";
import { peakStatus } from "../peak.ts";
import { bothImage, creditImage, peakImage, toDataUri } from "../render.ts";

/** Per-key settings: what the key shows. */
type KeySettings = { show?: "credit" | "peak" | "both" };

/** Plugin-wide settings, entered once in the property inspector. */
type GlobalSettings = { apiKey?: string };

/**
 * Shows remaining DeepSeek API credit, or peak / off-peak pricing, on a key. All keys share one API key and one
 * balance request; key faces are redrawn every whole minute from the cached balance, with no network call.
 */
@action({ UUID: "com.example.deepseek-credit.status" })
export class DeepSeekCredit extends SingletonAction<KeySettings> {
	readonly #store = new BalanceStore(() => {
		const view = this.#store.view;
		// Log only the outcome, never the API key or response bodies (NFR-7).
		streamDeck.logger.info(`Balance: ${view.kind}${view.kind === "http-error" ? ` ${view.status}` : ""}`);
		void this.#drawAll();
	});

	/** Reads the API key and starts the per-minute redraw. Call once, after connecting to Stream Deck. */
	async start(): Promise<void> {
		// Stops getGlobalSettings() and getSettings() from echoing back as did-receive events.
		streamDeck.settings.useExperimentalMessageIdentifiers = true;
		streamDeck.settings.onDidReceiveGlobalSettings<GlobalSettings>((ev) => void this.#store.setApiKey(ev.settings.apiKey));
		this.#tick();
		const { apiKey } = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
		await this.#store.setApiKey(apiKey);
	}

	override onWillAppear(ev: WillAppearEvent<KeySettings>): void {
		if (ev.action.isKey()) {
			void this.#draw(ev.action, ev.payload.settings);
		}
		void this.#store.refreshIfStale();
	}

	override onDidReceiveSettings(ev: DidReceiveSettingsEvent<KeySettings>): void {
		if (ev.action.isKey()) {
			void this.#draw(ev.action, ev.payload.settings);
		}
	}

	override onKeyDown(_ev: KeyDownEvent<KeySettings>): Promise<void> {
		return this.#store.refresh();
	}

	/** Redraws at every whole minute, when peak state and countdown can change, and refreshes a stale balance. */
	#tick(): void {
		setTimeout(() => this.#tick(), 60_000 - (Date.now() % 60_000));
		if (this.actions.length > 0) {
			void this.#drawAll();
			void this.#store.refreshIfStale();
		}
	}

	async #drawAll(): Promise<void> {
		await Promise.all(
			this.actions.map(async (a) => {
				if (a.isKey()) {
					await this.#draw(a, await a.getSettings());
				}
			}),
		);
	}

	async #draw(key: KeyAction<KeySettings>, settings: KeySettings): Promise<void> {
		const now = new Date();
		const peak = peakStatus(now);
		const face =
			settings.show === "peak"
				? peakImage(peak, now)
				: settings.show === "both"
					? bothImage(this.#store.view, peak, now)
					: creditImage(this.#store.view, peak);
		try {
			// Stream Deck renders an SVG only when it arrives as a data URI; a bare "<svg …>" string is ignored.
			await key.setImage(toDataUri(face));
		} catch (err) {
			streamDeck.logger.error("Failed to draw key", err);
		}
	}
}
