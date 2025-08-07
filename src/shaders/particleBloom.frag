uniform float uTime;

varying vec3 vColor;
varying float vOpacity;

void main() {
  // Create circular particle shape
  vec2 center = vec2(0.5, 0.5);
  float dist = length(gl_PointCoord - center);
  
  // Soft circular falloff
  float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
  
  // Add bloom effect
  float bloom = exp(-dist * 4.0) * 0.5;
  
  // Pulsing effect
  float pulse = 0.8 + 0.2 * sin(uTime * 3.0);
  
  vec3 finalColor = vColor * (1.0 + bloom) * pulse;
  float finalAlpha = alpha * vOpacity;
  
  gl_FragColor = vec4(finalColor, finalAlpha);
} 