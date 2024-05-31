import path from "path";
import fs from "fs";
import { execSync } from "child_process";
import { performance } from "perf_hooks";

const arguments = process.argv.slice(2);
const command = arguments[0];
const functionName = arguments[1];

if (!functionName) {
    process.exit(1);
}

const AVAILABLE_COMMANDS = ["build", "deploy"];
console.log(AVAILABLE_COMMANDS);

const FUNCTIONS_DIRECTORY = path.join(__dirname, "functions");
const FUNCTION_DIR = path.join(FUNCTIONS_DIRECTORY, functionName);

if (command === "build") {
    const START_TIME = performance.now();
    buildFunctionEntryPoint();
    const END_TIME = performance.now();

    console.log(`\n Finished in ${(END_TIME - START_TIME).toPrecision(4)} milliseconds\n`);
}

if (command === "deploy") {
    console.log(`\n  Preparing functions "${functionName}" for deploy...`);

    deployFunction();
}

/**
 *
 * Functions used in entry point
 *
 */
function buildFunctionEntryPoint() {
    const isFunctionExists = fs.existsSync(FUNCTION_DIR);
    if (!isFunctionExists) {
        console.log(`❌  Function "${functionName}" does not exist.`);
        process.exit(1);
    }

    const functionDistDir = path.join(FUNCTION_DIR, "dist");

    runFunctionBuild();

    const functionPackageDir = path.join(functionDistDir, "packages");

    const hasFunctionPackage = fs.existsSync(functionPackageDir);
    if (!hasFunctionPackage) {
        console.log(`ℹ️ Function "${functionName}" has no packages. No need to generate entry file. Skipping...`);
        return;
    }

    const entryFile = generateEntryFile();

    const indexJsPath = path.join(functionDistDir, "index.js");
    fs.writeFileSync(indexJsPath, entryFile);

    console.log(`\n🎫 Function "${functionName}" entry file generated succesfuly 🎉`);
}

function generateEntryFile() {
    const packagesConfig = getInternalPackageConfig();

    const aliases = packagesConfig.map((config) => config.alias);

    const entryFile = `\
const path = require("path");
const moduleAlias = require("module-alias");

moduleAlias.addAliases({
  ${aliases.join(",\n  ")}
});

module.exports = require("./functions/${functionName}/src/index");
`;

    return entryFile;
}

function runFunctionBuild() {
    console.log(`🏗  Building "${functionName}" function...`);

    try {
        const packageJsonPath = path.join(FUNCTION_DIR, "package.json");
        const packageJsonFile = fs.readFileSync(packageJsonPath, "utf8");
        const packageJson = JSON.parse(packageJsonFile);

        if (packageJson.dependencies["module-alias"] === undefined) {
            console.log('\n🚨 Function package.json does not include "module-alias" package.\n');

            process.exit(1);
        }

        execSync(`yarn workspace ${packageJson.name} build`);

        console.log(`✅ Function "${functionName}" builded!`);
    } catch (error) {
        console.log(error);
        console.log("\n🚨 Error while building function!\n");

        process.exit(1);
    }
}

function prepareFunctionForDeploy() {
    buildFunctionEntryPoint();

    const yarnLockPath = path.join(__dirname, "yarn.lock");
    const yarnLockDestination = path.join(FUNCTION_DIR, "yarn.lock");
    fs.copyFileSync(yarnLockPath, yarnLockDestination);

    console.log("yarn.lock copied");
}

function deployFunction() {
    console.log('Deploy');

    prepareFunctionForDeploy();

    const command = `\
        gcloud functions deploy ${functionName} \
        --source ${FUNCTION_DIR} \
        --runtime nodejs20 \
        --trigger-http \
        --entry-point funnyWorld`

    console.log("Deploy cmd:", command);
    execSync(command);
}

function getInternalPackageConfig() {
    const functionPackageDir = path.join(FUNCTION_DIR, "dist", "packages");
    const packageNames = fs.readdirSync(functionPackageDir);

    const packages = packageNames.map((packageName) => {
        const packageDir = path.join(__dirname, "packages", packageName, "package.json");

        const packageJsonFile = fs.readFileSync(packageDir, "utf8");
        const packageJson = JSON.parse(packageJsonFile);

        return {
            name: packageJson.name,
            alias: `"${packageJson.name}": path.join(__dirname, "packages/${packageName}/src")`,
            dependencies: packageJson.dependencies,
        };
    });

    return packages;
}
