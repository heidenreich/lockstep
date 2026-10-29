const fs=require("fs"),path=require("path");
const src=fs.readFileSync(path.join(__dirname,"logic.js"),"utf8");
function makeGame(){return new Function(`let best=0;function render(){}function flash(){}
${src}
return {get state(){return state;},set state(s){state=s;},newGame,step,settings,enemyAt,dist,isWall,inB,DOOR,W,H,DIRS};`)();}
const R=[1,0],L=[-1,0],U=[0,-1],D=[0,1],W=[0,0];
const pats={camp2:[R,L],camp3:[R,L,W],camp4:[R,W,L,W],camp5:[R,W,L,W,W],camp6:[R,W,W,L,W,W],camp8:[R,W,W,W,L,W,W,W],
 door4:[R,R,R,L,L,L,W,W], vert4:[U,W,D,W], pin:[R,R,R,R,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W]};
const N=+process.argv[2]||200;
for(const [cfgName,cfg] of [["d6 hurt",[6,true]],["d6 nohurt",[6,false]],["d4 hurt",[4,true]],["d8 hurt",[8,true]],["d10 hurt",[10,true]]]){
 console.log("== "+cfgName);
 for(const [pn,p] of Object.entries(pats)){
  let to=0,waves=[],scores=[];
  for(let i=0;i<N;i++){const G=makeGame();G.settings.delay=cfg[0];G.settings.hurt=cfg[1];G.newGame();let t=0;
   while(!G.state.over&&t<600){const m=p[t%p.length];G.step(m[0],m[1]);t++;}
   if(!G.state.over)to++;waves.push(G.state.wave);scores.push(G.state.score);}
  waves.sort((a,b)=>a-b);scores.sort((a,b)=>a-b);
  console.log(`  ${pn.padEnd(7)} alive@600: ${to}/${N}  wave med ${waves[N>>1]} max ${waves[N-1]}  score med ${scores[N>>1]} max ${scores[N-1]}`);
 }}
