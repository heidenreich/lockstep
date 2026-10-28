const fs=require("fs"),path=require("path");
const src=fs.readFileSync(path.join(__dirname,"logic.js"),"utf8");
const G=new Function(`let best=0;function render(){}function flash(){}
${src}
return {get state(){return state;},newGame,step,settings,enemyAt,isWall,W,H};`)();
G.settings.delay=+process.argv[2]||6;G.settings.hurt=process.argv[3]==="hurt";G.newGame();
const p=[[1,0],[-1,0]];let t=0;while(!G.state.over&&t<600){const m=p[t%2];G.step(m[0],m[1]);t++;}
const S=G.state;console.log("over",S.over,"wave",S.wave,"hp",S.player.hp,"score",S.score,"turns",t);
for(let y=0;y<G.H;y++){let r="";for(let x=0;x<G.W;x++){const e=G.enemyAt(x,y);r+=(S.player.x===x&&S.player.y===y)?"@":(S.echo&&S.echo.x===x&&S.echo.y===y)?"E":e?(e.type==="brute"?"B":"s"):G.isWall(x,y)?"#":".";}console.log(r);}
console.log(S.log.map(l=>l.t+" "+l.msg).join("\n"));
