// One small authenticated version check; full data is fetched only on change.
export function createLiveSync({readVersion,onChange,onStatus,isVisible,interval=2000,setTimer=setTimeout,clearTimer=clearTimeout}){
  let stopped=true,busy=false,timer,version=null,failures=0;
  const schedule=()=>{if(!stopped)timer=setTimer(tick,Math.min(30000,interval*2**failures));};
  async function tick(){
    if(stopped||busy)return;
    clearTimer(timer);
    if(!isVisible()){schedule();return;}
    busy=true;
    try{
      const next=await readVersion();
      if(stopped)return;
      if(next!==version){await onChange();if(stopped)return;version=next;}
      failures=0;onStatus('live');
    }catch{if(!stopped){failures=Math.min(failures+1,4);onStatus('reconnecting');}}
    finally{busy=false;schedule();}
  }
  return {start(){if(stopped){stopped=false;void tick();}},stop(){stopped=true;clearTimer(timer);},wake(){if(!stopped)void tick();}};
}
