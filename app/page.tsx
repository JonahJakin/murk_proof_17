import type { Metadata } from "next";
import MurkGame from "./MurkGame";

export const metadata: Metadata = {
  title: "MURK",
  description: "There’s something in Greenwake Lake.",
};

export default function Home() {
  return <MurkGame />;
}
