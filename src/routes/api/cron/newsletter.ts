import { createFileRoute } from "@tanstack/react-router";
import { cronAuthorized } from "@/lib/dca-alerts";
import { publishWeeklyIssue } from "@/lib/newsletter-store";

export const Route = createFileRoute("/api/cron/newsletter")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!cronAuthorized(request)) {
          return new Response("Unauthorized", { status: 401 });
        }
        try {
          const result = await publishWeeklyIssue();
          return Response.json(result);
        } catch (err) {
          const message = err instanceof Error ? err.message : "newsletter failed";
          return Response.json({ error: message }, { status: 500 });
        }
      },
    },
  },
});
