# DeepSeek Credit — Stream Deck plugin

A Windows Stream Deck plugin that shows remaining DeepSeek API credit and whether DeepSeek is charging
peak or off-peak rates. **Work in progress.**

## Development

Requires Node.js 22.18 or later (tests run TypeScript directly with `node --test`).

| Command | What it does |
|---------|--------------|
| `npm install` | Install dependencies |
| `npm run build` | Build `src/` into `com.example.deepseek-credit.sdPlugin/bin/` |
| `npm run watch` | Rebuild on change and restart the plugin in Stream Deck |
| `npm run typecheck` | Type-check (the build does not fail on type errors) |
| `npm test` | Run the automated tests (no Stream Deck or network needed) |
| `npm run validate` | Build, then validate the plugin with the Stream Deck CLI |
| `npm run pack` | Build, then package to `dist/com.example.deepseek-credit.streamDeckPlugin` |

To try it in Stream Deck on Windows: `npm run build`, then
`npx streamdeck link com.example.deepseek-credit.sdPlugin`.

`com.example.deepseek-credit` is a placeholder plugin UUID for local use.
