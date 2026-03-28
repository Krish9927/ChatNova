import aj from "../lib/arcjet.js";
import { isSpoofedBot } from "@arcjet/inspect";

export default async function arcjetMiddleware(req, res, next) {
  try {
    const decision = await aj.protect(req); // ✅ await

    if (decision.isDenied()) { // ✅ correct method

      if (decision.reason.isRateLimit()) { // ✅ correct spelling
        return res.status(429).json({ error: "Too many requests" });
      } 
      
      else if (decision.reason.isBot() || isSpoofedBot(req)) {
        return res.status(403).json({ error: "Forbidden - Bot detected" });
      } 
      
      else {
        return res.status(403).json({ error: "Forbidden" });
      }
    } 
    
    else {
      next();
    }

  } catch (err) {
    console.error("Arcjet middleware error:", err);
    next();
  }
}