import * as THREE from "three";

export interface CreatureRig {
  /** Root object. Move and rotate this exactly as the original creature group. */
  group: THREE.Group;
  /** Head transform, exposed for central sight confirmation. */
  head: THREE.Object3D;
  /** Shared material, exposed for silhouette-pass lighting. */
  material: THREE.MeshStandardMaterial;
  /** Animate the articulated rig with elapsed time and an optional escape pose. */
  update: (seconds: number, evasion?: CreatureEvasionPose) => void;
}

export type CreatureEvasionVariant = "c-turn" | "roll-dive" | "about-face";

export interface CreatureEvasionPose {
  variant: CreatureEvasionVariant;
  progress: number;
  handedness: -1 | 1;
  verticalDirection: -1 | 1;
}

const BODY = {
  girth: 1.03,
  dorsal: 0.51,
};

const TAIL = {
  count: 10,
  len: 0.47,
  taper: 0.74,
  flat: 0,
  sway: 0.07,
};

const NECK_COUNT = 16;

export function createCreature(
  sharedMaterial?: THREE.MeshStandardMaterial,
): CreatureRig {
  let skinTexture: THREE.CanvasTexture | undefined;
  if (typeof document !== "undefined") {
    const skinCanvas = document.createElement("canvas");
    skinCanvas.width = 128;
    skinCanvas.height = 128;
    const skinContext = skinCanvas.getContext("2d");
    if (skinContext) {
      skinContext.fillStyle = "#65705d";
      skinContext.fillRect(0, 0, 128, 128);
      for (let row = -1; row < 18; row++) {
        for (let column = -1; column < 15; column++) {
          const x = column * 10 + (row % 2) * 5;
          const y = row * 8;
          skinContext.beginPath();
          skinContext.arc(x, y, 6.2, .08, Math.PI - .08);
          skinContext.strokeStyle = `rgba(25,34,25,${.18 + ((row + column + 30) % 4) * .025})`;
          skinContext.lineWidth = 1.2;
          skinContext.stroke();
          skinContext.beginPath();
          skinContext.arc(x, y + .8, 4.8, .16, Math.PI - .16);
          skinContext.strokeStyle = "rgba(130,145,120,.1)";
          skinContext.lineWidth = .7;
          skinContext.stroke();
        }
      }
      for (let fleck = 0; fleck < 190; fleck++) {
        const x = (fleck * 47) % 128;
        const y = (fleck * 83) % 128;
        skinContext.fillStyle = fleck % 3 === 0 ? "rgba(151,160,133,.08)" : "rgba(12,18,13,.08)";
        skinContext.fillRect(x, y, 1, 1);
      }
    }
    skinTexture = new THREE.CanvasTexture(skinCanvas);
    skinTexture.wrapS = skinTexture.wrapT = THREE.RepeatWrapping;
    skinTexture.repeat.set(4.5, 6);
    skinTexture.colorSpace = THREE.SRGBColorSpace;
  }
  const material = sharedMaterial ?? new THREE.MeshStandardMaterial({
    color: 0x3a4235,
    map: skinTexture,
    bumpMap: skinTexture,
    bumpScale: .055,
    roughness: .96,
    metalness: 0,
    flatShading: false,
  });

  const blob = (
    radius: number,
    scaleX: number,
    scaleY: number,
    scaleZ: number,
    widthSegments = 8,
    heightSegments = 5,
  ) => {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(radius, widthSegments, heightSegments),
      material,
    );
    mesh.scale.set(scaleX, scaleY, scaleZ);
    return mesh;
  };

  const group = new THREE.Group();
  group.scale.setScalar(0.92);
  const swimRoot = new THREE.Group();
  group.add(swimRoot);

  // Overlapping body masses produce one continuous shoulder-to-hip profile.
  const girth = BODY.girth;
  const coreBody = blob(1, 1.75, girth, 3.7);
  swimRoot.add(coreBody);

  const shoulder = blob(1, 1.56, girth * 0.96, 1.25);
  shoulder.position.set(0, 0.16, -2.85);
  swimRoot.add(shoulder);

  const hip = blob(1, 1.38, girth * 0.88, 1.35);
  hip.position.set(0, -0.02, 3.05);
  swimRoot.add(hip);

  const dorsal = blob(1, 1.5, girth * 0.74, 3.3);
  dorsal.position.set(0, BODY.dorsal, 0.05);
  swimRoot.add(dorsal);

  // Every neck joint is parented to the previous joint, so the overlapping
  // masses remain connected while the travelling wave moves through them.
  const neckJoints: THREE.Object3D[] = [];
  const neckBase = new THREE.Object3D();
  neckBase.position.set(0, 0.55, -3);
  neckBase.rotation.x = -0.3;
  swimRoot.add(neckBase);

  let parent: THREE.Object3D = neckBase;
  for (let index = 0; index < NECK_COUNT; index++) {
    const progress = index / (NECK_COUNT - 1);
    const joint = new THREE.Object3D();
    joint.position.set(0, 0, -0.5);
    joint.rotation.x = 0.052;
    parent.add(joint);
    joint.add(blob(0.74 - progress * 0.3, 1, 0.84, 1.2, 7, 4));
    neckJoints.push(joint);
    parent = joint;
  }

  // The small ovular head uses a compact snout mass rather than a beak cone.
  const head = new THREE.Object3D();
  head.position.set(0, 0, -0.42);
  parent.add(head);
  head.add(blob(1, 0.62, 0.46, 1.25, 7, 4));
  const snout = blob(1, 0.42, 0.285, 0.78, 6, 4);
  snout.position.set(0, -0.028, -0.98);
  head.add(snout);

  // Tail spacing shrinks with its mass, avoiding gaps toward the tip.
  const tailJoints: THREE.Object3D[] = [];
  const tailBase = new THREE.Object3D();
  tailBase.position.set(0, -0.05, 3.25);
  tailBase.rotation.x = 0.04;
  swimRoot.add(tailBase);

  parent = tailBase;
  for (let index = 0; index < TAIL.count; index++) {
    const progress = index / (TAIL.count - 1);
    const joint = new THREE.Object3D();
    joint.position.set(0, 0, TAIL.len * (1 - progress * 0.38));
    joint.rotation.x = -0.03;
    parent.add(joint);
    joint.add(blob(
      0.88 - TAIL.taper * Math.pow(progress, 1.5),
      0.9 - progress * TAIL.flat,
      1 + progress * (TAIL.flat * 0.8),
      1,
      7,
      4,
    ));
    tailJoints.push(joint);
    parent = joint;
  }

  interface Flipper {
    chain: THREE.Object3D[];
    side: number;
    index: number;
  }

  const flippers: Flipper[] = [];
  const spanWidth = [0.98, 0.9, 0.72];
  const spanThickness = [0.3, 0.21, 0.12];
  const spanLength = [1.05, 0.86, 0.56];

  ([
    [-1, -1.7],
    [1, -1.7],
    [-1, 1.5],
    [1, 1.5],
  ] as const).forEach(([side, z], flipperIndex) => {
    const root = new THREE.Object3D();
    root.position.set(side * 1.3, -0.42, z);
    root.rotation.y = side * (z < 0 ? 0.2 : -0.26);
    swimRoot.add(root);

    const bulge = blob(1, 0.82, 0.74, 0.92, 6, 4);
    bulge.position.set(side * 0.18, 0.02, 0);
    root.add(bulge);

    const chain: THREE.Object3D[] = [];
    let flipperParent: THREE.Object3D = root;
    for (let index = 0; index < 3; index++) {
      const joint = new THREE.Object3D();
      joint.position.set(side * (index === 0 ? 0.95 : 1), 0, 0);
      joint.rotation.y = side * 0.085;
      joint.rotation.x = 0.07;
      flipperParent.add(joint);
      joint.add(blob(
        1,
        spanWidth[index],
        spanThickness[index],
        spanLength[index],
        6,
        4,
      ));
      chain.push(joint);
      flipperParent = joint;
    }
    flippers.push({ chain, side, index: flipperIndex });
  });

  const update = (seconds: number, evasion?: CreatureEvasionPose) => {
    const swimTime = seconds * 1.1;
    const bodyWave = swimTime * .86;
    swimRoot.rotation.z = Math.sin(bodyWave) * .105 + Math.sin(bodyWave * .43 + 1.1) * .035;
    swimRoot.rotation.y = Math.sin(bodyWave * .72 + .35) * .052;
    swimRoot.rotation.x = Math.sin(bodyWave * .51) * .024;
    swimRoot.position.y = Math.sin(bodyWave * 1.16) * .055;
    coreBody.rotation.y = Math.sin(bodyWave - .25) * .034;
    shoulder.rotation.y = Math.sin(bodyWave - .92) * .064;
    shoulder.position.x = Math.sin(bodyWave - .92) * .07;
    hip.rotation.y = Math.sin(bodyWave + .78) * -.072;
    hip.position.x = Math.sin(bodyWave + .78) * -.075;
    dorsal.rotation.z = Math.sin(bodyWave + .18) * .028;

    for (let index = 0; index < neckJoints.length; index++) {
      const phase = swimTime * 1.18 - index * .37;
      neckJoints[index].rotation.y = Math.sin(phase) * (.034 + index * .0052);
      neckJoints[index].rotation.z = Math.sin(phase * .76 + .8) * (.008 + index * .0015);
      neckJoints[index].rotation.x = .052 + Math.sin(phase * .72 + .6) * (.012 + index * .0005);
    }

    for (let index = 0; index < tailJoints.length; index++) {
      const phase = swimTime * 1.22 - index * .44;
      tailJoints[index].rotation.y = Math.sin(phase)
        * (TAIL.sway * .92 + index * TAIL.sway * .27);
      tailJoints[index].rotation.z = Math.sin(phase * .68 + .4) * (.009 + index * .0024);
      tailJoints[index].rotation.x = -.03 + Math.sin(phase * .63) * .012;
    }

    for (const flipper of flippers) {
      for (let index = 0; index < flipper.chain.length; index++) {
        const phase = swimTime * 1.58 + Math.floor(flipper.index / 2) * 1.05 + index * .38;
        flipper.chain[index].rotation.z = flipper.side
          * (-.13 + Math.sin(phase) * (.085 + index * .058));
        flipper.chain[index].rotation.x = .1
          + Math.sin(phase - .72) * (.034 + index * .034);
        flipper.chain[index].rotation.y = flipper.side
          * (.085 + Math.sin(phase - .34) * .018);
      }
    }

    head.rotation.y = Math.sin(swimTime * 1.13) * .07;
    head.rotation.x = Math.sin(swimTime * .73 + .4) * .026;

    if (evasion) {
      const progress = THREE.MathUtils.clamp(evasion.progress, 0, 1);
      const envelope = Math.sin(progress * Math.PI);
      const curlProgress = THREE.MathUtils.smoothstep(progress, 0, .48);
      const curl = Math.sin(curlProgress * Math.PI) * (1 - THREE.MathUtils.smoothstep(progress, .62, 1));
      const headLead = Math.sin(THREE.MathUtils.smoothstep(progress, 0, .34) * Math.PI) * (1 - THREE.MathUtils.smoothstep(progress, .7, 1));
      const rollProgress = THREE.MathUtils.smoothstep(progress, .24, .88);
      const handedness = evasion.handedness;
      const vertical = evasion.verticalDirection;

      if (evasion.variant === "c-turn") {
        // The head initiates the hook, the neck carries it rearward, and the
        // full axial roll happens only after the body has formed its C.
        head.rotation.y += handedness * headLead * .82;
        swimRoot.rotation.y += handedness * curl * .34;
        swimRoot.rotation.z += handedness * rollProgress * Math.PI * 2;
        shoulder.rotation.y += handedness * curl * .28;
        hip.rotation.y += handedness * curl * .22;
        neckJoints.forEach((joint, index) => {
          const travel = THREE.MathUtils.smoothstep(progress - index * .012, .02, .52);
          joint.rotation.y += handedness * Math.sin(travel * Math.PI) * (.07 + index * .015) * envelope;
        });
        tailJoints.forEach((joint, index) => {
          const travel = THREE.MathUtils.smoothstep(progress - index * .018, .12, .7);
          joint.rotation.y += handedness * Math.sin(travel * Math.PI) * (.08 + index * .024) * envelope;
        });
      } else if (evasion.variant === "roll-dive") {
        // A vertical escape banks first, folds through an up/down C, then
        // screws the body around the new line of travel.
        head.rotation.x += vertical * headLead * .68;
        swimRoot.rotation.x += vertical * curl * .31;
        swimRoot.rotation.z += handedness * rollProgress * Math.PI * 2;
        neckJoints.forEach((joint, index) => {
          const travel = THREE.MathUtils.smoothstep(progress - index * .014, .02, .55);
          joint.rotation.x += vertical * Math.sin(travel * Math.PI) * (.05 + index * .012) * envelope;
          joint.rotation.z += handedness * envelope * (.012 + index * .004);
        });
        tailJoints.forEach((joint, index) => {
          const travel = THREE.MathUtils.smoothstep(progress - index * .018, .1, .72);
          joint.rotation.x += vertical * Math.sin(travel * Math.PI) * (.055 + index * .017) * envelope;
        });
      } else {
        // The about-face is the most dramatic planar turn: a deep head-led C
        // that straightens only after the animal is pointed directly away.
        head.rotation.y += handedness * headLead * 1.02;
        swimRoot.rotation.y += handedness * curl * .52;
        swimRoot.rotation.z += handedness * Math.sin(progress * Math.PI) * .34;
        neckJoints.forEach((joint, index) => {
          const travel = THREE.MathUtils.smoothstep(progress - index * .011, 0, .5);
          joint.rotation.y += handedness * Math.sin(travel * Math.PI) * (.085 + index * .019) * envelope;
        });
        tailJoints.forEach((joint, index) => {
          const travel = THREE.MathUtils.smoothstep(progress - index * .02, .08, .76);
          joint.rotation.y += handedness * Math.sin(travel * Math.PI) * (.1 + index * .027) * envelope;
        });
      }

      // All three escapes tuck and then reopen the flippers, preventing the
      // ordinary leisurely stroke from fighting the high-level manoeuvre.
      for (const flipper of flippers) {
        flipper.chain.forEach((joint, index) => {
          joint.rotation.z += flipper.side * envelope * (.2 + index * .09);
          joint.rotation.x -= envelope * (.08 + index * .035);
        });
      }
    }
  };

  return { group, head, material, update };
}
