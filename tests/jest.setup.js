import { installGlobals } from "@remix-run/node"; // or cloudflare/deno
// Set up Axe
require("@testing-library/jest-dom");
// This installs globals such as "fetch", "Response", "Request" and "Headers".

installGlobals();
