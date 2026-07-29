import { google } from "googleapis";
import http from "node:http";
import { exec } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

// tsx doesn't auto-load .env files, so read .env.local (falling back to .env) manually.
function loadEnvFile() {
  for (const name of [".env.local", ".env"]) {
    const filePath = path.join(process.cwd(), name);
    if (!fs.existsSync(filePath)) continue;
    for (const line of fs.readFileSync(filePath, "utf-8").split("\n")) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (!match) continue;
      const key = match[1];
      let value = (match[2] ?? "").trim();
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      if (!(key in process.env)) process.env[key] = value;
    }
    break;
  }
}

loadEnvFile();

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const redirectUri = process.env.GOOGLE_REDIRECT_URI ?? "http://localhost:3000/api/auth/google/callback";

if (!clientId || !clientSecret) {
  console.error("Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in .env.local");
  process.exit(1);
}

const redirect = new URL(redirectUri);
const port = Number(redirect.port || 80);

const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  // Forces Google to reissue a refresh token even if this account already
  // authorized this app before (otherwise it may return no refresh_token).
  prompt: "consent",
  scope: ["https://www.googleapis.com/auth/calendar"],
});

console.log("\nStop `npm run dev` first if it's running — this needs port", port, "free.\n");
console.log("Opening this URL in your browser (sign in with the account that owns the calendar):\n");
console.log(authUrl, "\n");

const openCommand =
  process.platform === "win32" ? `start "" "${authUrl}"` : process.platform === "darwin" ? `open "${authUrl}"` : `xdg-open "${authUrl}"`;
exec(openCommand, () => {});

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${port}`);
  if (url.pathname !== redirect.pathname) {
    res.writeHead(404).end();
    return;
  }

  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error) {
    res.writeHead(400, { "Content-Type": "text/html" }).end(`<h1>Authorization failed</h1><p>${error}</p>`);
    console.error("\nAuthorization failed:", error);
    server.close();
    process.exit(1);
  }

  if (!code) {
    res.writeHead(400).end("Missing code");
    return;
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    res.writeHead(200, { "Content-Type": "text/html" }).end("<h1>Success</h1><p>You can close this tab and return to the terminal.</p>");

    if (!tokens.refresh_token) {
      console.error(
        "\nNo refresh token returned. This usually means the account already granted access previously without offline access recorded.\n" +
          "Go to https://myaccount.google.com/permissions, remove access for this app, then run this script again.",
      );
      server.close();
      process.exit(1);
    }

    console.log("\nNew refresh token:\n");
    console.log(tokens.refresh_token);
    console.log("\nPaste this into .env.local as GOOGLE_REFRESH_TOKEN, then restart `npm run dev`.\n");
  } catch (err) {
    console.error("\nFailed to exchange code for tokens:", err);
  } finally {
    server.close();
    process.exit(0);
  }
});

server.listen(port);
