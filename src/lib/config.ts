export const config = {
  venue: {
    name: "HeroKids Play Space",
    maxChildren: 30,
  },
  auth: {
    // Simple password protection for internal staff use.
    // Replace with a proper auth system (NextAuth, Clerk, etc.) before exposing to the internet.
    password: process.env.ACCESS_PASSWORD ?? "herokids2024",
    cookieName: "herokids_access",
    cookieMaxAge: 60 * 60 * 24 * 7, // 7 days
  },
  googleCalendar: {
    clientId: process.env.GOOGLE_CLIENT_ID ?? "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    redirectUri: process.env.GOOGLE_REDIRECT_URI ?? "http://localhost:3000/api/auth/google/callback",
    refreshToken: process.env.GOOGLE_REFRESH_TOKEN ?? "",
    calendarId: process.env.GOOGLE_CALENDAR_ID ?? "primary",
  },
} as const;
