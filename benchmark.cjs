const { performance } = require('perf_hooks');

const servers = Array.from({ length: 100000 }, (_, i) => ({
  env: ['prod', 'staging', 'dev', 'unknown'][i % 4]
}));

function testFilter() {
  const counts = {
    all: servers.length,
    prod: servers.filter((server) => server.env === 'prod').length,
    staging: servers.filter((server) => server.env === 'staging').length,
    dev: servers.filter((server) => server.env === 'dev').length
  }
  return counts;
}

function testForLoop() {
  let prod = 0, staging = 0, dev = 0
  for (let i = 0; i < servers.length; i++) {
    const env = servers[i].env
    if (env === 'prod') prod++
    else if (env === 'staging') staging++
    else if (env === 'dev') dev++
  }
  return { all: servers.length, prod, staging, dev }
}

function testReduce() {
  return servers.reduce(
    (acc, server) => {
      if (server.env === 'prod') acc.prod++;
      else if (server.env === 'staging') acc.staging++;
      else if (server.env === 'dev') acc.dev++;
      return acc;
    },
    { all: servers.length, prod: 0, staging: 0, dev: 0 }
  );
}

function runBenchmark(name, fn) {
  const start = performance.now();
  for (let i = 0; i < 100; i++) {
    fn();
  }
  const end = performance.now();
  console.log(`${name}: ${end - start}ms`);
}

runBenchmark('Filter', testFilter);
runBenchmark('ForLoop', testForLoop);
runBenchmark('Reduce', testReduce);
