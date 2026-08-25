import { createFileRoute } from "@tanstack/react-router";
import { cronAuthorized } from "@/lib/dca-alerts";
import { runDailySnapshots } from "@/lib/progress-store";

export const Route = createFileRoute("/api/cron/snapshots")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!cronAuthorized(request)) {
          return new Response("Unauthorized", { status: 401 });
        }
        try {
          const result = await runDailySnapshots();
          return Response.json(result);
        } catch (err) {
          const message = err instanceof Error ? err.message : "snapshot run failed";
          return Response.json({ error: message }, { status: 500 });
        }
      },
    },
  },
});
