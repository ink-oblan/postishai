import { redirect } from "next/navigation";
import { connection } from "next/server";
import { config } from "@/lib/config";
import LandingPage from "./_landing-page";

export default async function RootPage() {
  await connection();

  if (config.selfDeployment) {
    redirect("/login");
  }
  return <LandingPage />;
}
