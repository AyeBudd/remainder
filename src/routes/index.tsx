import { createFileRoute } from "@tanstack/react-router";
import { AppFrame } from "@/components/app-frame";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <AppFrame />;
}
