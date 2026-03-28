import arcjet, { shield, detectBot, slidingWindow } from "@arcjet/node"; 
import { ENV } from "./env.js";

// Use DRY_RUN for bot detection outside production so Postman and dev tools
// won't be blocked during development. In production keep LIVE to enforce rules.
const botMode = ENV.ARCJET_ENV === "production" ? "LIVE" : "DRY_RUN";

const aj = arcjet({ 
  key: ENV.ARCJET_KEY,
  rules: [
    // Shield protects your app from common attacks e.g. SQL injection
    shield({ mode: "LIVE" }),
    // Create a bot detection rule
    detectBot({
      mode: botMode, // Blocks requests only in production
      // Block all bots except the following
      allow: [
        "CATEGORY:SEARCH_ENGINE", // Google, Bing, etc
        // Uncomment to allow these other common bot categories
        // See the full list at https://arcjet.com/bot-list
        //"CATEGORY:MONITOR", // Uptime monitoring services
        //"CATEGORY:PREVIEW", // Link previews e.g. Slack, Discord
      ],
    }),
    // Create a sliding window rate limit. Other algorithms are supported.
    slidingWindow({
      mode: botMode === "LIVE" ? "LIVE" : "DRY_RUN",
      // Tracked by IP address by default, but this can be customized
      // See https://docs.arcjet.com/fingerprints
      //characteristics: ["ip.src"], 
      interval: 60, // Refill every 60 seconds 
      max: 100, // Optional: maximum tokens that can be accumulated (prevents token hoarding
    }),
  ],
});

export default aj;