// Dependency-free parser for the retained SerpAPI wire-interface subset.
// Unknown TypeScript constructs conservatively become unconstrained JSON.
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../../../packages/sdk/src/native-serpapi.ts',import.meta.url),'utf8').replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/[^\n]*/g,'');
const tokens=source.match(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[A-Za-z_$][\w$]*|\d+(?:\.\d+)?|[^\s]/g)??[];
let pos=0;const peek=()=>tokens[pos];const take=()=>tokens[pos++];
function type(){let values=[primary()];while(peek()==='|'||peek()==='&'){const op=take();values.push(primary());if(op==='&')return {allOf:values};}return values.length>1?{oneOf:values}:values[0];}
function primary(){let t=take(),s={};if(t==='readonly')return primary();
 if(t==='{')s=members();else if(t==='('){s=type();if(peek()===')')take();}
 else if(t==='string'||t==='number'||t==='boolean'||t==='null')s={type:t};
 else if(t?.startsWith('"')||t?.startsWith("'"))s={const:t.slice(1,-1)};
 else if(t?.startsWith('SerpApi'))s={$ref:'#/components/schemas/'+t};
 if(peek()==='<'){take();const args=[];while(pos<tokens.length&&peek()!=='>'){args.push(type());if(peek()===',')take();else if(peek()!=='>')take();}take();s=t==='Readonly'?args[0]:t==='Array'||t==='ReadonlyArray'?{type:'array',items:args[0]}:{type:'object'};}
 while(peek()==='['&&tokens[pos+1]===']'){take();take();s={type:'array',items:s};}return s;
}
function members(){const properties={},required=[];while(pos<tokens.length&&peek()!=='}'){
 let name=take();if(name==='readonly')name=take();if(name===';')continue;
 if(name==='['){let level=1;while(pos<tokens.length&&level){const t=take();if(t==='[')level++;if(t===']')level--;}if(peek()===':'){take();type();}if(peek()===';')take();continue;}
 name=name.replace(/^['"]|['"]$/g,'');const optional=peek()==='?';if(optional)take();if(take()!==':')throw Error('Unsupported SerpAPI member '+name);properties[name]=type();if(!optional)required.push(name);if(peek()===';')take();
 }if(peek()==='}')take();return {type:'object',properties,required};}
const defs={};while(pos<tokens.length){if(take()!=='interface')continue;const name=take(),parents=[];if(peek()==='extends'){take();while(peek()!=='{'&&pos<tokens.length){const n=take();if(n!==',')parents.push({$ref:'#/components/schemas/'+n});}}if(take()!=='{')throw Error('Expected interface body');const s=members();defs[name]=parents.length?{allOf:[...parents,s]}:s;}
process.stdout.write(JSON.stringify({components:{schemas:defs}}));
