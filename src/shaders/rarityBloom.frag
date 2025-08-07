uniform float uTime;
uniform float uRarityIntensity; // 0.0 = common, 1.0 = legendary
uniform vec3 uRarityColor;
uniform float uBloomStrength;
uniform vec2 uResolution;

varying vec2 vUv;
varying vec3 vPosition;
varying vec3 vNormal;

// Casino-quality bloom calculation
vec3 calculateBloom(vec2 uv, float intensity, vec3 color) {
  vec3 bloom = vec3(0.0);
  
  // Multi-sample bloom for professional quality
  float samples = 12.0;
  float radius = 0.01 * intensity;
  
  for(float i = 0.0; i < samples; i++) {
    float angle = (i / samples) * 6.28318; // 2 * PI
    vec2 offset = vec2(cos(angle), sin(angle)) * radius;
    
    // Sample surrounding pixels
    float falloff = 1.0 - (length(offset) / radius);
    bloom += color * falloff * intensity * 0.1;
  }
  
  return bloom;
}

// Pulsing effect based on rarity
float getPulseIntensity(float time, float rarity) {
  float baseFreq = 2.0;
  float pulseFreq = baseFreq + (rarity * 4.0); // Faster pulse for higher rarity
  
  return 0.5 + 0.5 * sin(time * pulseFreq);
}

// Professional glow gradient
vec3 createGlow(vec2 center, vec2 uv, vec3 color, float intensity, float size) {
  float dist = length(uv - center);
  float glow = exp(-dist * (10.0 / size)) * intensity;
  
  return color * glow;
}

void main() {
  vec2 center = vec2(0.5, 0.5);
  
  // Base color
  vec3 baseColor = uRarityColor;
  
  // Pulsing intensity based on time and rarity
  float pulseIntensity = getPulseIntensity(uTime, uRarityIntensity);
  
  // Calculate bloom effect
  vec3 bloom = calculateBloom(vUv, uRarityIntensity * pulseIntensity, uRarityColor);
  
  // Add central glow
  vec3 centralGlow = createGlow(center, vUv, uRarityColor, uRarityIntensity * 0.8, 0.5);
  
  // Outer rim glow for legendary items
  vec3 rimGlow = vec3(0.0);
  if(uRarityIntensity > 0.8) { // Legendary level
    float rim = 1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0)));
    rimGlow = uRarityColor * rim * rim * pulseIntensity * 0.5;
  }
  
  // Combine all effects
  vec3 finalColor = baseColor + bloom + centralGlow + rimGlow;
  
  // Tone mapping for professional look
  finalColor = finalColor / (finalColor + 1.0);
  
  // Gamma correction
  finalColor = pow(finalColor, vec3(1.0/2.2));
  
  gl_FragColor = vec4(finalColor, 1.0);
} 