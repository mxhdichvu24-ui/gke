const controls = document.querySelectorAll<HTMLButtonElement>('[data-filter]');
const sections = document.querySelectorAll<HTMLElement>('[data-service-track]');

for (const control of controls) {
  control.addEventListener('click', () => {
    for (const option of controls) option.setAttribute('aria-pressed', String(option === control));
    for (const section of sections) section.hidden = control.dataset.filter !== 'ALL' &&
      control.dataset.filter !== section.dataset.serviceTrack;
  });
}

const destination=new URLSearchParams(location.search).get('route');
if(destination==='US'||destination==='UK')document.querySelector<HTMLButtonElement>('[data-filter="'+destination+'"]')?.click();
