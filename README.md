# csv-converter
Herramienta para leer archivos de datos en formato CSV y convertirlos a varios formatos de salida XML y JSON.

```javascript
const xmlDoc = new DOMParser().parseFromString(xml, 'text/xml');
const s = new XMLSerializer();
console.log(s.serializeToString(xmlDoc));
```