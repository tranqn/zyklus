const { FOODS } = await import('/Users/quocnamtran/Desktop/repos/zyklus/src/domain/foods.ts')
const out = FOODS.map((f) => ({
  id: f.id,
  de: f.names?.de ?? f.name,
  en: f.names?.en ?? f.name,
  vi: f.names?.vi ?? f.name,
  per100: f.per100,
  region: f.region ?? null,
  aliases: f.aliases ?? [],
}))
console.log(JSON.stringify(out))
