const selected = Array.from({ length: 10000 }, (_, i) => i.toString())
const servers = Array.from({ length: 20000 }, (_, i) => ({ id: i.toString() }))

console.time('Array.includes')
for (let i = 0; i < 100; i++) {
  servers.filter(server => selected.includes(server.id))
}
console.timeEnd('Array.includes')

console.time('Set.has')
for (let i = 0; i < 100; i++) {
  const selectedSet = new Set(selected)
  servers.filter(server => selectedSet.has(server.id))
}
console.timeEnd('Set.has')
