import { getEnv } from "../config/env";
import logger from "../lib/logger";

export interface MailService {
  sendPasswordSetupEmail(to: string, link: string): Promise<void>;
}

class ConsoleMailService implements MailService {
  async sendPasswordSetupEmail(to: string, link: string): Promise<void> {
    const env = getEnv();
    if (process.env.NODE_ENV !== "production" && process.env.EMAIL_DEV_LOG === "true") {
      logger.info({ to, link }, "DEV EMAIL (password setup link)");
    } else {
      logger.info({ to }, "Password setup email queued (no provider configured)");
    }
    void env;
  }
}

class SmtpMailService implements MailService {
  async sendPasswordSetupEmail(to: string, link: string): Promise<void> {
    // Minimal: log intent; real SMTP would use nodemailer. Provider selected by env.
    logger.info({ to }, "SMTP password setup email requested");
    // In dev, optionally log the link
    if (process.env.NODE_ENV !== "production" && process.env.EMAIL_DEV_LOG === "true") {
      logger.info({ link }, "DEV EMAIL link");
    }
  }
}

class SesMailService implements MailService {
  async sendPasswordSetupEmail(to: string, link: string): Promise<void> {
    logger.info({ to }, "SES password setup email requested");
    if (process.env.NODE_ENV !== "production" && process.env.EMAIL_DEV_LOG === "true") {
      logger.info({ link }, "DEV EMAIL link");
    }
  }
}

export function createMailService(): MailService {
  const provider = (process.env.MAIL_PROVIDER || "").toLowerCase();
  if (provider === "smtp") return new SmtpMailService();
  if (provider === "ses") return new SesMailService();
  return new ConsoleMailService();
}

export const mailService: MailService = createMailService();
export default mailService;