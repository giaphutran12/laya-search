// Narrow the public directory before asking a model to judge relevance.
const stopWords = new Set('a an the for to of in on and or that with companies company startups startup find show me which are is any all building make makes'.split(' '));
const synonyms = {ai:'artificial intelligence machine learning',payments:'payment fintech banking',healthcare:'health medical clinical',developer:'developers devtools software api',climate:'carbon energy sustainability',robotics:'robots automation',education:'learning teaching school',competitor:'alternative similar'};
export function tokenize(text) { return String(text).toLowerCase().match(/[a-z0-9]+/g)?.filter(word=>!stopWords.has(word)) ?? []; }
export function createSearchIndex(companies) {
  const documents = companies.map(company=>{
    const words = tokenize([company.name,company.name,company.one_liner,company.one_liner,company.long_description,company.batch,company.all_locations,...company.tags,...company.industries,company.status].join(' '));
    const counts = new Map();
    words.forEach(word=>counts.set(word,(counts.get(word)||0)+1));
    return {company,counts,length:words.length};
  });
  const frequencies = new Map();
  documents.forEach(document=>document.counts.forEach((_,word)=>frequencies.set(word,(frequencies.get(word)||0)+1)));
  const averageLength=documents.reduce((sum,document)=>sum+document.length,0)/documents.length;
  return query=>{
    const original=tokenize(query);
    const expanded=[...new Set([...original,...original.flatMap(word=>tokenize(synonyms[word]||''))])];
    return documents.map(({company,counts,length})=>{
      let score=0;
      for(const word of expanded){const count=counts.get(word)||0;const frequency=frequencies.get(word)||0;
        score+=Math.log(1+(companies.length-frequency+0.5)/(frequency+0.5))*count*2.2/(count+1.2*(0.25+0.75*length/averageLength))*(original.includes(word)?1:0.35);
      }
      if(company.name.toLowerCase()===query.toLowerCase().trim())score+=100;
      return {company,score};
    }).filter(result=>result.score>0).sort((a,b)=>b.score-a.score).slice(0,48).map(result=>result.company);
  };
}

// Public directory records can omit a long description; retain their tagline.
export function describeCompany(company) {
  return (company.long_description || company.one_liner || "").slice(0, 1400);
}
