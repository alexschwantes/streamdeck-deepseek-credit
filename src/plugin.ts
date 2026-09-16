import streamDeck from "@elgato/streamdeck";

import { DeepSeekCredit } from "./actions/deepseek-credit.ts";

// "info", not the scaffold's "trace": trace logging records every message, including the API key in settings.
streamDeck.logger.setLevel("info");

const credit = new DeepSeekCredit();
streamDeck.actions.registerAction(credit);

await streamDeck.connect();
await credit.start();
