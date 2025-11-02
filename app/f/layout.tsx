import { DataStreamProvider } from "@/components/data-stream-provider";

export const experimental_ppr = true;

export default function Layout({ children }: { children: React.ReactNode }) {
  return <DataStreamProvider>{children}</DataStreamProvider>;
}
