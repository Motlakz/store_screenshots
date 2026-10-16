"use client";
import * as React from "react";
import * as THREE from "three";
import { frameColorById, resolveFrame } from "@/lib/frames";
import { img } from "@/lib/image-cache";
import type { Device, Orientation, ScreenCrop, SlideFrame } from "@/lib/types";

type Props = {
  frame: SlideFrame | undefined;
  device: Device;
  orientation: Orientation;
  src: string;
  enable3D?: boolean;
  hideEmpty?: boolean;
  fallbackBody?: string;
  fallbackEdge?: string;
  crop?: ScreenCrop;
  children: React.ReactNode;
};

type ModelMetrics = {
  width: number;
  height: number;
  depth: number;
  corner: number;
  screenInset: number;
};

// Uniform breathing room for the complete projected model, including the
// raised side keys and bevel. Increasing this downsizes every axis equally.
const CAMERA_FIT_MARGIN = 0.575;
const SCREEN_BOTTOM_CROP = 0.055;

function modelMetrics(device: Device, orientation: Orientation): ModelMetrics {
  if (device === "android") {
    // 75.1 × 162.6 × 8.4 mm, softened into an equal-depth curved flagship body.
    return { width: 7.51, height: 16.26, depth: 0.9, corner: 1.02, screenInset: 0.15 };
  }
  if (device === "iphone") {
    return { width: 7.25, height: 14.76, depth: 0.82, corner: 0.74, screenInset: 0.2 };
  }
  if (device === "ipad") {
    return { width: 10.6, height: 14, depth: 0.58, corner: 0.42, screenInset: 0.34 };
  }
  const landscape = orientation === "landscape";
  return landscape
    ? { width: 16, height: 10, depth: 0.66, corner: 0.68, screenInset: 0.27 }
    : { width: 10, height: 16, depth: 0.66, corner: 0.68, screenInset: 0.27 };
}

function roundedRect(width: number, height: number, radius: number): THREE.Shape {
  const r = Math.min(radius, width / 2, height / 2);
  const shape = new THREE.Shape();
  shape.moveTo(r, 0);
  shape.lineTo(width - r, 0);
  shape.quadraticCurveTo(width, 0, width, r);
  shape.lineTo(width, height - r);
  shape.quadraticCurveTo(width, height, width - r, height);
  shape.lineTo(r, height);
  shape.quadraticCurveTo(0, height, 0, height - r);
  shape.lineTo(0, r);
  shape.quadraticCurveTo(0, 0, r, 0);
  return shape;
}

function normalizedShapeGeometry(width: number, height: number, radius: number) {
  const geometry = new THREE.ShapeGeometry(roundedRect(width, height, radius), 32);
  geometry.translate(-width / 2, -height / 2, 0);
  const positions = geometry.attributes.position;
  const uvs = geometry.attributes.uv;
  for (let i = 0; i < positions.count; i += 1) {
    uvs.setXY(i, positions.getX(i) / width + 0.5, positions.getY(i) / height + 0.5);
  }
  uvs.needsUpdate = true;
  return geometry;
}

function solidColor(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  return /^#[0-9a-f]{3,8}$/i.test(value.trim()) ? value.trim() : fallback;
}

/**
 * A real Three.js scene for 3D mode. The Android proportions and soft,
 * equal-depth curved glass are inspired by current Honor/Huawei flagships,
 * without copying a branded device mesh.
 */
export function Device3D({
  frame,
  device,
  orientation,
  src,
  enable3D = true,
  hideEmpty,
  fallbackBody,
  fallbackEdge,
  crop,
  children,
}: Props) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const applyViewRef = React.useRef<(() => void) | null>(null);
  const [webglFailed, setWebglFailed] = React.useState(false);
  const f = resolveFrame(frame);
  const finish = frameColorById(f.color);
  const body = solidColor(finish?.body ?? fallbackBody, "#2A2A2E");
  const edge = solidColor(finish?.edge ?? fallbackEdge, "#111114");
  const screenSrc = img(src);
  const viewRef = React.useRef({
    rotateX: f.rotateX,
    rotateY: f.rotateY,
    depth: f.depth,
    thickness: f.thickness,
  });
  viewRef.current = {
    rotateX: f.rotateX,
    rotateY: f.rotateY,
    depth: f.depth,
    thickness: f.thickness,
  };

  React.useEffect(() => {
    if (f.style !== "3d" || !enable3D || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const host = canvas.parentElement;
    if (!host) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        preserveDrawingBuffer: true,
        premultipliedAlpha: false,
      });
      setWebglFailed(false);
    } catch {
      // Browsers cap concurrent WebGL contexts. A flat frame is a safe visual
      // fallback instead of taking down the editor when that cap is reached.
      setWebglFailed(true);
      return;
    }
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 200);
    const group = new THREE.Group();
    scene.add(group);

    const metrics = modelMetrics(device, orientation);
    const isIphone = device === "iphone";
    const isAndroidPhone = device === "android";
    const isIos = isIphone || device === "ipad";

    const shellShape = roundedRect(metrics.width, metrics.height, metrics.corner);
    const bevelThickness = isIos
      ? Math.min(0.075, metrics.depth * 0.14)
      : Math.min(0.16, metrics.depth * 0.26);
    const shellGeometry = new THREE.ExtrudeGeometry(shellShape, {
      depth: metrics.depth,
      bevelEnabled: true,
      // Apple hardware gets flatter machined rails; Android keeps a softer,
      // glass-forward curve so their silhouettes remain distinct when tilted.
      bevelSegments: isIos ? 3 : 8,
      steps: 1,
      bevelSize: isIos
        ? Math.min(0.075, metrics.corner * 0.14)
        : Math.min(0.18, metrics.corner * 0.24),
      bevelThickness,
      curveSegments: 32,
    });
    // The bevel pushes the shell's flat front out to depth/2 + bevelThickness.
    // Android's thicker bevel put that face exactly on the screen plane, so the
    // two z-fought and the dark body bled through as stripes and dim patches
    // that changed with every tilt. Lift the screen stack clear of the face;
    // iOS already sits above it, so its lift is zero.
    const frontLift = Math.max(0, metrics.depth / 2 + bevelThickness + 0.04 - (metrics.depth / 2 + 0.16));
    shellGeometry.translate(-metrics.width / 2, -metrics.height / 2, -metrics.depth / 2);
    const shellMaterial = new THREE.MeshPhysicalMaterial({
      color: body,
      metalness: isIos ? 0.94 : 0.62,
      roughness: isIos ? 0.32 : 0.2,
      clearcoat: isIos ? 0.38 : 0.95,
      clearcoatRoughness: isIos ? 0.3 : 0.12,
    });
    const shell = new THREE.Mesh(shellGeometry, shellMaterial);
    group.add(shell);

    const innerW = metrics.width - metrics.screenInset * 2;
    const innerH = metrics.height - metrics.screenInset * 2;
    const screenGeometry = normalizedShapeGeometry(innerW, innerH, Math.max(0.48, metrics.corner - metrics.screenInset));
    const screenUvs = screenGeometry.attributes.uv;
    const clampCrop = (value: number | undefined) => THREE.MathUtils.clamp(value ?? 0, 0, 0.45);
    const cropTop = clampCrop(crop?.top);
    const cropRight = clampCrop(crop?.right);
    const cropBottom = crop ? clampCrop(crop.bottom) : SCREEN_BOTTOM_CROP;
    const cropLeft = clampCrop(crop?.left);
    const visibleU = Math.max(0.1, 1 - cropLeft - cropRight);
    const visibleV = Math.max(0.1, 1 - cropTop - cropBottom);
    for (let i = 0; i < screenUvs.count; i += 1) {
      screenUvs.setXY(
        i,
        cropLeft + screenUvs.getX(i) * visibleU,
        cropBottom + screenUvs.getY(i) * visibleV,
      );
    }
    screenUvs.needsUpdate = true;
    const screenMaterial = new THREE.MeshBasicMaterial({
      color: screenSrc ? 0xffffff : 0x101014,
      toneMapped: false,
    });
    const screen = new THREE.Mesh(screenGeometry, screenMaterial);
    screen.position.z = metrics.depth / 2 + 0.16 + frontLift;
    group.add(screen);

    // A very slim glossy rim makes the curved glass legible without a chunky bezel.
    const rimGeometry = normalizedShapeGeometry(metrics.width - 0.1, metrics.height - 0.1, metrics.corner - 0.04);
    const rimMaterial = new THREE.MeshPhysicalMaterial({
      color: edge,
      metalness: 0.55,
      roughness: 0.18,
      transparent: true,
      opacity: 0.94,
      side: THREE.DoubleSide,
    });
    const rim = new THREE.Mesh(rimGeometry, rimMaterial);
    rim.position.z = metrics.depth / 2 + 0.08 + frontLift;
    group.add(rim);
    // Draw order places the screen over the full rim plane, leaving only its narrow border visible.
    rim.renderOrder = 1;
    screen.renderOrder = 2;

    const keyMaterial = new THREE.MeshPhysicalMaterial({
      color: body,
      metalness: isIos ? 0.96 : 0.78,
      roughness: isIos ? 0.3 : 0.2,
      clearcoat: isIos ? 0.28 : 0.78,
    });
    const addSideKey = (side: -1 | 1, y: number, height: number, keyDepth = 0.3) => {
      const key = new THREE.Mesh(new THREE.BoxGeometry(0.15, height, keyDepth), keyMaterial);
      key.position.set(side * (metrics.width / 2 + 0.105), y, 0);
      group.add(key);
    };

    if (isIphone) {
      // Dynamic Island plus asymmetric controls make iOS recognizable even
      // in a near-front store render.
      const islandGeometry = normalizedShapeGeometry(1.62, 0.46, 0.23);
      const island = new THREE.Mesh(islandGeometry, new THREE.MeshBasicMaterial({ color: 0x030304 }));
      island.position.set(0, innerH / 2 - 0.48, metrics.depth / 2 + 0.195 + frontLift);
      island.renderOrder = 3;
      group.add(island);

      addSideKey(1, 1.55, 1.75, 0.32);
      addSideKey(-1, 3.78, 0.56);
      addSideKey(-1, 2.72, 0.82);
      addSideKey(-1, 1.62, 0.82);
    } else if (isAndroidPhone) {
      // Android uses a circular punch-hole and both controls on the right.
      const lensRing = new THREE.Mesh(
        new THREE.RingGeometry(0.115, 0.175, 32),
        new THREE.MeshBasicMaterial({ color: 0x24242a, side: THREE.DoubleSide }),
      );
      lensRing.position.set(0, innerH / 2 - 0.37, metrics.depth / 2 + 0.198 + frontLift);
      lensRing.renderOrder = 3;
      group.add(lensRing);
      const lens = new THREE.Mesh(
        new THREE.CircleGeometry(0.112, 32),
        new THREE.MeshBasicMaterial({ color: 0x030305 }),
      );
      lens.position.copy(lensRing.position);
      lens.position.z += 0.002;
      lens.renderOrder = 4;
      group.add(lens);

      addSideKey(1, 0.72, 1.34, 0.32);
      addSideKey(1, 2.72, 1.92, 0.32);
    } else {
      // Tablet identity comes from the flatter iPad rails versus the taller,
      // softer Android body; both retain a quiet front camera.
      const cameraDot = new THREE.Mesh(
        new THREE.CircleGeometry(isIos ? 0.07 : 0.105, 24),
        new THREE.MeshBasicMaterial({ color: 0x050507 }),
      );
      cameraDot.position.set(0, innerH / 2 - 0.2, metrics.depth / 2 + 0.195 + frontLift);
      cameraDot.renderOrder = 3;
      group.add(cameraDot);

      addSideKey(1, metrics.height * 0.2, isIos ? 1.15 : 1.5, 0.28);
    }

    group.rotation.order = "XYZ";

    scene.add(new THREE.HemisphereLight(0xffffff, 0x171721, 2.15));
    const key = new THREE.DirectionalLight(0xffffff, 4.6);
    key.position.set(-8, 12, 18);
    scene.add(key);
    const fill = new THREE.DirectionalLight(new THREE.Color(body), 2.2);
    fill.position.set(10, -5, 10);
    scene.add(fill);
    const edgeLight = new THREE.DirectionalLight(0x9ecbff, 2.6);
    edgeLight.position.set(8, 8, -10);
    scene.add(edgeLight);

    let disposed = false;
    let texture: THREE.Texture | null = null;
    const render = () => {
      if (!disposed) renderer.render(scene, camera);
    };

    const applyView = () => {
      if (disposed) return;
      const view = viewRef.current;
      const depthScale = THREE.MathUtils.mapLinear(view.thickness, 12, 72, 0.62, 1.75);
      group.scale.z = depthScale;
      group.rotation.x = THREE.MathUtils.degToRad(view.rotateX);
      group.rotation.y = THREE.MathUtils.degToRad(view.rotateY);

      // Lens depth changes perspective. Device rotation does not move the
      // camera, so Turn/Tilt read as rotation instead of an auto-fit zoom.
      camera.fov = THREE.MathUtils.clamp(
        THREE.MathUtils.mapLinear(view.depth, 800, 4000, 44, 21),
        21,
        44,
      );
      const physicalDepth = metrics.depth * depthScale;
      const fittedHeight = metrics.height + physicalDepth * 0.22;
      const fittedWidth = metrics.width + physicalDepth * 0.22;
      const vertical = fittedHeight * CAMERA_FIT_MARGIN / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      const horizontalFov = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect);
      const horizontal = fittedWidth * CAMERA_FIT_MARGIN / Math.tan(horizontalFov / 2);
      camera.position.set(0, 0, Math.max(vertical, horizontal));
      camera.updateProjectionMatrix();
      camera.lookAt(0, 0, 0);
      render();
    };
    applyViewRef.current = applyView;

    if (screenSrc) {
      new THREE.TextureLoader().load(
        screenSrc,
        (loaded) => {
          if (disposed) {
            loaded.dispose();
            return;
          }
          texture = loaded;
          loaded.colorSpace = THREE.SRGBColorSpace;
          loaded.anisotropy = renderer.capabilities.getMaxAnisotropy();
          // Store screenshots contain small type; mipmaps make it look washed
          // out in a near-front product render. Sample the original upload.
          loaded.generateMipmaps = false;
          loaded.minFilter = THREE.LinearFilter;
          loaded.magFilter = THREE.LinearFilter;
          screenMaterial.map = loaded;
          screenMaterial.color.set(0xffffff);
          screenMaterial.needsUpdate = true;

          render();
        },
        undefined,
        () => render(),
      );
    }

    const resize = () => {
      const width = Math.max(1, host.clientWidth);
      const height = Math.max(1, host.clientHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 3));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      applyView();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();

    return () => {
      disposed = true;
      if (applyViewRef.current === applyView) applyViewRef.current = null;
      observer.disconnect();
      texture?.dispose();
      scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh) && !(object instanceof THREE.LineSegments)) return;
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => material.dispose());
      });
      renderer.dispose();
    };
  }, [body, crop?.bottom, crop?.left, crop?.right, crop?.top, device, edge, enable3D, f.style, orientation, screenSrc]);

  React.useEffect(() => {
    applyViewRef.current?.();
  }, [f.depth, f.rotateX, f.rotateY, f.thickness]);

  if (f.style !== "3d" || !enable3D || webglFailed) {
    return <div style={{ position: "relative", width: "100%", height: "100%" }}>{children}</div>;
  }

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", overflow: "visible" }}>
      <canvas
        ref={canvasRef}
        aria-label="Three-dimensional device preview"
        style={{
          display: "block",
          width: "100%",
          height: "100%",
        }}
      />
      {!screenSrc && !hideEmpty ? (
        <div
          style={{
            position: "absolute",
            inset: "38% 14% auto",
            color: "rgba(255,255,255,0.5)",
            fontSize: 14,
            textAlign: "center",
            pointerEvents: "none",
          }}
        >
          Drop a screenshot here
        </div>
      ) : null}
    </div>
  );
}
