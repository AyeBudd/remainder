import { createFileRoute } from "@tanstack/react-router";
import { AssetPage } from "@/components/asset-page";

export const Route = createFileRoute("/asset/$id")({
  component: AssetRoute,
});

function AssetRoute() {
  const { id } = Route.useParams();
  return <AssetPage coinId={id} />;
}
