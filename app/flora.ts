import * as THREE from "three";

type TerrainHeight = (x: number, z: number) => number;

type TreePreset = {
  name: "SENTINEL" | "THICKET" | "SNAPPED" | "LEANER" | "SAPLING";
  height: number;
  radius: number;
  taper: number;
  levels: number;
  splits: number;
  angle: number;
  child: number;
  gnarl: number;
  droop: number;
  encrust: number;
  sides: number;
  broke: boolean;
};

type WeedPreset = {
  name: "CURTAIN" | "WAIST" | "TURF" | "SPARSE";
  height: number;
  width: number;
  taper: number;
  segments: number;
  lean: number;
  blades: number;
  radius: number;
  variation: number;
  sway: number;
  speed: number;
  wave: number;
};

export type CurtainBed = { x: number; z: number; radius: number; height: number };
export type FloraObstacle = { x: number; z: number; radius: number; minY: number; maxY: number };

export type DrownedFlora = {
  group: THREE.Group;
  treeMeshes: THREE.Mesh[];
  curtainBeds: CurtainBed[];
  obstacles: FloraObstacle[];
  update: (time: number) => void;
  dispose: () => void;
};

const TREE_PRESETS: readonly TreePreset[] = [
  { name: "SENTINEL", height: 12.5, radius: .22, taper: .76, levels: 4, splits: 2, angle: 32, child: .68, gnarl: .20, droop: .06, encrust: .38, sides: 6, broke: false },
  { name: "THICKET", height: 7.5, radius: .15, taper: .68, levels: 5, splits: 3, angle: 52, child: .74, gnarl: .38, droop: .22, encrust: .48, sides: 5, broke: false },
  { name: "SNAPPED", height: 5.5, radius: .24, taper: .55, levels: 2, splits: 2, angle: 38, child: .60, gnarl: .34, droop: .10, encrust: .52, sides: 6, broke: true },
  { name: "LEANER", height: 9.5, radius: .19, taper: .74, levels: 4, splits: 2, angle: 58, child: .70, gnarl: .72, droop: .48, encrust: .45, sides: 5, broke: false },
  { name: "SAPLING", height: 4, radius: .09, taper: .70, levels: 3, splits: 2, angle: 44, child: .70, gnarl: .26, droop: .14, encrust: .34, sides: 4, broke: false },
] as const;

const WEED_PRESETS: readonly WeedPreset[] = [
  { name: "CURTAIN", height: 2.80, width: .17, taper: .60, segments: 7, lean: .30, blades: 66, radius: .95, variation: .34, sway: .28, speed: .50, wave: 1.7 },
  { name: "WAIST", height: 1.05, width: .14, taper: .58, segments: 5, lean: .40, blades: 44, radius: .75, variation: .42, sway: .34, speed: .62, wave: 1.4 },
  { name: "TURF", height: .34, width: .10, taper: .52, segments: 3, lean: .46, blades: 72, radius: 1.10, variation: .50, sway: .22, speed: .80, wave: 1.0 },
  { name: "SPARSE", height: 2.55, width: .20, taper: .66, segments: 6, lean: .52, blades: 17, radius: 1.35, variation: .46, sway: .42, speed: .46, wave: 2.1 },
] as const;

function mulberry32(seed: number) {
  return () => {
    let value = (seed += 0x6d2b79f5);
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function treeGeometry(preset: TreePreset, seed: number) {
  const random = mulberry32(seed);
  const positions: number[] = [];
  const indices: number[] = [];
  const budget = { remaining: preset.name === "THICKET" ? 72 : preset.name === "SENTINEL" ? 46 : 34 };

  function addBranch(start: THREE.Vector3, heading: THREE.Vector3, length: number, radius: number, level: number, collar: boolean) {
    if (budget.remaining-- <= 0 || length < .34 || radius < .018) return;
    const ringCount = Math.max(3, Math.min(14, Math.ceil(length / .72) + 1));
    const sides = level === 0 ? preset.sides + 2 : Math.max(4, preset.sides - 1);
    const centers: THREE.Vector3[] = [start.clone()];
    const tangents: THREE.Vector3[] = [heading.clone().normalize()];
    for (let ring = 1; ring < ringCount; ring++) {
      const tangent = tangents[ring - 1].clone();
      tangent.x += (random() - .5) * preset.gnarl * .18;
      tangent.z += (random() - .5) * preset.gnarl * .18;
      tangent.y -= preset.droop * .024 * ring;
      tangent.normalize();
      tangents.push(tangent);
      centers.push(centers[ring - 1].clone().addScaledVector(tangent, length / (ringCount - 1)));
    }

    const normal = new THREE.Vector3();
    if (Math.abs(tangents[0].y) < .92) normal.crossVectors(tangents[0], new THREE.Vector3(0, 1, 0));
    else normal.crossVectors(tangents[0], new THREE.Vector3(1, 0, 0));
    normal.normalize();
    let previousTangent = tangents[0].clone();
    const ringStarts: number[] = [];
    for (let ring = 0; ring < ringCount; ring++) {
      const tangent = tangents[ring];
      if (ring > 0) {
        const frameRotation = new THREE.Quaternion().setFromUnitVectors(previousTangent, tangent);
        normal.applyQuaternion(frameRotation).normalize();
      }
      const binormal = new THREE.Vector3().crossVectors(tangent, normal).normalize();
      normal.crossVectors(binormal, tangent).normalize();
      previousTangent = tangent.clone();
      ringStarts.push(positions.length / 3);
      const progress = ring / (ringCount - 1);
      const baseRadius = radius * THREE.MathUtils.lerp(1, preset.taper, progress) * (collar && ring === 0 ? 1.42 : 1);
      for (let side = 0; side < sides; side++) {
        const angle = side / sides * Math.PI * 2;
        const encrust = 1 + (random() - .5) * preset.encrust * .23;
        const vertex = centers[ring].clone()
          .addScaledVector(normal, Math.cos(angle) * baseRadius * encrust)
          .addScaledVector(binormal, Math.sin(angle) * baseRadius * encrust);
        positions.push(vertex.x, vertex.y, vertex.z);
      }
      if (ring > 0) {
        const previous = ringStarts[ring - 1];
        const current = ringStarts[ring];
        for (let side = 0; side < sides; side++) {
          const next = (side + 1) % sides;
          indices.push(previous + side, current + side, previous + next, previous + next, current + side, current + next);
        }
      }
    }

    const endCenter = positions.length / 3;
    const end = centers[centers.length - 1];
    positions.push(end.x, end.y, end.z);
    const finalRing = ringStarts[ringStarts.length - 1];
    for (let side = 0; side < sides; side++) indices.push(finalRing + side, endCenter, finalRing + (side + 1) % sides);

    if (level + 1 >= preset.levels) return;
    for (let split = 0; split < preset.splits; split++) {
      const progress = THREE.MathUtils.clamp(.38 + split * .23 + (random() - .5) * .09, .27, .86);
      const ring = Math.min(ringCount - 2, Math.max(1, Math.round(progress * (ringCount - 1))));
      const parentDirection = tangents[ring];
      const reference = Math.abs(parentDirection.y) < .92 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
      const branchNormal = new THREE.Vector3().crossVectors(parentDirection, reference).normalize();
      const branchBinormal = new THREE.Vector3().crossVectors(parentDirection, branchNormal).normalize();
      const azimuth = random() * Math.PI * 2;
      const radial = branchNormal.multiplyScalar(Math.cos(azimuth)).addScaledVector(branchBinormal, Math.sin(azimuth)).normalize();
      const angle = THREE.MathUtils.degToRad(preset.angle * (.84 + random() * .28));
      const childDirection = parentDirection.clone().multiplyScalar(Math.cos(angle)).addScaledVector(radial, Math.sin(angle));
      childDirection.y -= preset.droop * .1 * (level + 1);
      childDirection.normalize();
      const childStart = centers[ring].clone().addScaledVector(parentDirection, -radius * .72);
      addBranch(
        childStart,
        childDirection,
        length * preset.child * (.83 + random() * .24),
        radius * preset.taper * (.56 + random() * .11),
        level + 1,
        true,
      );
    }
  }

  addBranch(new THREE.Vector3(), new THREE.Vector3(0, 1, 0), preset.height, preset.radius, 0, false);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function appendWeedBed(
  preset: WeedPreset,
  centerX: number,
  centerZ: number,
  terrainHeight: TerrainHeight,
  random: () => number,
  positions: number[],
  indices: number[],
  bladeT: number[],
  phases: number[],
  motions: number[],
  axes: number[],
  bladeCount = preset.blades,
  radiusScale = 1,
) {
  for (let blade = 0; blade < bladeCount; blade++) {
    const radial = Math.sqrt(random()) * preset.radius * radiusScale;
    const polar = random() * Math.PI * 2;
    const x = centerX + Math.cos(polar) * radial;
    const z = centerZ + Math.sin(polar) * radial;
    const baseY = terrainHeight(x, z) + .035;
    const height = preset.height * (1 + (random() - .5) * preset.variation);
    const facing = random() * Math.PI * 2;
    const leanAngle = random() * Math.PI * 2;
    const sideX = Math.cos(facing);
    const sideZ = Math.sin(facing);
    const axisX = Math.cos(leanAngle + Math.PI * .5);
    const axisZ = Math.sin(leanAngle + Math.PI * .5);
    const phase = random() * Math.PI * 2;
    const start = positions.length / 3;
    for (let segment = 0; segment <= preset.segments; segment++) {
      const progress = segment / preset.segments;
      const leanDistance = preset.lean * height * progress * progress * .42;
      const centerBladeX = x + Math.cos(leanAngle) * leanDistance;
      const centerBladeZ = z + Math.sin(leanAngle) * leanDistance;
      const halfWidth = preset.width * .5 * THREE.MathUtils.lerp(1, preset.taper, progress);
      for (const side of [-1, 1]) {
        positions.push(centerBladeX + sideX * halfWidth * side, baseY + height * progress, centerBladeZ + sideZ * halfWidth * side);
        bladeT.push(progress);
        phases.push(phase);
        motions.push(preset.sway, preset.speed, preset.wave);
        axes.push(axisX, axisZ);
      }
      if (segment > 0) {
        const previous = start + (segment - 1) * 2;
        const current = start + segment * 2;
        indices.push(previous, current, previous + 1, previous + 1, current, current + 1);
      }
    }
  }
}

export function createDrownedFlora(terrainHeight: TerrainHeight): DrownedFlora {
  const group = new THREE.Group();
  group.name = "drowned-flora";
  const treeMeshes: THREE.Mesh[] = [];
  const curtainBeds: CurtainBed[] = [];
  const obstacles: FloraObstacle[] = [];
  const treeMaterial = new THREE.MeshStandardMaterial({ color: 0x263126, roughness: 1, flatShading: true });
  const treeRandom = mulberry32(0x715ee);
  const treeCounts = new Map<TreePreset["name"], number>([
    ["SENTINEL", 3], ["THICKET", 28], ["SNAPPED", 5], ["LEANER", 5], ["SAPLING", 11],
  ]);
  let treeIndex = 0;
  for (const preset of TREE_PRESETS) {
    const count = treeCounts.get(preset.name) ?? 0;
    for (let index = 0; index < count; index++) {
      let x = 0;
      let z = 0;
      if (preset.name === "SENTINEL") {
        const landmarks = [[-43, 12], [-68, -24], [-26, -34]] as const;
        [x, z] = landmarks[index % landmarks.length];
      } else {
        x = -28 - treeRandom() * 47;
        z = -41 + treeRandom() * 83;
      }
      const scale = .75 + treeRandom() * .5;
      const geometry = treeGeometry(preset, 2401 + treeIndex * 977);
      const mesh = new THREE.Mesh(geometry, treeMaterial);
      mesh.name = `drowned-tree-${preset.name.toLowerCase()}-${index}`;
      mesh.position.set(x, terrainHeight(x, z), z);
      mesh.scale.setScalar(scale);
      mesh.rotation.y = treeRandom() * Math.PI * 2;
      if (preset.name === "LEANER") {
        const lean = THREE.MathUtils.degToRad(8 + treeRandom() * 12) * (treeRandom() > .5 ? 1 : -1);
        mesh.rotation.z = lean;
        mesh.rotation.x = lean * (treeRandom() - .5);
      }
      mesh.castShadow = false;
      mesh.receiveShadow = true;
      group.add(mesh);
      treeMeshes.push(mesh);
      obstacles.push({ x, z, radius: preset.name === "SENTINEL" ? 1.8 : 1.25, minY: mesh.position.y, maxY: mesh.position.y + preset.height * scale + 1 });
      treeIndex++;
    }
  }

  // A few of the old, branchless snags remain among the detailed trees. They
  // are tall enough to register from shallower water and keep the forest stark.
  for (let index = 0; index < 14; index++) {
    const x = -31 - treeRandom() * 48;
    const z = -42 + treeRandom() * 84;
    const height = 9.5 + treeRandom() * 7.5;
    const geometry = new THREE.CylinderGeometry(.055, .15 + treeRandom() * .08, height, 5, 3, false);
    geometry.translate(0, height * .5, 0);
    const mesh = new THREE.Mesh(geometry, treeMaterial);
    mesh.name = `drowned-tree-branchless-${index}`;
    mesh.position.set(x, terrainHeight(x, z), z);
    mesh.rotation.y = treeRandom() * Math.PI * 2;
    mesh.rotation.z = (treeRandom() - .5) * .09;
    mesh.rotation.x = (treeRandom() - .5) * .045;
    mesh.receiveShadow = true;
    group.add(mesh);
    treeMeshes.push(mesh);
    obstacles.push({ x, z, radius: 1.05, minY: mesh.position.y, maxY: mesh.position.y + height + 1 });
  }

  const positions: number[] = [];
  const indices: number[] = [];
  const bladeT: number[] = [];
  const phases: number[] = [];
  const motions: number[] = [];
  const axes: number[] = [];
  const weedRandom = mulberry32(0x5ea83d);
  const byName = new Map(WEED_PRESETS.map((preset) => [preset.name, preset]));
  const curtain = byName.get("CURTAIN")!;
  const sparse = byName.get("SPARSE")!;
  function patchIsStable(x: number, z: number, radius: number) {
    const center = terrainHeight(x, z);
    if (center > -1.8) return false;
    for (const sampleRadius of [radius * .5, radius]) {
      for (let sample = 0; sample < 12; sample++) {
        const angle = sample / 12 * Math.PI * 2;
        const height = terrainHeight(x + Math.cos(angle) * sampleRadius, z + Math.sin(angle) * sampleRadius);
        if (Math.abs(height - center) > .64) return false;
      }
    }
    return true;
  }
  function stableCenter(wantedX: number, wantedZ: number, radius: number) {
    if (patchIsStable(wantedX, wantedZ, radius)) return { x: wantedX, z: wantedZ };
    for (let attempt = 1; attempt <= 28; attempt++) {
      const distance = .55 + Math.ceil(attempt / 7) * .72;
      const angle = attempt * 2.399963;
      const x = wantedX + Math.cos(angle) * distance;
      const z = wantedZ + Math.sin(angle) * distance;
      if (patchIsStable(x, z, radius)) return { x, z };
    }
    return null;
  }
  const curtainCenters = [[-45, 8], [-34, -16], [20, -39], [8, -12], [47, -24], [-8, 5], [29, -6]] as const;
  for (const [wantedX, wantedZ] of curtainCenters) {
    const center = stableCenter(wantedX, wantedZ, curtain.radius);
    if (!center) continue;
    const { x, z } = center;
    appendWeedBed(curtain, x, z, terrainHeight, weedRandom, positions, indices, bladeT, phases, motions, axes);
    curtainBeds.push({ x, z, radius: curtain.radius * 1.08, height: curtain.height });
    const angle = weedRandom() * Math.PI * 2;
    const sparseCenter = stableCenter(x + Math.cos(angle) * 2.3, z + Math.sin(angle) * 2.3, sparse.radius * .44);
    if (sparseCenter) {
      appendWeedBed(sparse, sparseCenter.x, sparseCenter.z, terrainHeight, weedRandom, positions, indices, bladeT, phases, motions, axes, 6, .44);
    }
  }

  function scatter(preset: WeedPreset, wanted: number) {
    let made = 0;
    for (let attempt = 0; attempt < wanted * 55 && made < wanted; attempt++) {
      const radius = Math.sqrt(weedRandom()) * 104;
      const angle = weedRandom() * Math.PI * 2;
      const x = Math.cos(angle) * radius * 1.04;
      const z = Math.sin(angle) * radius;
      const floor = terrainHeight(x, z);
      if (floor > -2 || (floor < -33 && weedRandom() < .84)) continue;
      const depthRetention = THREE.MathUtils.clamp((34 + floor) / 19, .08, 1);
      if (weedRandom() > depthRetention) continue;
      const clumpSize = 2 + Math.floor(Math.pow(weedRandom(), .62) * 31);
      const radiusScale = THREE.MathUtils.lerp(.26, 1.42, THREE.MathUtils.smoothstep(clumpSize, 2, 32));
      const safe = stableCenter(x, z, preset.radius * radiusScale);
      if (!safe) continue;
      appendWeedBed(preset, safe.x, safe.z, terrainHeight, weedRandom, positions, indices, bladeT, phases, motions, axes, clumpSize, radiusScale);
      made++;
    }
  }
  scatter(byName.get("WAIST")!, 72);
  scatter(byName.get("TURF")!, 96);
  scatter(sparse, 18);

  const weedGeometry = new THREE.BufferGeometry();
  weedGeometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  weedGeometry.setAttribute("aBladeT", new THREE.Float32BufferAttribute(bladeT, 1));
  weedGeometry.setAttribute("aBladePhase", new THREE.Float32BufferAttribute(phases, 1));
  weedGeometry.setAttribute("aMotion", new THREE.Float32BufferAttribute(motions, 3));
  weedGeometry.setAttribute("aSwayAxis", new THREE.Float32BufferAttribute(axes, 2));
  weedGeometry.setIndex(indices);
  weedGeometry.computeVertexNormals();
  weedGeometry.computeBoundingSphere();
  const weedMaterial = new THREE.MeshStandardMaterial({ color: 0x405b3a, roughness: .96, side: THREE.DoubleSide, flatShading: false });
  let timeUniform: { value: number } | null = null;
  weedMaterial.onBeforeCompile = (shader) => {
    shader.uniforms.uFloraTime = { value: 0 };
    timeUniform = shader.uniforms.uFloraTime as { value: number };
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>\nuniform float uFloraTime;\nattribute float aBladeT;\nattribute float aBladePhase;\nattribute vec3 aMotion;\nattribute vec2 aSwayAxis;`)
      .replace("#include <begin_vertex>", `
        vec3 transformed = vec3(position);
        float floraWave = sin(uFloraTime * aMotion.y + aBladePhase + aBladeT * aMotion.z * 3.14159265);
        float floraDisplacement = floraWave * aMotion.x * aBladeT * aBladeT;
        transformed.x += aSwayAxis.x * floraDisplacement;
        transformed.z += aSwayAxis.y * floraDisplacement;
      `);
  };
  weedMaterial.customProgramCacheKey = () => "murk-drowned-weeds-v1";
  const weeds = new THREE.Mesh(weedGeometry, weedMaterial);
  weeds.name = "drowned-weed-beds";
  weeds.receiveShadow = true;
  weeds.frustumCulled = false;
  group.add(weeds);

  group.userData.treePresets = Object.fromEntries(treeCounts);
  group.userData.branchlessSnags = 14;
  group.userData.weedDistribution = "variable-clumps-2-to-32-flat-ground-only";
  group.userData.weedPresets = WEED_PRESETS.map(({ name, height, blades }) => ({ name, height, blades }));
  group.userData.curtainCoverBeds = curtainBeds.length;

  return {
    group,
    treeMeshes,
    curtainBeds,
    obstacles,
    update: (time: number) => {
      if (timeUniform) timeUniform.value = time;
    },
    dispose: () => {
      const disposed = new Set<THREE.BufferGeometry>();
      for (const mesh of treeMeshes) {
        if (!disposed.has(mesh.geometry)) {
          mesh.geometry.dispose();
          disposed.add(mesh.geometry);
        }
      }
      weedGeometry.dispose();
      treeMaterial.dispose();
      weedMaterial.dispose();
    },
  };
}
