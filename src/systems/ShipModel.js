import * as THREE from 'three';

/**
 * Generates a procedural 3D spaceship model using Three.js primitives.
 * @returns {THREE.Group} The assembled 3D spaceship model.
 */
export function generateProceduralShip() {
  const shipGroup = new THREE.Group();

  const hullMaterial = new THREE.MeshStandardMaterial({
    color: 0xcccccc,
    metalness: 0.3,
    roughness: 0.4
  });
  const engineMaterial = new THREE.MeshStandardMaterial({
    color: 0x444444,
    metalness: 0.8,
    roughness: 0.2
  });
  const glassMaterial = new THREE.MeshStandardMaterial({
    color: 0x111122,
    metalness: 0.9,
    roughness: 0.1
  });
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0x00ffff
  });

  // Tapered fuselage along Z. Wider end is at +Z (rear), narrow tip at -Z (front).
  const fuselageGeo = new THREE.CylinderGeometry(0.2, 1.2, 6, 8);
  fuselageGeo.rotateX(Math.PI / 2);
  const fuselage = new THREE.Mesh(fuselageGeo, hullMaterial);
  shipGroup.add(fuselage);

  const wingGeo = new THREE.BoxGeometry(5, 0.2, 1.5);
  const wings = new THREE.Mesh(wingGeo, hullMaterial);
  wings.position.set(0, -0.2, 1.5);
  shipGroup.add(wings);

  const cockpitGeo = new THREE.CapsuleGeometry(0.5, 1, 4, 8);
  cockpitGeo.rotateX(Math.PI / 2);
  const cockpit = new THREE.Mesh(cockpitGeo, glassMaterial);
  cockpit.position.set(0, 0.8, -0.5);
  shipGroup.add(cockpit);

  const thrusterGeo = new THREE.CylinderGeometry(0.8, 0.6, 1.5, 8);
  thrusterGeo.rotateX(Math.PI / 2);
  const thruster = new THREE.Mesh(thrusterGeo, engineMaterial);
  thruster.position.set(0, 0, 3.5);
  shipGroup.add(thruster);

  const glowGeo = new THREE.CylinderGeometry(0.6, 0.1, 0.5, 16);
  glowGeo.rotateX(Math.PI / 2);
  const glow = new THREE.Mesh(glowGeo, glowMaterial);
  glow.position.set(0, 0, 4.2);
  shipGroup.add(glow);

  shipGroup.scale.set(0.5, 0.5, 0.5);
  return shipGroup;
}

// Walk the group and dispose its geometries and materials.
export function disposeShip(group) {
  group.traverse(obj => {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
      if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
      else obj.material.dispose();
    }
  });
}
