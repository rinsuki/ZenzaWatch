import fs from "fs"
import pluginTypescript from "@rollup/plugin-typescript"

export default {
    input: "./src/export.ts",
    output: [{
        name: "libzenza",
        output: __dirname+"/dist.js",
        format: "cjs",
    }],
    plugins: [
        pluginTypescript(),
    ]
}