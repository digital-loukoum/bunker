import { execSync } from "child_process"
import * as fs from "fs"

console.log("Cleaning package...")
fs.rmSync("package", { force: true, recursive: true })

console.log("Compiling typescript...")
execSync(`tsc`)

console.log("Copying configuration files...")
fs.copyFileSync("./README.md", "./package/README.md")
fs.copyFileSync("./package.json", "./package/package.json")
fs.copyFileSync("./LICENSE", "./package/LICENSE")

console.log("✨ Build done\n")
