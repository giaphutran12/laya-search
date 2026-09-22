import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSearchIndex, describeCompany} from './search.mjs';
const companies=JSON.parse(readFileSync(new URL('./data/companies.json',import.meta.url),'utf8'));
const search=createSearchIndex(companies);
test('real directory exact-name searches preserve the intended company',()=>{
  for(const name of ['Stripe','Airbnb','Gusto'])assert.equal(search(name)[0].name,name);
});
test('empty and unknown queries do not silently return arbitrary companies',()=>{
  assert.deepEqual(search(''),[]);assert.deepEqual(search('zxqvnotacompany983'),[]);
});
test('shortlist is bounded and preserves unique directory records',()=>{
  const results=search('payment infrastructure for developers');
  assert.ok(results.length>0&&results.length<=48);
  assert.equal(new Set(results.map(company=>company.id)).size,results.length);
  assert.ok(results.some(company=>company.name==='Xendit'));
});

test('service company candidates with missing descriptions remain usable by JEV',()=>{
  const candidates=search('service company');
  const missing=candidates.filter(company=>company.long_description===null);
  assert.ok(missing.length>0, 'Regression must exercise actual null-description records');
  for(const company of missing)assert.equal(describeCompany(company),(company.one_liner||'').slice(0,1400));
  for(const company of companies){assert.equal(typeof describeCompany(company),'string');assert.ok(describeCompany(company).length<=1400);}
});
