import { createRoot } from "react-dom/client";
import MurkGame from "../app/MurkGame";
import "../app/globals.css";

const root = document.getElementById("root");
if (!root) throw new Error("MURK could not find its application root.");

createRoot(root).render(<MurkGame />);
