/* eslint-disable @typescript-eslint/no-require-imports */
const fs=require('fs'),path=require('path'),solc=require('solc');
const root=path.resolve(__dirname,'../..');
const sources={};for(const name of ['COIN','CoinSale'])sources[`contracts/${name}.sol`]={content:fs.readFileSync(path.join(root,'contracts',`${name}.sol`),'utf8')};
function findImports(p){const file=path.join(root,'node_modules',p);return fs.existsSync(file)?{contents:fs.readFileSync(file,'utf8')}:{error:`Missing ${p}`}}
const input={language:'Solidity',sources,settings:{optimizer:{enabled:true,runs:200},outputSelection:{'*':{'*':['abi','evm.bytecode.object','metadata']}}}};
const out=JSON.parse(solc.compile(JSON.stringify(input),{import:findImports}));for(const e of out.errors||[])if(e.severity==='error')throw Error(e.formattedMessage);
const dir=path.join(root,'contracts/artifacts');fs.mkdirSync(dir,{recursive:true});for(const n of ['COIN','CoinSale']){const c=out.contracts[`contracts/${n}.sol`][n];fs.writeFileSync(path.join(dir,`${n}.json`),JSON.stringify({abi:c.abi,bytecode:`0x${c.evm.bytecode.object}`,metadata:JSON.parse(c.metadata)},null,2));console.log(n,c.evm.bytecode.object.length/2,'bytes')}
