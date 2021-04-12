import { exec } from "child_process"
import { bold } from "chalk"

const execOptions = { windowsHide: true }

console.log(`Cleaning ${bold("library")}...`)
exec(`rm -r -f library/*.ts library/*.js`, execOptions, (error, stdout, stderr) => {
	stdout && console.log("stdout", stdout)
	stderr && console.error("stderr", stderr)
	if (error) return console.error(error)

	console.log(`Generating library...`)
	exec(`tsc`, execOptions, (error, stdout, stderr) => {
		stdout && console.log("stdout", stdout)
		stderr && console.error("stderr", stderr)
		if (error) return console.error(error)
	})
})
