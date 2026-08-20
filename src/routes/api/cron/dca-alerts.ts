import { createFileRoute } from "@tanstack/react-router";
import { cronAuthorized, runDcaAlerts } from "@/lib/dca-alerts";

export const Route = createFileRoute("/api/cron/dca-alerts")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!cronAuthorized(request)) {
          return new Response("Unauthorized", { status: 401 });
        }
        try {
          const result = await runDcaAlerts();
          return Response.json(result);
        } catch (err) {
          const message = err instanceof Error ? err.message : "alert run failed";
          return Response.json({ error: message }, { status: 500 });
        }
      },
    },
  },
});
