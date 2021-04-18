import { build } from "@digitak/tsc-esm"
import { rmSync } from "fs"

console.log("Cleaning library...")
rmSync("library", { recursive: true, force: true })

console.log("Compiling typescript...")
build()
