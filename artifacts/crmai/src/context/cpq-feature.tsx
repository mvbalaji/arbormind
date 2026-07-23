import { useQuery } from "@tanstack/react-query";

export function useCpqEnabled() {
  const { data, isLoading } = useQuery({
    queryKey: ["app-modules-public"],
    queryFn: () =>
      fetch("/api/app-modules/public", { credentials: "include" }).then((r) => r.json()),
  });
  return { cpqEnabled: data?.enabledModules?.cpq ?? false, isLoading };
}
