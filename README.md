
# Supermercados sin Gluten - Escáner de Productos 👋

¡Bienvenido al proyecto! Esta aplicación está diseñada para ayudar a las personas con intolerancia al gluten a identificar productos aptos mediante el escaneo de códigos de barras. Actualmente estamos en una etapa inicial de desarrollo.

---

## Estado Actual 🛠️

### Funcionalidades Implementadas

1. **Escáner de Códigos de Barras**:
   - Utiliza la cámara del dispositivo para escanear productos.
   - Detecta códigos de barras de diferentes formatos como `QR`, `EAN-13` y `UPC-A`.

2. **Visualización de Información**:
   - Muestra:
     - Nombre del producto.
     - Marca.
     - Imagen (si está disponible).
     - Indicador de si el producto es libre de gluten.

3. **Control de Estado**:
   - Indicadores de carga mientras se busca el producto.
   - Muestra mensajes de error si no se encuentra información.

4. **Cámara Dinámica**:
   - Alterna entre cámaras frontal y trasera para mayor flexibilidad.

⚠️ **Limitación actual**: Los productos escaneados no se guardan en una base de datos. Esta funcionalidad será implementada próximamente.

---

## Cómo Empezar 🚀

Sigue estos pasos para configurar y ejecutar el proyecto localmente:

1. **Clonar el Repositorio**

   ```bash
   git clone https://github.com/tu-repo/sin-gluten-scanner.git
   cd sin-gluten-scanner
   ```

2. **Instalar las Dependencias**

   Asegúrate de tener instalado [Node.js](https://nodejs.org/) y luego ejecuta:

   ```bash
   npm install
   ```

3. **Iniciar la Aplicación**

   ```bash
   npx expo start
   ```

   Podrás interactuar con la aplicación mediante:
   - Un dispositivo físico con la aplicación [Expo Go](https://expo.dev/go).
   - Un emulador Android o simulador iOS.
   - Un navegador web (con algunas limitaciones).

---

## Estructura del Proyecto 📁

El proyecto está organizado en carpetas para facilitar la escalabilidad:

```plaintext
src/
├── components/        # Componentes reutilizables (e.g., ParallaxScrollView)
├── hooks/             # Hooks personalizados (e.g., useFetchProduct)
├── screens/           # Pantallas principales (HomeScreen, TabTwoScreen)
├── assets/            # Recursos estáticos como imágenes
├── styles/            # Archivos de estilos compartidos
```

- **Pantallas Clave**:
  - `HomeScreen`: Página inicial con diseño dinámico.
  - `TabTwoScreen`: Pantalla principal del escáner de productos.
- **Hooks Clave**:
  - `useFetchProduct`: Consulta la información de productos mediante un código de barras.
- **Estilos**:
  - Diseños creados con `StyleSheet` para React Native.

---

## Próximos Pasos 🚧

El proyecto crecerá en las próximas iteraciones. Aquí están los objetivos inmediatos:

1. **Guardado en Base de Datos**:
   - Permitir a los usuarios guardar productos escaneados en una base de datos local o en la nube.

2. **Filtros Avanzados**:
   - Mejorar la interfaz para buscar productos por marcas, categorías, etc.

3. **Compatibilidad Extendida**:
   - Ampliar el soporte para más formatos de códigos de barras y etiquetas nutricionales.

4. **Historial de Escaneos**:
   - Implementar una vista de historial para consultar productos previamente escaneados.

---

## Uso de la Aplicación

### Escaneo de Productos

1. **Permitir Acceso a la Cámara**:
   Al iniciar, la aplicación solicitará acceso a la cámara. Acepta la solicitud para continuar.

2. **Escanear un Código de Barras**:
   - Coloca el código dentro del área marcada en la cámara.
   - La aplicación detectará automáticamente el producto.

3. **Visualizar Resultados**:
   - Si el producto es encontrado, se mostrará su información.
   - Si no, recibirás un mensaje de error.

4. **Cerrar Producto**:
   - Puedes cerrar el producto actual para escanear otro.

---

## Recursos Utilizados 🛠️

### Tecnologías y Librerías

- **Expo**: Framework para desarrollar aplicaciones con React Native.
- **React Native**: Desarrollo nativo multiplataforma.
- **CameraView (expo-camera)**: Control avanzado de la cámara.
- **API de Productos**: Integración para obtener datos de productos (por ejemplo, Open Food Facts).

---

## Recursos para Desarrolladores 📚

Para aprender más sobre las tecnologías usadas, consulta estos enlaces:

- [Expo Documentation](https://docs.expo.dev/): Aprende sobre Expo y sus herramientas.
- [React Native Documentation](https://reactnative.dev/): Guía completa sobre React Native.
- [Open Food Facts API](https://world.openfoodfacts.org/data): Documentación de la API utilizada para obtener datos de productos.

---

## Cómo Contribuir 🤝

¡Nos encantaría tu ayuda para mejorar este proyecto!

- Abre un issue en nuestro [repositorio de GitHub](https://github.com/tu-repo/sin-gluten-scanner/issues).
- Envía un pull request con mejoras o correcciones.

---

## Comunidad y Soporte 💬

Conéctate con la comunidad para resolver dudas o compartir ideas:

- [Foros de Expo](https://forums.expo.dev/)
- [Discord de Expo](https://chat.expo.dev/)
- [React Native en Stack Overflow](https://stackoverflow.com/questions/tagged/react-native)

---

## Licencia 📜

Este proyecto está licenciado bajo la [MIT License](https://opensource.org/licenses/MIT).
