const link = document.querySelector<HTMLAnchorElement>('#landing-estimate');

link?.addEventListener('click', () => {
  const weight = document.querySelector<HTMLInputElement>('#weight')?.value ?? '';
  const length = document.querySelector<HTMLInputElement>('#length')?.value ?? '';
  const width = document.querySelector<HTMLInputElement>('#width')?.value ?? '';
  const height = document.querySelector<HTMLInputElement>('#height')?.value ?? '';
  const route = document.querySelector<HTMLSelectElement>('#landing-route')?.value ?? 'US';
  try {
    sessionStorage.setItem('gke:estimate', JSON.stringify({weight, length, width, height, route, service: ''}));
  } catch {
    // The calculator is still reachable when site storage is disabled.
  }
});
