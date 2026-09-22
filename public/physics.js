/* Search motion follows the reference: pile -> rising logo -> docked result -> falling logo. */
(() => {
  'use strict';
  const { Engine, Bodies, Body, Composite, Sleeping, Query, Constraint } = Matter;
  const canvas = document.querySelector('#logo-canvas');
  const context = canvas.getContext('2d');
  const flightCanvas = document.createElement('canvas');
  flightCanvas.id = 'flight-canvas';
  flightCanvas.setAttribute('aria-hidden', 'true');
  document.body.append(flightCanvas);
  const flightContext = flightCanvas.getContext('2d');
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const engine = Engine.create({ enableSleeping: true, positionIterations: 8, velocityIterations: 8 });
  let width = innerWidth, height = innerHeight, clock = 0, lastTime = 0, accumulator = 0;
  let motionEnabled = !preference.matches, frame, drag = null;
  let hoverPoint = null;
  let warmup = 0, nextAmbient = 8;
  const tiles = [], sprites = new Map(), flights = new Map(), docked = new Map();
  const fixedStep = 1000 / 60;
  const seed = value => { const n = Math.sin(value * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); };
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = value => Math.max(0, Math.min(1, value));
  const easeOut = t => 1 - (1 - t) ** 3;
  const smooth = t => t * t * (3 - 2 * t);
  let walls = [];

  function spriteFor(company) {
    const key = String(company.id);
    if (sprites.has(key)) return sprites.get(key);
    const sprite = document.createElement('canvas');
    sprite.width = sprite.height = 80;
    const painter = sprite.getContext('2d');
    painter.beginPath(); painter.roundRect(0, 0, 80, 80, 15); painter.clip();
    painter.fillStyle = `hsl(${Math.round(seed(Number(company.id)) * 360)} 40% 42%)`;
    painter.fillRect(0, 0, 80, 80);
    painter.fillStyle = '#fff'; painter.font = 'bold 43px Arial';
    painter.textAlign = 'center'; painter.textBaseline = 'middle';
    painter.fillText((company.name || '?').slice(0, 1), 40, 42);
    if (/^https?:\/\//.test(company.small_logo_thumb_url || '')) {
      const image = new Image();
      image.onload = () => {
        painter.fillStyle = '#fff'; painter.fillRect(0, 0, 80, 80);
        const scale = Math.min(80 / image.naturalWidth, 80 / image.naturalHeight);
        const w = image.naturalWidth * scale, h = image.naturalHeight * scale;
        painter.drawImage(image, (80 - w) / 2, (80 - h) / 2, w, h);
      };
      image.src = company.small_logo_thumb_url;
    }
    sprites.set(key, sprite);
    return sprite;
  }

  function addTile(company, x, y, size, angle) {
    const body = Bodies.rectangle(x, y, size, size, {
      angle, chamfer: { radius: size * .14 }, restitution: .04,
      friction: .85, frictionStatic: 1.4, frictionAir: .018, sleepThreshold: 45,
    });
    const tile = { company, body, size, sprite: spriteFor(company), mode: 'pile' };
    tiles.push(tile); Composite.add(engine.world, body);
    return tile;
  }

  function setBounds() {
    engine.gravity.y = 1.15;
    walls.forEach(body => Composite.remove(engine.world, body));
    walls = [Bodies.rectangle(width / 2, height + 30, width + 100, 60, { isStatic: true }),
      Bodies.rectangle(-30, height / 2, 60, height * 3, { isStatic: true }),
      Bodies.rectangle(width + 30, height / 2, 60, height * 3, { isStatic: true })];
    Composite.add(engine.world, walls);
  }

  function resize() {
    const oldWidth = width, oldHeight = height;
    width = innerWidth; height = innerHeight;
    const ratio = Math.min(devicePixelRatio || 1, 2);
    for (const surface of [canvas, flightCanvas]) {
      surface.width = Math.round(width * ratio); surface.height = Math.round(height * ratio);
      surface.getContext('2d').setTransform(ratio, 0, 0, ratio, 0, 0);
    }
    setBounds();
    for (const tile of tiles) if (tile.mode === 'pile') {
      Body.setPosition(tile.body, { x: tile.body.position.x / oldWidth * width,
        y: height - (oldHeight - tile.body.position.y) });
      Sleeping.set(tile.body, false);
    }
    // Finish flights at their responsive DOM slot rather than an obsolete coordinate.
    for (const flight of flights.values()) if (flight.kind === 'lift') land(flight);
    for (const [key, flight] of flights) if (flight.kind === 'lift') flights.delete(key);
  }

  function setCompanies(companies) {
    tiles.forEach(tile => Composite.remove(engine.world, tile.body));
    tiles.length = 0; flights.clear(); docked.clear();
    const featured = [...companies].sort((a, b) => Number(b.top_company) - Number(a.top_company) || (b.launched_at || 0) - (a.launched_at || 0));
    const size = Math.max(13, Math.min(23, width / 55));
    const spacing = size * 1.34;
    const count = Math.min(650, companies.length, Math.round(width * Math.min(height * .29, width * .24) * .62 / (size * size)));
    let index = 0;
    for (let row = 0; index < count; row++) {
      const columns = Math.max(3, Math.floor(width / spacing) - row * 2);
      for (let column = 0; column < columns && index < count; column++, index++) {
        const x = width / 2 + (column - (columns - 1) / 2) * spacing + (row % 2 ? size * .12 : 0);
        const y = height - size * .8 - row * spacing;
        addTile(featured[index], x, y, size * (.88 + seed(index + 8) * .24), (seed(index) - .5) * 1.25);
      }
    }
    // Settle before revealing; polygon contact and sleeping replace the old overlapping circles.
    warmup = 200;
    canvas.style.opacity = '0';
  }

  function drawSprite(ctx, tile, x, y, size, angle) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
    ctx.drawImage(tile.sprite, -size / 2, -size / 2, size, size); ctx.restore();
  }

  function findTile(company, index) {
    const existing = tiles.find(tile => tile.company.id === company.id && tile.mode === 'pile');
    if (existing) return existing;
    // The visual pile is a bounded sample; attach an unsampled match to a resting surface slot.
    const available = tiles.filter(tile => tile.mode === 'pile').sort((a, b) => a.body.position.y - b.body.position.y);
    const tile = available[Math.min(available.length - 1, index % Math.max(1, Math.floor(available.length * .35)))];
    if (!tile) return addTile(company, width * .5, height * .8, 18, 0);
    tile.company = company; tile.sprite = spriteFor(company);
    return tile;
  }

  function land(flight) {
    const { tile, card, element } = flight;
    tile.mode = 'docked'; card.classList.remove('in-flight');
    docked.set(String(tile.company.id), { tile, card, element });
  }

  function lift(entries) {
    for (let index = 0; index < entries.length; index++) {
      const { company, card, element } = entries[index];
      const tile = findTile(company, index);
      const start = { x: tile.body.position.x, y: tile.body.position.y, angle: tile.body.angle };
      // Removing a support must let its immediate neighbours settle naturally.
      for (const neighbour of tiles) if (neighbour.mode === 'pile' &&
        Math.hypot(neighbour.body.position.x - start.x, neighbour.body.position.y - start.y) < tile.size * 2.5) {
        Sleeping.set(neighbour.body, false);
      }
      Composite.remove(engine.world, tile.body); tile.mode = 'lift';
      card.classList.add('in-flight');
      const rect = element.getBoundingClientRect();
      const flight = { kind: 'lift', tile, card, element, start, x: start.x, y: start.y,
        size: tile.size, angle: start.angle, target: { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2, size: rect.width },
        begins: clock + index * .013, duration: .86 + seed(index + 91) * .13 };
      if (!motionEnabled) land(flight); else flights.set(String(company.id), flight);
    }
  }

  function returnToWorld(flight, velocity) {
    const { tile } = flight;
    tile.mode = 'pile';
    Body.setPosition(tile.body, { x: flight.x, y: flight.y });
    Body.setAngle(tile.body, flight.angle);
    Body.setVelocity(tile.body, velocity);
    Body.setAngularVelocity(tile.body, flight.spin || 0);
    Sleeping.set(tile.body, false); Composite.add(engine.world, tile.body);
  }

  function release() {
    const outgoing = [...docked.values()]; docked.clear();
    for (const flight of flights.values()) if (flight.kind === 'lift') outgoing.push({ ...flight, current: flight });
    for (const [key, flight] of flights) if (flight.kind === 'lift') flights.delete(key);
    outgoing.forEach(({ tile, element, card, current }, index) => {
      // Failed remote images are replaced by initials; use the currently rendered logo.
      const rect = (card.querySelector('.company-logo') || element).getBoundingClientRect();
      const start = current ? { x: current.x, y: current.y, size: current.size, angle: current.angle } :
        { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2, size: rect.width, angle: 0 };
      card.classList.add('in-flight'); tile.mode = 'drop';
      const flight = { kind: 'drop', tile, start, x: start.x, y: start.y, size: start.size, angle: start.angle,
        begins: clock, spin: (seed(index + 26) - .5) * .018 };
      if (!motionEnabled) {
        flight.y = height - tile.size;
        returnToWorld(flight, { x: 0, y: 0 });
      } else flights.set(String(tile.company.id), flight);
    });
  }

  function animateFlights() {
    for (const [key, flight] of flights) {
      const elapsed = Math.max(0, clock - flight.begins);
      if (flight.kind === 'lift') {
        const t = clamp(elapsed / flight.duration);
        const upward = 1 - (1 - t) ** 2.7;
        const sideways = smooth(t);
        flight.x = lerp(flight.start.x, flight.target.x, sideways);
        flight.y = lerp(flight.start.y, flight.target.y, upward);
        flight.size = lerp(flight.tile.size, flight.target.size, smooth(clamp(t * 1.3)));
        flight.angle = flight.start.angle * (1 - easeOut(t)) + Math.sin(t * Math.PI * 2) * (1 - t) * .48;
        if (t >= 1) { land(flight); flights.delete(key); continue; }
      } else {
        // Shrink in place for ~180ms, then accelerated downward flight hands off to contacts.
        flight.size = lerp(flight.start.size, flight.tile.size, easeOut(clamp(elapsed / .18)));
        flight.x = flight.start.x;
        flight.y = flight.start.y + .5 * height * 5 * elapsed ** 2;
        flight.angle = flight.start.angle + flight.spin * elapsed * 60;
        // Keep the reference's fast fall until contact. The resting pile uses gentler
        // gravity so its bottom rows do not compress under hundreds of bodies.
        const surface = tiles.reduce((top, tile) => tile.mode === 'pile' &&
          tile.body.position.y > height * .55 && Math.abs(tile.body.position.x - flight.x) < tile.size
          ? Math.min(top, tile.body.bounds.min.y) : top, height);
        if (flight.y + flight.tile.size / 2 >= surface) {
          returnToWorld(flight, { x: 0, y: Math.min(12, height * 5 * elapsed / 60) });
          flights.delete(key); continue;
        }
      }
    }
  }

  function paint() {
    context.clearRect(0, 0, width, height); flightContext.clearRect(0, 0, width, height);
    for (const tile of tiles) if (tile.mode === 'pile') {
      drawSprite(context, tile, tile.body.position.x, tile.body.position.y, tile.size, tile.body.angle);
    }
    for (const flight of flights.values()) drawSprite(flightContext, flight.tile, flight.x, flight.y, flight.size, flight.angle);
  }

  function swirlNearbyLogos() {
    if (!hoverPoint || drag) return;
    const freshness = Math.exp(-(performance.now() - hoverPoint.time) / 95);
    if (freshness < .025) return;
    const radius = Math.min(85, width * .15);
    for (const tile of tiles) {
      if (tile.mode !== 'pile') continue;
      const body = tile.body;
      const dx = body.position.x - hoverPoint.x;
      const dy = body.position.y - hoverPoint.y;
      const distance = Math.hypot(dx, dy);
      if (distance >= radius) continue;
      const influence = .24 * (1 - distance / radius) ** 1.5 * freshness;
      const length = Math.max(distance, 1);
      Sleeping.set(body, false);
      // A passing hand gives loose pieces a short, uneven nudge. Motion fades
      // when the pointer stops, leaving gravity and contacts to do the rest.
      const variation = .75 + seed(Number(tile.company.id)) * .5;
      const strength = (4 + hoverPoint.speed * .018) * variation;
      Body.setVelocity(body, {
        x: Math.max(-12, Math.min(12, lerp(body.velocity.x, dx / length * strength + hoverPoint.vx * .004, influence))),
        y: Math.max(-14, Math.min(14, lerp(body.velocity.y, Math.min(-2, dy / length * strength - strength * .8), influence))),
      });
      Body.setAngularVelocity(body, lerp(body.angularVelocity, dx / length * .06 * variation, influence));
    }
  }

  function tick(time) {
    const delta = Math.min((time - (lastTime || time)) / 1000, .05); lastTime = time;
    if (!document.hidden) {
      if (warmup) {
        for (let i = 0; i < 12 && warmup; i++, warmup--) Engine.update(engine, fixedStep);
        if (!warmup) { tiles.forEach(tile => Sleeping.set(tile.body, true)); canvas.style.opacity = '1'; }
      } else if (motionEnabled) {
        clock += delta; accumulator += delta * 1000;
        animateFlights();
        while (accumulator >= fixedStep) { swirlNearbyLogos(); Engine.update(engine, fixedStep); accumulator -= fixedStep; }
        // Sparse individual drops, as in the reference. Never energize the entire pile.
        if (clock > nextAmbient && !flights.size) {
          const tile = tiles.find(item => item.mode === 'pile' && item.body.isSleeping && item.body.position.x < width * .15);
          if (tile) { Body.setPosition(tile.body, { x: width * (.2 + seed(clock) * .6), y: -30 }); Sleeping.set(tile.body, false); }
          nextAmbient = clock + 8 + seed(clock) * 7;
        }
      }
      paint();
    }
    frame = requestAnimationFrame(tick);
  }

  function pointerDown(event) {
    if (!motionEnabled || event.target !== canvas) return;
    const found = Query.point(tiles.filter(tile => tile.mode === 'pile').map(tile => tile.body), { x: event.clientX, y: event.clientY })[0];
    if (!found) return;
    Sleeping.set(found, false);
    drag = Constraint.create({ pointA: { x: event.clientX, y: event.clientY }, bodyB: found, stiffness: .12, damping: .15, length: 0 });
    Composite.add(engine.world, drag); canvas.setPointerCapture(event.pointerId);
  }
  function pointerMove(event) {
    if (drag) drag.pointA = { x: event.clientX, y: event.clientY };
    if (!motionEnabled || event.pointerType === 'touch' || event.buttons !== 0) { clearHover(); return; }
    const time = performance.now();
    const elapsed = hoverPoint ? Math.max(16, time - hoverPoint.time) / 1000 : 1;
    const vx = hoverPoint ? Math.max(-900, Math.min(900, (event.clientX - hoverPoint.x) / elapsed)) : 0;
    const vy = hoverPoint ? Math.max(-900, Math.min(900, (event.clientY - hoverPoint.y) / elapsed)) : 0;
    hoverPoint = { x: event.clientX, y: event.clientY, vx, speed: Math.min(900, Math.hypot(vx, vy)), time };
  }
  function clearHover() { hoverPoint = null; }
  function pointerUp() { if (drag) Composite.remove(engine.world, drag); drag = null; }
  function setMotion(enabled) {
    motionEnabled = Boolean(enabled); lastTime = 0; accumulator = 0;
    if (!motionEnabled) {
      clearHover(); pointerUp();
      for (const flight of flights.values()) {
        if (flight.kind === 'lift') land(flight);
        else { flight.y = height - flight.tile.size; returnToWorld(flight, { x: 0, y: 0 }); }
      }
      flights.clear();
    }
  }
  canvas.addEventListener('pointerdown', pointerDown);
  canvas.addEventListener('pointermove', pointerMove);
  canvas.addEventListener('pointerleave', clearHover);
  canvas.addEventListener('pointerup', pointerUp);
  canvas.addEventListener('pointercancel', pointerUp);
  window.addEventListener('resize', resize);
  window.addEventListener('blur', clearHover);
  preference.addEventListener('change', () => setMotion(!preference.matches));
  resize(); frame = requestAnimationFrame(tick);
  window.logoPhysics = { setCompanies, lift, release, setMotion,
    destroy() { cancelAnimationFrame(frame); pointerUp(); Composite.clear(engine.world); flightCanvas.remove(); }
  };
})();
