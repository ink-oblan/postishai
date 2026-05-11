import { redirect } from "next/navigation";
import { config } from "@/lib/config";
import LandingPage from "./_landing-page";

export default function RootPage() {
  if (config.selfDeployment) {
    redirect("/login");
  }
  return <LandingPage />;
}
