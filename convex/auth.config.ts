export default {
  providers: [
    {
      domain: process.env.CONVEX_SITE_URL ?? "https://localhost:5173",
      applicationID: "convex",
    },
  ],
};
