attribute float aSize;
attribute vec3 aColor;
attribute float aOpacity;

uniform float uTime;
uniform float uPixelRatio;

varying vec3 vColor;
varying float vOpacity;

void main() {
  vColor = aColor;
  vOpacity = aOpacity;
  
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  
  // Size attenuation for realistic depth
  gl_PointSize = aSize * uPixelRatio * (300.0 / -mvPosition.z);
  
  gl_Position = projectionMatrix * mvPosition;
} 