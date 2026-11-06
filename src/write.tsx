import "./index.css";
import { createRoot } from "react-dom/client";
import { hydrate } from "./store";
import { App } from "./ui/App";

void hydrate();
createRoot(document.getElementById("root")!).render(<App />);
