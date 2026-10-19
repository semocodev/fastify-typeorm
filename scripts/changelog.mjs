// Prepend the newest release section (from conventional commits) below the CHANGELOG.md header.
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const file = "CHANGELOG.md";
const section = execSync("npx conventional-changelog -p conventionalcommits -r 1 -u --stdout -i /dev/null", {
	encoding: "utf8",
}).trim();
const current = readFileSync(file, "utf8");
const marker = current.search(/^## /m);
const header = marker === -1 ? current.trimEnd() : current.slice(0, marker).trimEnd();
const rest = marker === -1 ? "" : current.slice(marker);

if (section) {
	writeFileSync(file, `${header}\n\n${section}\n\n${rest}`);
}
