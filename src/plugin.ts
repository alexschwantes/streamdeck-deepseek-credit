import streamDeck from "@elgato/streamdeck";

import { DeepSeekCredit } from "./actions/deepseek-credit";

// "info", not the scaffold's "trace": trace logging records every message, including the API key in settings.
streamDeck.logger.setLevel("info");

streamDeck.actions.registerAction(new DeepSeekCredit());

streamDeck.connect();
