const { performance } = require('perf_hooks');

const generateServers = (count) => {
  const envs = ['prod', 'staging', 'dev'];
  const servers = [];
  for (let i = 0; i < count; i++) {
    servers.push({ env: envs[Math.floor(Math.random() * envs.length)] });
  }
  return servers;
};

const servers = generateServers(10000);

const baseline = () => {
  return {
    all: servers.length,
    prod: servers.filter((server) => server.env === 'prod').length,
    staging: servers.filter((server) => server.env === 'staging').length,
    dev: servers.filter((server) => server.env === 'dev').length
  };
};

const optimized = () => {
  let prod = 0, staging = 0, dev = 0;
  for (let i = 0; i < servers.length; i++) {
    const env = servers[i].env;
    if (env === 'prod') prod++;
    else if (env === 'staging') staging++;
    else if (env === 'dev') dev++;
  }
  return { all: servers.length, prod, staging, dev };
};

const runBenchmark = (name, fn) => {
  const start = performance.now();
  for (let i = 0; i < 1000; i++) {
    fn();
  }
  const end = performance.now();
  console.log(`${name}: ${end - start}ms`);
};

runBenchmark('baseline', baseline);
runBenchmark('optimized', optimized);
