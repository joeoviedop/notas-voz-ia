# Fixtures de Audio para Testing

Este directorio contiene archivos de ejemplo para probar la aplicación:

## Archivos de audio de muestra

Para probar completamente la aplicación, necesitarás algunos archivos de audio. Puedes usar:

1. **reunion-equipo.mp3** - Audio de reunión de trabajo (2-3 minutos)
2. **ideas-producto.wav** - Audio con ideas creativas (1-2 minutos)  
3. **notas-personales.m4a** - Audio con notas rápidas (30-60 segundos)

### Generar archivos de prueba

Puedes generar archivos de audio de prueba con:

```bash
# Con ffmpeg (si está instalado)
ffmpeg -f lavfi -i testsrc2 -f lavfi -i sine=frequency=1000:duration=10 -t 10 -pix_fmt yuv420p sample.mp4

# O simplemente grabar audios cortos con cualquier app de grabación
```

### Formatos soportados

- MP3
- WAV
- M4A
- OGG
- FLAC

### Tamaño máximo

- 25MB por archivo
- Duración recomendada: 1-5 minutos para testing

## Mock Data

El mock server incluye datos de ejemplo:

- Usuario de prueba: `test@example.com` / `password123`
- 3 notas predefinidas con diferentes estados
- Simulación de procesamiento con delays realistas