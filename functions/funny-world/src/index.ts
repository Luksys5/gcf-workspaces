import { Request, Response } from "@google-cloud/functions-framework";
import { getWelcomeMessage } from "@lukastech/greetings";
import escapeHtml from "escape-html";

export function funnyWorld(req: Request, res: Response) {
  const reqName = String(req.query.name || "Anonymous");
  const name = escapeHtml(reqName);

  const message = getWelcomeMessage(name);

  res.send(`<pre><b>${process.env.COMPANY}</b></br>${message}</pre>`);
}
