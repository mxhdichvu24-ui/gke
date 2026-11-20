import type { Object3D } from 'three';
import './warehouse.css';

type Locale = 'vi' | 'en';
type Route = 'US' | 'UK';
type Point = readonly [number, number, number];
type CameraView = { eye: Point; target: Point; span: number };

const stageIds = ['receiving', 'sorting', 'staging', 'outbound'] as const;
const stageStarts = [0, 3000, 6000, 9000] as const;
const duration = 13000;
const wideView: CameraView = { eye: [36, 30, 38], target: [0, 0, -1], span: 48 };
const dockView: CameraView = { eye: [14, 15, 23], target: [-9, .8, 1.5], span: 28 };
const sortingView: CameraView = { eye: [17, 22, 23], target: [-3, 1.1, -3.3], span: 24 };
const dispatchView: CameraView = { eye: [28, 18, 24], target: [9.5, .7, 2.5], span: 30 };
const stageViews = [dockView, sortingView, dispatchView, wideView];
const presets = [dockView, wideView, dispatchView];
const stillHotspots = [[36.5, 38.2], [48.4, 42.3], [56.3, 51.1], [55.2, 66.9]];
const scenarios = {
  US: { facility: 'GKE · US', parcels: 48, active: '03', inspected: 32, staging: 7.7, truckExit: 20 },
  UK: { facility: 'GKE · UK', parcels: 32, active: '02', inspected: 24, staging: 11.4, truckExit: 23 },
} as const;

const content = {
  vi: {
    title: 'Kho 3D',
    note: 'Mô phỏng quy trình vận hành',
    intro: 'Theo dõi một kiện hàng qua bốn bước, từ lúc xe tới kho đến khi hàng sẵn sàng đi quốc tế.',
    route: 'Tuyến mô phỏng', routes: ['Mỹ', 'Anh'],
    play: 'Phát mô phỏng', pause: 'Tạm dừng', resume: 'Tiếp tục', replay: 'Phát lại',
    reset: 'Đặt lại góc nhìn', views: 'Góc nhìn', viewNames: ['Cửa nhập', 'Toàn khu', 'Cửa xuất'],
    zoomIn: 'Phóng to', zoomOut: 'Thu nhỏ',
    viewAlt: 'Toàn cảnh kho GKE với cửa nhập, trạm phân loại, khu tập kết và đường xuất tuyến.',
    diagram: 'Cảnh mô phỏng kho GKE', loading: 'Đang tải mô hình 3D',
    unavailable: 'Đang dùng ảnh toàn cảnh. Bạn vẫn có thể chọn từng bước trong quy trình.',
    metrics: ['Kiện tại kho', 'Xe hoạt động', 'Kiện đã kiểm tra'],
    zone: 'Khu vực đang xem', timeline: 'Quy trình kiện hàng', vehicle: 'Phương tiện',
    vehicleNames: ['Xe tiếp nhận', 'Xe nâng', 'Xe xuất tuyến'],
    status: ['Tại cửa nhập', 'Chuyển kiện', 'Chờ xuất tuyến', 'Đang rời kho', 'Đã rời kho'],
    services: 'Xem dịch vụ tuyến này', servicesPath: '/dich-vu',
    stages: [
      ['Tiếp nhận', 'Xe đến cửa nhập. Nhân viên đối chiếu thông tin và đưa kiện mẫu lên pallet.'],
      ['Kiểm tra và phân loại', 'Kiện được đưa tới trạm cân đo và quét nhãn để phân vào đúng tuyến.'],
      ['Tập kết xuất kho', 'Pallet tới làn của tuyến đang chọn để chuẩn bị bàn giao.'],
      ['Xuất tuyến', 'Xe rời kho tới điểm bàn giao quốc tế mô phỏng trước khi đến đối tác chặng cuối.'],
    ],
  },
  en: {
    title: '3D Warehouse',
    note: 'Warehouse operations simulation',
    intro: 'Follow a parcel through four steps, from arrival at the warehouse to international dispatch.',
    route: 'Simulated route', routes: ['USA', 'UK'],
    play: 'Play simulation', pause: 'Pause', resume: 'Resume', replay: 'Replay',
    reset: 'Reset view', views: 'Camera views', viewNames: ['Loading dock', 'Site overview', 'Dispatch dock'],
    zoomIn: 'Zoom in', zoomOut: 'Zoom out',
    viewAlt: 'Overview of the GKE warehouse, including the receiving dock, sorting station, dispatch area and outbound road.',
    diagram: 'GKE warehouse simulation', loading: 'Loading the 3D model',
    unavailable: 'The overview image is active. You can still select each step in the process.',
    metrics: ['Parcels on site', 'Active vehicles', 'Parcels inspected'],
    zone: 'Selected area', timeline: 'Parcel timeline', vehicle: 'Vehicles',
    vehicleNames: ['Receiving truck', 'Forklift', 'Outbound truck'],
    status: ['At receiving dock', 'Moving parcel', 'Awaiting dispatch', 'Leaving the site', 'Departed'],
    services: 'View services for this route', servicesPath: '/en/services',
    stages: [
      ['Receiving', 'The truck arrives at the loading dock. The team checks the parcel details and moves the parcel onto a pallet.'],
      ['Weighing and sorting', 'The parcel passes the weighing and scanning station so staff can assign it to the correct lane.'],
      ['Dispatch staging', 'The pallet moves to the selected route’s lane, ready for handover.'],
      ['Outbound', 'The truck leaves for a simulated international handover before reaching the last-mile partner.'],
    ],
  },
} as const;

type WarehouseState = { route: Route; time: number; playing: boolean; stage: number };
type SceneControls = {
  render: (state: WarehouseState, reducedMotion: boolean) => void;
  view: (view: CameraView, animate: boolean) => void;
  zoom: (factor: number) => void;
  dispose: () => void;
};

function mountWarehouse(root: HTMLElement) {
  const locale: Locale = root.dataset.locale === 'en' ? 'en' : 'vi';
  const copy = content[locale];
  const state: WarehouseState = { route: 'US', time: 0, playing: false, stage: 0 };
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let scene: SceneControls | null = null;
  let raf = 0;
  let previousFrame: number | undefined;

  root.innerHTML = `
    <section class="wh-heading">
      <div>
        <p class="wh-label">${copy.note}</p>
        <h1>${copy.title}</h1>
        <p class="wh-intro">${copy.intro}</p>
      </div>
      <div class="wh-routes" role="group" aria-label="${copy.route}">
        ${copy.routes.map((label, i) => `<button type="button" data-wh-route="${i === 0 ? 'US' : 'UK'}">${label}</button>`).join('')}
      </div>
    </section>
    <section class="wh-workspace" aria-label="${copy.diagram}">
      <div class="wh-viewport">
        <img class="wh-still" src="/warehouse/overview.png" width="1440" height="900" alt="${copy.viewAlt}" fetchpriority="high">
        <div class="wh-canvas" aria-hidden="true"></div>
        <div class="wh-markers">
          ${copy.stages.map(([name], i) => `<button type="button" aria-label="${name}" data-wh-marker="${i}">${i + 1}</button>`).join('')}
        </div>
      </div>
      <div class="wh-kpis" aria-label="${copy.note}">
        ${copy.metrics.map((label) => `<div class="wh-kpi"><strong></strong><span>${label}</span></div>`).join('')}
      </div>
      <aside class="wh-zone wh-panel">
        <div class="wh-zone-copy" aria-live="polite" aria-atomic="true">
          <p class="wh-caption">${copy.zone}<span class="wh-facility"></span></p>
          <h2 class="wh-zone-title"></h2>
          <p class="wh-zone-description"></p>
          <a class="wh-services" hidden>${copy.services} <span aria-hidden="true">→</span></a>
        </div>
        <div class="wh-views" role="group" aria-label="${copy.views}">
          ${copy.viewNames.map((label, i) => `<button type="button" data-wh-view="${i}">${label}</button>`).join('')}
        </div>
      </aside>
      <div class="wh-actions">
        <button type="button" class="wh-play"><span aria-hidden="true">▶</span> <span>${copy.play}</span></button>
        <button type="button" class="wh-reset">${copy.reset}</button>
        <div class="wh-zoom" role="group" aria-label="${copy.views}">
          <button type="button" aria-label="${copy.zoomOut}" data-wh-zoom=".85">−</button>
          <button type="button" aria-label="${copy.zoomIn}" data-wh-zoom="1.18">+</button>
        </div>
        <span class="wh-render-status" role="status">${copy.loading}</span>
      </div>
      <div class="wh-timeline wh-panel">
        <h2>${copy.timeline}</h2>
        <ol>
          ${copy.stages.map(([name], i) => `<li><button type="button" data-wh-stage="${i}"><span class="wh-step-number" aria-hidden="true">${i + 1}</span><span>${name}</span></button></li>`).join('')}
        </ol>
      </div>
      <aside class="wh-vehicles wh-panel">
        <h2>${copy.vehicle}</h2>
        <ul>
          ${copy.vehicleNames.map((label) => `<li><span>${label}</span><span class="wh-vehicle-status"></span></li>`).join('')}
        </ul>
      </aside>
    </section>
  `;

  const get = <T extends Element = HTMLElement>(selector: string) => root.querySelector<T>(selector)!;
  const getAll = <T extends Element = HTMLElement>(selector: string) => Array.from(root.querySelectorAll<T>(selector));
  const stageButtons = getAll<HTMLButtonElement>('[data-wh-stage]');
  const markerButtons = getAll<HTMLButtonElement>('[data-wh-marker]');
  const routeButtons = getAll<HTMLButtonElement>('[data-wh-route]');
  const viewButtons = getAll<HTMLButtonElement>('[data-wh-view]');
  const zoomButtons = getAll<HTMLButtonElement>('[data-wh-zoom]');
  const cards = getAll('.wh-kpi strong');
  const vehicleStatus = getAll('.wh-vehicle-status');
  const facility = get('.wh-facility');
  const zoneTitle = get('.wh-zone-title');
  const zoneDescription = get('.wh-zone-description');
  const services = get<HTMLAnchorElement>('.wh-services');
  const play = get<HTMLButtonElement>('.wh-play');
  const reset = get<HTMLButtonElement>('.wh-reset');
  const renderStatus = get('.wh-render-status');
  const viewport = get('.wh-viewport');

  function updatePanels() {
    const { route, stage } = state;
    const scenario = scenarios[route];
    const [name, details] = copy.stages[stage];
    routeButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.whRoute === route)));
    stageButtons.forEach((button, index) => {
      if (index === stage) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
    markerButtons.forEach((button, index) => button.setAttribute('aria-pressed', String(index === stage)));
    [scenario.parcels, scenario.active, scenario.inspected].forEach((value, index) => {
      cards[index].textContent = String(value);
    });
    facility.textContent = scenario.facility;
    zoneTitle.textContent = name;
    zoneDescription.textContent = details;
    services.hidden = stage !== 3;
    services.href = `${copy.servicesPath}?route=${route}`;
    const labels = [copy.status[0], copy.status[1], copy.status[state.time >= duration ? 4 : stage === 3 ? 3 : 2]];
    vehicleStatus.forEach((element, index) => { element.textContent = labels[index]; });
  }

  function updatePlayButton() {
    const index = state.playing ? 0 : state.time >= duration ? 1 : state.time > 0 ? 2 : 3;
    const icons = ['❚❚', '↻', '▶', '▶'];
    const labels = [copy.pause, copy.replay, copy.resume, copy.play];
    play.children[0].textContent = icons[index];
    play.children[1].textContent = labels[index];
  }

  function stopPlayback() {
    state.playing = false;
    previousFrame = undefined;
    cancelAnimationFrame(raf);
    updatePlayButton();
  }

  function selectStage(index: number) {
    stopPlayback();
    state.stage = index;
    state.time = stageStarts[index];
    updatePanels();
    updatePlayButton();
    scene?.render(state, motion.matches);
    scene?.view(stageViews[index], !motion.matches);
  }

  function tick(now: number) {
    if (!state.playing) return;
    state.time = Math.min(duration, state.time + (previousFrame === undefined ? 0 : now - previousFrame));
    const currentStage = state.time < 3000 ? 0 : state.time < 6000 ? 1 : state.time < 9000 ? 2 : 3;
    const stageChanged = state.stage !== currentStage;
    if (stageChanged) {
      state.stage = currentStage;
      updatePanels();
      scene?.view(stageViews[currentStage], !motion.matches);
    }
    previousFrame = now;
    if (!motion.matches || stageChanged || state.time >= duration) scene?.render(state, motion.matches);
    if (state.time >= duration) {
      updatePanels();
      stopPlayback();
    }
    else raf = requestAnimationFrame(tick);
  }

  play.addEventListener('click', () => {
    if (state.playing) {
      stopPlayback();
      return;
    }
    if (state.time >= duration) selectStage(0);
    state.playing = true;
    updatePlayButton();
    scene?.view(stageViews[state.stage], !motion.matches);
    raf = requestAnimationFrame(tick);
  });

  routeButtons.forEach(button => {
    button.addEventListener('click', () => {
      const route = button.dataset.whRoute as Route;
      if (route === state.route) return;
      stopPlayback();
      state.route = route;
      state.stage = 0;
      state.time = 0;
      updatePanels();
      updatePlayButton();
      if (!scene) positionStillMarkers();
      scene?.render(state, motion.matches);
      scene?.view(wideView, !motion.matches);
    });
  });
  stageButtons.forEach((button, index) => button.addEventListener('click', () => selectStage(index)));
  markerButtons.forEach((button, index) => button.addEventListener('click', () => selectStage(index)));
  viewButtons.forEach((button, index) => button.addEventListener('click', () => scene?.view(presets[index], !motion.matches)));
  zoomButtons.forEach(button => button.addEventListener('click', () => scene?.zoom(Number(button.dataset.whZoom))));
  reset.addEventListener('click', () => scene?.view(wideView, !motion.matches));
  const onVisibilityChange = () => { if (document.hidden) stopPlayback(); };
  document.addEventListener('visibilitychange', onVisibilityChange);

  function positionStillMarkers() {
    markerButtons.forEach((button, index) => {
      const [left, top] = index === 2 && state.route === 'UK' ? [59.7, 53.6] : stillHotspots[index];
      button.style.left = `${left}%`;
      button.style.top = `${top}%`;
      button.hidden = false;
    });
  }

  function showFallback(message: string) {
    viewport.classList.remove('wh-has-scene');
    [...viewButtons, ...zoomButtons, reset].forEach(button => { button.disabled = true; });
    renderStatus.textContent = message;
    positionStillMarkers();
  }

  updatePanels();
  updatePlayButton();
  showFallback(copy.loading);

  let disposed = false;
  async function startScene() {
    try {
      // Keep the image and HTML controls available before importing the WebGL bundle.
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      if (disposed) return;
      scene = await createScene(viewport, get('.wh-canvas'), markerButtons, () => {
        scene?.dispose();
        scene = null;
        showFallback(copy.unavailable);
      });
      if (disposed) {
        scene.dispose();
        return;
      }
      scene.render(state, motion.matches);
      if (state.playing || state.stage > 0) scene.view(stageViews[state.stage], false);
      viewport.classList.add('wh-has-scene');
      [...viewButtons, ...zoomButtons, reset].forEach(button => { button.disabled = false; });
      renderStatus.textContent = '';
    } catch {
      showFallback(copy.unavailable);
    }
  }

  void startScene();
  addEventListener('pagehide', (event) => {
    stopPlayback();
    if (event.persisted) return;
    disposed = true;
    scene?.dispose();
    document.removeEventListener('visibilitychange', onVisibilityChange);
  });
}

function lerpPoint(a: Point, b: Point, ratio: number): Point {
  const lerp = (start: number, end: number) => start + (end - start) * ratio;
  return [lerp(a[0], b[0]), lerp(a[1], b[1]), lerp(a[2], b[2])];
}

function pathPoint(points: readonly Point[], progress: number): Point {
  const step = Math.max(0, Math.min(points.length - 1, progress * (points.length - 1)));
  const index = Math.floor(step);
  return lerpPoint(points[index], points[Math.min(points.length - 1, index + 1)], step - index);
}

async function createScene(
  viewport: HTMLElement,
  canvas: HTMLElement,
  markerButtons: HTMLButtonElement[],
  onContextLost: () => void,
): Promise<SceneControls> {
  const screen = document.createElement('canvas');
  const context = screen.getContext('webgl2', { alpha: false, antialias: true });
  if (!context) throw new Error('WebGL2 unavailable');

  const [THREE, { OrbitControls }, { GLTFLoader }] = await Promise.all([
    import('three'),
    import('three/addons/controls/OrbitControls.js'),
    import('three/addons/loaders/GLTFLoader.js'),
  ]);
  const { scene: model } = await new GLTFLoader().loadAsync('/warehouse/warehouse.glb');
  const renderer = new THREE.WebGLRenderer({ canvas: screen, context, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setClearColor('#e6f1f7');

  const world = new THREE.Scene();
  world.add(model);
  world.add(new THREE.HemisphereLight('#fbfdff', '#95a9ba', 2.2));
  const sun = new THREE.DirectionalLight('#fff7ea', 2);
  sun.position.set(-8, 25, 14);
  world.add(sun);

  const camera = new THREE.OrthographicCamera(-38, 38, 24, -24, .1, 180);
  camera.position.set(...wideView.eye);
  const orbit = new OrbitControls(camera, screen);
  orbit.target.set(...wideView.target);
  orbit.enableDamping = false;
  orbit.enablePan = false;
  const touchOnly = matchMedia('(pointer: coarse)').matches;
  orbit.enabled = !touchOnly;
  if (touchOnly) screen.style.touchAction = 'pan-y';
  orbit.minZoom = .65;
  orbit.maxZoom = 2.3;
  orbit.minPolarAngle = .24;
  orbit.maxPolarAngle = 1.33;
  orbit.update();

  const byName = (name: string) => {
    const node = model.getObjectByName(name);
    if (!node) throw new Error(`Missing warehouse node: ${name}`);
    return node;
  };
  const markerNodes = stageIds.map(id => byName(`hotspot_${id}`));
  const parcel = byName('tracked_parcel');
  const forklift = byName('forklift');
  const receiving = byName('receiving_truck');
  const outbound = byName('outbound_truck');
  const projection = new THREE.Vector3();
  let span = wideView.span;
  let width = 0;
  let height = 0;
  let cameraFrame = 0;
  let drawFrame = 0;
  let destroyed = false;

  function draw() {
    drawFrame = 0;
    if (destroyed) return;
    renderer.render(world, camera);
    markerNodes.forEach((node, index) => {
      node.getWorldPosition(projection).project(camera);
      const button = markerButtons[index];
      const outside = Math.abs(projection.x) > .96 || Math.abs(projection.y) > .94;
      button.style.left = `${50 + projection.x * 50}%`;
      button.style.top = `${50 - projection.y * 50}%`;
      button.hidden = outside && document.activeElement !== button;
    });
  }

  function requestDraw() {
    if (!drawFrame && !destroyed) drawFrame = requestAnimationFrame(draw);
  }

  function updateProjection() {
    const aspect = width / height;
    const vertical = span * Math.max(1, 1.45 / aspect);
    camera.left = -vertical * aspect / 2;
    camera.right = vertical * aspect / 2;
    camera.top = vertical / 2;
    camera.bottom = -vertical / 2;
    camera.updateProjectionMatrix();
    requestDraw();
  }

  function resize() {
    const nextWidth = Math.max(viewport.clientWidth, 1);
    const nextHeight = Math.max(viewport.clientHeight, 1);
    if (nextWidth === width && nextHeight === height) return;
    width = nextWidth;
    height = nextHeight;
    renderer.setSize(width, height, false);
    updateProjection();
  }

  function setObject(node: Object3D, points: readonly Point[], progress: number, align = true) {
    const position = pathPoint(points, progress);
    node.position.set(...position);
    if (align && points.length > 1) {
      const direction = Math.min(points.length - 2, Math.floor(progress * (points.length - 1)));
      const from = points[direction];
      const to = points[direction + 1];
      node.rotation.y = -Math.atan2(to[2] - from[2], to[0] - from[0]);
    }
  }

  function render(state: WarehouseState, reduced: boolean) {
    const time = reduced && state.time < duration ? stageStarts[state.stage] : state.time;
    const stage = state.stage;
    const segmentStart = stageStarts[stage];
    const segmentEnd = stage === 3 ? duration : stageStarts[stage + 1];
    const progress = (time - segmentStart) / (segmentEnd - segmentStart);
    const route = scenarios[state.route];
    const parcelPaths: readonly Point[][] = [
      [[-12, 1.6, 2.7], [-11, .77, .7]],
      [[-11, .77, .7], [-7, 1.10, .7], [-3, 1.55, -2.25]],
      [[-3, 1.55, -2.25], [1.9, .87, -.70], [route.staging, .86, -.8]],
      [[route.staging, .86, -.8], [10.8, .75, 2.45], [10.8, 1.00, 5.2]],
    ];
    const forkliftPaths: readonly Point[][] = [
      [[-10, .72, -1.85]], [[-11.95, .72, .7], [-8, .72, .7], [-4.6, .72, -1.7]],
      [[-4.6, .72, -1.7], [1.25, .72, -.3], [route.staging - 1.6, .72, -.3]],
      [[route.staging - 1.6, .72, -.3], [6.9, .72, -.3]],
    ];
    setObject(parcel, parcelPaths[stage], progress, false);
    setObject(forklift, forkliftPaths[stage], progress);
    setObject(receiving, [[-21.7, 0, 5.0], [-16, 0, 5.0]], stage === 0 ? progress : 1);
    setObject(outbound, [[10.8, 0, 5.2], [10.8, 0, 11.4], [route.truckExit, 0, 11.4]], stage === 3 ? progress : 0);
    parcel.visible = stage !== 3 || progress < .72;
    markerNodes[2].position.x = route.staging;
    requestDraw();
  }

  function changeView(destination: CameraView, animate: boolean) {
    cancelAnimationFrame(cameraFrame);
    const fromEye = camera.position.toArray();
    const fromTarget = orbit.target.toArray();
    const fromSpan = span;
    const fromZoom = camera.zoom;
    const start = performance.now();
    function move(now: number) {
      const t = animate ? Math.min(1, (now - start) / 570) : 1;
      const eased = t * t * (3 - 2 * t);
      camera.position.set(...lerpPoint(fromEye, destination.eye, eased));
      orbit.target.set(...lerpPoint(fromTarget, destination.target, eased));
      span = fromSpan + (destination.span - fromSpan) * eased;
      camera.zoom = fromZoom + (1 - fromZoom) * eased;
      orbit.update();
      updateProjection();
      if (t < 1) cameraFrame = requestAnimationFrame(move);
    }
    move(start);
  }

  const onLost = (event: Event) => { event.preventDefault(); onContextLost(); };
  const cancelCameraMove = () => cancelAnimationFrame(cameraFrame);
  screen.addEventListener('webglcontextlost', onLost, { once: true });
  orbit.addEventListener('change', requestDraw);
  orbit.addEventListener('start', cancelCameraMove);
  canvas.append(screen);
  const observer = new ResizeObserver(resize);
  observer.observe(viewport);
  resize();

  return {
    render,
    view: changeView,
    zoom(factor: number) {
      cancelCameraMove();
      camera.zoom = Math.max(orbit.minZoom, Math.min(orbit.maxZoom, camera.zoom * factor));
      camera.updateProjectionMatrix();
      requestDraw();
    },
    dispose() {
      if (destroyed) return;
      destroyed = true;
      cancelCameraMove();
      cancelAnimationFrame(drawFrame);
      observer.disconnect();
      screen.removeEventListener('webglcontextlost', onLost);
      orbit.dispose();
      const geometries = new Set<import('three').BufferGeometry>();
      const materials = new Set<import('three').Material>();
      world.traverse(node => {
        if (!(node instanceof THREE.Mesh)) return;
        geometries.add(node.geometry);
        const values = Array.isArray(node.material) ? node.material : [node.material];
        values.forEach(material => materials.add(material));
      });
      geometries.forEach(geometry => geometry.dispose());
      materials.forEach(material => material.dispose());
      renderer.dispose();
      screen.remove();
    },
  };
}

const warehouse = document.querySelector<HTMLElement>('#warehouse');
if (warehouse) mountWarehouse(warehouse);
