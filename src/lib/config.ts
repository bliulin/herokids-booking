export const config = {
  venue: {
    name: "HeroKids Play Space",
    maxChildren: 30,
  },
  auth: {
    allowedEmails: [
      "irina.dolhescu92@gmail.com",
      "bliulinx@gmail.com",
      "flaviacristianaatoderesei@gmail.com",
    ] as string[],
  },
  googleCalendar: {
    clientId: process.env.GOOGLE_CLIENT_ID ?? "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    redirectUri: process.env.GOOGLE_REDIRECT_URI ?? "http://localhost:3000/api/auth/google/callback",
    refreshToken: process.env.GOOGLE_REFRESH_TOKEN ?? "",
    calendarId: process.env.GOOGLE_CALENDAR_ID ?? "primary",
  },
} as const;
