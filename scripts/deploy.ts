import { execSync } from "child_process"
import { bumpVersion } from "./utilities/bumpVersion"
import { print } from "@digitak/print"

console.log("Bumping version...")
const version = bumpVersion()

execSync(`git add .`)
execSync(`git commit -m "📌 Version ${version}"`)
execSync(`git push`)

import "./build"

print`[yellow: Starting deploy...]`

try {
	execSync(`npm publish`, { cwd: "./package" })
} catch (error) {
	print`[red: －－－ An error occured during deploy －－－]`
	console.log(error, "\n")
	process.exit(1)
}

print`\n[green.bold: Deploy done 🎉]\n`
