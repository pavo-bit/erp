import twilio from "twilio";
import logger from "./logger";
import { getEnv } from "../config/env";
import { smsCircuitBreaker } from "./circuitBreaker";

const env = getEnv();

// Initialize Twilio client
// We use lazy initialization so the app doesn't crash if env vars are missing
let twilioClient: twilio.Twilio | null = null;

if (env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN) {
  try {
    twilioClient = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
  } catch (err) {
    logger.error({ err }, "Failed to initialize Twilio client");
  }
}

/**
 * Sends an SMS message using Twilio, wrapped in a Circuit Breaker.
 */
export async function sendSMS(to: string, message: string): Promise<boolean> {
  // 1. Check if provider is configured
  if (!twilioClient || !env.TWILIO_PHONE_NUMBER) {
    logger.warn({ to, message }, "SMS provider not configured. Skipping SMS send.");
    return false;
  }

  // 2. Format phone number (ensure E.164 format, default to India +91 if missing)
  let formattedNumber = to.replace(/[\s-()]/g, "");
  if (!formattedNumber.startsWith("+")) {
    formattedNumber = `+91${formattedNumber}`; // Default to India, or extract from tenant config
  }

  // 3. Fire through Circuit Breaker
  try {
    const response = await smsCircuitBreaker.fire(async () => {
      // It's important to return the Promise directly to the circuit breaker
      return await twilioClient!.messages.create({
        body: message,
        from: env.TWILIO_PHONE_NUMBER,
        to: formattedNumber,
      });
    });

    logger.info({ sid: response.sid, to: formattedNumber }, "SMS sent successfully");
    return true;
  } catch (error: any) {
    // If the circuit breaker is open, or twilio fails
    if (error.message && error.message.includes("OPEN")) {
      logger.error({ to }, "SMS Circuit Breaker is OPEN. Message dropped.");
      // Note: we could route this to a DLQ for retry here
    } else {
      logger.error({ err: error, to }, "Twilio SMS send failed");
    }
    return false;
  }
}
