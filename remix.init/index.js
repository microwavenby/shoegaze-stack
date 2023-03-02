const { execSync } = require("child_process");
const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");

const PackageJson = require("@npmcli/package-json");
const semver = require("semver");
const YAML = require("yaml");

const cleanupDeployWorkflow = (deployWorkflow, deployWorkflowPath) => {
  delete deployWorkflow.jobs.typecheck;
  deployWorkflow.jobs.deploy.needs = deployWorkflow.jobs.deploy.needs.filter(
    (need) => need !== "typecheck"
  );

  return [fs.writeFile(deployWorkflowPath, YAML.stringify(deployWorkflow))];
};

const escapeRegExp = (string) =>
  // $& means the whole matched string
  string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getPackageManagerCommand = (packageManager) =>
  // Inspired by https://github.com/nrwl/nx/blob/bd9b33eaef0393d01f747ea9a2ac5d2ca1fb87c6/packages/nx/src/utils/package-manager.ts#L38-L103
  ({
    npm: () => ({
      exec: "npx",
      lockfile: "package-lock.json",
      run: (script, args) => `npm run ${script} ${args ? `-- ${args}` : ""}`,
    }),
    pnpm: () => {
      const pnpmVersion = getPackageManagerVersion("pnpm");
      const includeDoubleDashBeforeArgs = semver.lt(pnpmVersion, "7.0.0");
      const useExec = semver.gte(pnpmVersion, "6.13.0");

      return {
        exec: useExec ? "pnpm exec" : "pnpx",
        lockfile: "pnpm-lock.yaml",
        run: (script, args) =>
          includeDoubleDashBeforeArgs
            ? `pnpm run ${script} ${args ? `-- ${args}` : ""}`
            : `pnpm run ${script} ${args || ""}`,
      };
    },
    yarn: () => ({
      exec: "yarn",
      lockfile: "yarn.lock",
      run: (script, args) => `yarn ${script} ${args || ""}`,
    }),
  }[packageManager]());

const getPackageManagerVersion = (packageManager) =>
  // Copied over from https://github.com/nrwl/nx/blob/bd9b33eaef0393d01f747ea9a2ac5d2ca1fb87c6/packages/nx/src/utils/package-manager.ts#L105-L114
  execSync(`${packageManager} --version`).toString("utf-8").trim();

const readFileIfNotTypeScript = (
  isTypeScript,
  filePath,
  parseFunction = (result) => result
) =>
  isTypeScript
    ? Promise.resolve()
    : fs.readFile(filePath, "utf-8").then(parseFunction);

const removeUnusedDependencies = (dependencies, unusedDependencies) =>
  Object.fromEntries(
    Object.entries(dependencies).filter(
      ([key]) => !unusedDependencies.includes(key)
    )
  );

const updatePackageJson = ({ APP_NAME, isTypeScript, packageJson }) => {
  const {
    devDependencies,
    prisma: { seed: prismaSeed, ...prisma },
    scripts: { typecheck, ...scripts },
  } = packageJson.content;

  packageJson.update({
    name: APP_NAME,
    devDependencies: isTypeScript
      ? devDependencies
      : removeUnusedDependencies(devDependencies, ["ts-node"]),
    prisma: isTypeScript
      ? { ...prisma, seed: prismaSeed }
      : {
          ...prisma,
          seed: prismaSeed
            .replace("ts-node", "node")
            .replace("seed.ts", "seed.js"),
        },
    scripts: isTypeScript ? { ...scripts, typecheck } : { ...scripts },
  });
};

const main = async ({ isTypeScript, packageManager, rootDirectory }) => {
  const pm = getPackageManagerCommand(packageManager);

  const README_PATH = path.join(rootDirectory, "README.md");
  const DEPLOY_WORKFLOW_PATH = path.join(
    rootDirectory,
    ".github",
    "workflows",
    "deploy.yml"
  );
  const DOCKER_COMPOSE_PATH = path.join(
    rootDirectory,
    "docker-compose.e2e.yml"
  );
  const DOCKERFILE_PATH = path.join(rootDirectory, "Dockerfile");

  const REPLACER = "shoegaze-stack-template";
  const DOCKER_COMPOSE_NETWORK_NAME = "shoegaze-e2e";
  const DIR_NAME = path.basename(rootDirectory);
  const APP_NAME = DIR_NAME.replace(/[^a-zA-Z0-9-_]/g, "-");

  const [readme, dockerfile, deployWorkflow, dockerComposeFile, packageJson] =
    await Promise.all([
      fs.readFile(README_PATH, "utf-8"),
      fs.readFile(DOCKERFILE_PATH, "utf-8"),
      readFileIfNotTypeScript(isTypeScript, DEPLOY_WORKFLOW_PATH, (s) =>
        YAML.parse(s)
      ),
      fs.readFile(DOCKER_COMPOSE_PATH, "utf-8"),
      PackageJson.load(rootDirectory),
    ]);

  const newReadme = readme.replace(
    new RegExp(escapeRegExp(REPLACER), "g"),
    APP_NAME
  );

  const newDockerCompose = dockerComposeFile.replace(
    new RegExp(escapeRegExp(DOCKER_COMPOSE_NETWORK_NAME), "g"),
    `${APP_NAME}-e2e`
  );

  const newDockerfile = pm.lockfile
    ? dockerfile.replace(
        new RegExp(escapeRegExp("ADD package.json"), "g"),
        `ADD package.json ${pm.lockfile}`
      )
    : dockerfile;

  updatePackageJson({ APP_NAME, isTypeScript, packageJson });

  const fileOperationPromises = [
    fs.writeFile(README_PATH, newReadme),
    fs.writeFile(DOCKERFILE_PATH, newDockerfile),
    fs.writeFile(DOCKER_COMPOSE_PATH, newDockerCompose),
    packageJson.save(),
    fs.copyFile(
      path.join(rootDirectory, "remix.init", "gitignore"),
      path.join(rootDirectory, ".gitignore")
    ),
    fs.rm(path.join(rootDirectory, ".github", "ISSUE_TEMPLATE"), {
      recursive: true,
    }),
    fs.rm(path.join(rootDirectory, ".github", "dependabot.yml")),
    fs.rm(path.join(rootDirectory, ".github", "PULL_REQUEST_TEMPLATE.md")),
  ];

  if (!isTypeScript) {
    fileOperationPromises.push(
      ...cleanupDeployWorkflow(deployWorkflow, DEPLOY_WORKFLOW_PATH)
    );
  }

  await Promise.all(fileOperationPromises);

  execSync(pm.run("format", "--loglevel warn"), {
    cwd: rootDirectory,
    stdio: "inherit",
  });

  console.log(
    `
Setup is almost complete. Follow these steps to run the sample:

- Start the database:
  ${pm.run("dev:startdb")}

- You're now ready to rock and roll 👞👀
  ${pm.run("dev:remix")}
    `.trim()
  );
};

module.exports = main;
