// Progressive enhancement: the native select remains the submitted form value.
export function enhanceDestinations(){
 for(const select of document.querySelectorAll<HTMLSelectElement>('#landing-route,#contact-form select[name="route"]')){
  if(select.dataset.enhanced)continue;select.dataset.enhanced='true';
  const wrapper=document.createElement('div');wrapper.className='gke-destination';select.after(wrapper);select.hidden=true;
  const button=document.createElement('button');button.type='button';button.className='gke-destination-trigger';button.setAttribute('aria-haspopup','listbox');button.setAttribute('aria-expanded','false');
  const list=document.createElement('div');list.className='gke-destination-list';list.role='listbox';list.hidden=true;list.id=(select.id||'contact-route')+'-options';button.setAttribute('aria-controls',list.id);
  const label=select.labels?.[0];const id=(select.id||'contact-route')+'-trigger';button.id=id;if(label?.htmlFor)label.htmlFor=id;
  const countries={US:{code:'US',carriers:'USPS · UniUni · FedEx · SpeedX'},UK:{code:'UK',carriers:'Evri · Royal Mail'}};
  const names=Array.from(select.options);
  function paint(){
   const selected=names.find(option=>option.value===select.value)!;
   button.innerHTML=`<span class="gke-country-code">${selected.value}</span><span>${selected.textContent}</span><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="m6 8 4 4 4-4"/></svg>`;
   list.querySelectorAll<HTMLElement>('[role=option]').forEach(option=>option.setAttribute('aria-selected',String(option.dataset.value===select.value)));
   button.setAttribute('aria-label',(label?.childNodes[0]?.textContent?.trim()||'Destination')+': '+selected.textContent);
  }
  function open(value:boolean){list.hidden=!value;button.setAttribute('aria-expanded',String(value));}
  for(const option of names){
   const item=document.createElement('button');item.type='button';item.role='option';item.dataset.value=option.value;
   const meta=countries[option.value as keyof typeof countries];
   const code=document.createElement('span');code.className='gke-country-code';code.textContent=option.value;
   const text=document.createElement('span');const title=document.createElement('strong');title.textContent=option.textContent;const small=document.createElement('small');small.textContent=meta?.carriers||'';text.append(title,small);item.append(code,text);
   item.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();select.value=option.value;select.dispatchEvent(new Event('change',{bubbles:true}));select.dispatchEvent(new Event('input',{bubbles:true}));paint();open(false);button.focus();});list.append(item);
  }
  button.addEventListener('click',event=>{event.preventDefault();open(list.hidden);});
  wrapper.addEventListener('keydown',event=>{
   const items=Array.from(list.querySelectorAll<HTMLButtonElement>('button'));
   if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){event.preventDefault();open(true);const index=items.indexOf(document.activeElement as HTMLButtonElement);items[event.key==='Home'?0:event.key==='End'?items.length-1:(index+(event.key==='ArrowDown'?1:items.length-1))%items.length]?.focus();}
   if(event.key==='Escape'){open(false);button.focus();}
   if(event.key==='Tab')open(false);
  });
  document.addEventListener('pointerdown',event=>{if(!wrapper.contains(event.target as Node))open(false);});
  select.addEventListener('change',paint);select.form?.addEventListener('reset',()=>queueMicrotask(paint));
  wrapper.append(button,list);paint();
 }
}
