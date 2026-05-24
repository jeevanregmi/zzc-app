# 3D Model Assets — Constitution Tree

## Target: constitution-banyan.glb

Size budget: 5–10 MB
Format: GLB (binary glTF 2.0)

### Required named anchors (empty meshes or bones in Blender):
- `rights_branch`          — upper-left thick branch
- `directive_branch`       — mid-left
- `federalism_branch`      — crown center
- `executive_branch`       — mid-right
- `legislature_branch`     — upper-right
- `judiciary_branch`       — top-right
- `constitutional_bodies`  — mid canopy
- `citizenship_roots`      — lower-right roots
- `local_governance_roots` — lower-left roots

### Optimization checklist:
- Draco compression enabled (gltfpack or glTF-Transform)
- Merge materials where possible (bark, leaves, roots)
- LOD: single mesh OK for web, mobile target < 50k triangles
- Textures: max 1024×1024, KTX2/basis compressed preferred

### Sources for base model:
1. Sketchfab → search "banyan tree low poly" (CC license)
2. Poly Pizza → free CC0 tree assets
3. Generate with Luma AI / CSM (meshy.ai) and retopologize
4. Hand-model in Blender: trunk cylinder → subdivision → branch array modifier

### Loading pipeline (Phase 3):
```
npm install @react-three/fiber @react-three/drei three
```

Loader pattern:
```tsx
import { useGLTF } from "@react-three/drei";
const { nodes, materials } = useGLTF("/models/constitution-banyan.glb");
```

Anchor extraction:
```tsx
const rightsBranch = nodes["rights_branch"]; // Empty/Bone
const pos = new THREE.Vector3();
rightsBranch.getWorldPosition(pos);
// Project to 2D screen → position HTML label
```

### Fallback:
Current canvas tree (procedural 2D) is the fallback when GLB not present.
Check: `if (glbExists) { render3D } else { renderCanvas }`
