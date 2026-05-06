const iterations = 1000000;
const query = "Command";

function withInner() {
  const actions = [
    { label: 'Go to Servers', kind: 'nav', nav: 'dashboard' },
    { label: 'Go to Execution Console', kind: 'nav', nav: 'console' },
    { label: 'Go to History', kind: 'nav', nav: 'history' },
    { label: 'Go to Settings', kind: 'nav', nav: 'settings' },
    { label: 'New multi-server command', kind: 'action', run: 'compose' },
    { label: 'Add server', kind: 'action', run: 'add-server' },
    { label: 'Toggle theme', kind: 'action', run: 'theme' }
  ];
  return actions.filter((action) => action.label.toLowerCase().includes(query.toLowerCase()));
}

function withOuter() {
  const lowerQuery = query.toLowerCase();
  const actions = [
    { label: 'Go to Servers', kind: 'nav', nav: 'dashboard' },
    { label: 'Go to Execution Console', kind: 'nav', nav: 'console' },
    { label: 'Go to History', kind: 'nav', nav: 'history' },
    { label: 'Go to Settings', kind: 'nav', nav: 'settings' },
    { label: 'New multi-server command', kind: 'action', run: 'compose' },
    { label: 'Add server', kind: 'action', run: 'add-server' },
    { label: 'Toggle theme', kind: 'action', run: 'theme' }
  ];
  return actions.filter((action) => action.label.toLowerCase().includes(lowerQuery));
}

let start = performance.now();
for (let i = 0; i < iterations; i++) {
  withInner();
}
let end = performance.now();
console.log(`withInner: ${end - start} ms`);

start = performance.now();
for (let i = 0; i < iterations; i++) {
  withOuter();
}
end = performance.now();
console.log(`withOuter: ${end - start} ms`);
