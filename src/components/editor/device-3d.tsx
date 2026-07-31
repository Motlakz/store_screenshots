"use client";
import * as React from "react";
import * as THREE from "three";
import { frameColorById, resolveFrame } from "@/lib/frames";
import { img } from "@/lib/image-cache";
import type { Device, Orientation, SlideFrame } from "@/lib/types";

type Props = {
  frame: SlideFrame | undefined;
  device: Device;
  orientation: Orientation;
  src: string;
  enable3D?: boolean;
  hideEmpty?: boolean;
  fallbackBody?: string;
  fallbackEdge?: string;
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
    return { width: 7.51, height: 16.26, depth: 0.92, corner: 0.9, screenInset: 0.17 };
  }
  if (device === "iphone") {
    return { width: 7.25, height: 14.76, depth: 0.82, corner: 0.82, screenInset: 0.2 };
  }
  const landscape = orientation === "landscape";
  return landscape
    ? { width: 16, height: 10, depth: 0.62, corner: 0.58, screenInset: 0.26 }
    : { width: 10, height: 14, depth: 0.62, corner: 0.58, screenInset: 0.26 };
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

    const shellShape = roundedRect(metrics.width, metrics.height, metrics.corner);
    const shellGeometry = new THREE.ExtrudeGeometry(shellShape, {
      depth: metrics.depth,
      bevelEnabled: true,
      bevelSegments: 6,
      steps: 1,
      bevelSize: Math.min(0.14, metrics.corner * 0.22),
      bevelThickness: Math.min(0.14, metrics.depth * 0.24),
      curveSegments: 32,
    });
    shellGeometry.translate(-metrics.width / 2, -metrics.height / 2, -metrics.depth / 2);
    const shellMaterial = new THREE.MeshPhysicalMaterial({
      color: body,
      metalness: 0.82,
      roughness: 0.27,
      clearcoat: 0.72,
      clearcoatRoughness: 0.2,
    });
    const shell = new THREE.Mesh(shellGeometry, shellMaterial);
    group.add(shell);

    const innerW = metrics.width - metrics.screenInset * 2;
    const innerH = metrics.height - metrics.screenInset * 2;
    const screenGeometry = normalizedShapeGeometry(innerW, innerH, Math.max(0.48, metrics.corner - metrics.screenInset));
    const screenUvs = screenGeometry.attributes.uv;
    for (let i = 0; i < screenUvs.count; i += 1) {
      screenUvs.setY(i, SCREEN_BOTTOM_CROP + screenUvs.getY(i) * (1 - SCREEN_BOTTOM_CROP));
    }
    screenUvs.needsUpdate = true;
    const screenMaterial = new THREE.MeshBasicMaterial({
      color: screenSrc ? 0xffffff : 0x101014,
      toneMapped: false,
    });
    const screen = new THREE.Mesh(screenGeometry, screenMaterial);
    screen.position.z = metrics.depth / 2 + 0.16;
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
    rim.position.z = metrics.depth / 2 + 0.08;
    group.add(rim);
    // Draw order places the screen over the full rim plane, leaving only its narrow border visible.
    rim.renderOrder = 1;
    screen.renderOrder = 2;

    if (device === "android") {
      // Honor-style centered capsule cutout, kept brand-neutral.
      const cutoutGeometry = normalizedShapeGeometry(1.28, 0.38, 0.19);
      const cutout = new THREE.Mesh(cutoutGeometry, new THREE.MeshBasicMaterial({ color: 0x060608 }));
      cutout.position.set(0, innerH / 2 - 0.43, metrics.depth / 2 + 0.19);
      cutout.renderOrder = 3;
      group.add(cutout);

      const keyMaterial = new THREE.MeshPhysicalMaterial({
        color: body,
        metalness: 0.9,
        roughness: 0.22,
      });
      const power = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.45, 0.3), keyMaterial);
      power.position.set(metrics.width / 2 + 0.14, 1.15, 0.03);
      group.add(power);
      const volume = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.95, 0.3), keyMaterial);
      volume.position.set(metrics.width / 2 + 0.14, 3.12, 0.03);
      group.add(volume);
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
  }, [body, device, edge, enable3D, f.style, orientation, screenSrc]);

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
